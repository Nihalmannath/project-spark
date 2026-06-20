"""Rebuild notebook 03 and publish notebook 04's calibrated Mysuru transfer."""
from __future__ import annotations

import argparse
import copy
import json
import random
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from sklearn.cluster import KMeans
from sklearn.metrics import accuracy_score, f1_score, precision_recall_fscore_support

from notebook_model import (
    CLASS_KEYS,
    CLASS_TO_ID,
    NOTEBOOK_FEATURES,
    NOTEBOOK_MODEL_VERSION,
    NOTEBOOK_SCHEMA_VERSION,
    checkpoint_sha256,
    feature_indexes,
    new_model,
)
from osm_features import fixed_percentile_rows, percentile_matrix
from osm_model import (
    apply_abstention,
    class_weights,
    expected_calibration_error,
    fit_ood_detector,
    fit_temperature,
    focal_loss,
    full_edge_index,
    induced_graph,
    normalized_entropy,
    ood_scores,
    select_abstention_threshold,
    softmax_probabilities,
)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
THESIS_OUTPUTS = ROOT.parents[1] / "data visualisation" / "outputs"
MODELS = Path(__file__).resolve().parent / "models"
MODELS.mkdir(exist_ok=True)
CHECKPOINT_PATH = MODELS / "notebook04_graphsage_v2.pt"
META_PATH = MODELS / "notebook04_graphsage_v2_meta.json"
EVALUATION_PATH = MODELS / "notebook04_graphsage_v2_evaluation.json"
HISTORICAL_MACRO_F1 = 0.292
MINIMUM_COVERAGE = 0.60
ENTROPY_QUANTILE = 0.995


def seed_everything(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)


def load_graph(city):
    graph = json.loads((DATA / f"{city}_graph.json").read_text())
    feature_indexes(graph)
    return graph


def raw_features(graph):
    indexes = feature_indexes(graph)
    return np.asarray(graph["model_features_raw"], dtype=np.float32)[:, indexes]


def spatial_zones(graph, labeled, seed):
    wards = np.asarray(graph["ward"], dtype=object)
    lonlat = np.asarray(graph["lonlat"], dtype=float)
    names = sorted({str(wards[index]) for index in labeled})
    centroids = np.asarray([
        lonlat[[index for index in labeled if str(wards[index]) == ward]].mean(axis=0)
        for ward in names
    ])
    mapping = dict(zip(
        names,
        KMeans(n_clusters=5, n_init=20, random_state=seed).fit_predict(centroids),
    ))
    return np.asarray([mapping.get(str(ward), -1) for ward in wards], dtype=int)


def validation_wards(wards, candidates, fold):
    names = sorted({str(wards[index]) for index in candidates})
    return {ward for offset, ward in enumerate(names) if (offset + fold) % 5 == 0}


def scaled(features, indexes, mean, std):
    return torch.tensor((features[indexes] - mean) / std, dtype=torch.float32)


def evaluate(model, features, labels, edges, indexes, mean, std):
    model.eval()
    with torch.no_grad():
        logits = model(scaled(features, indexes, mean, std), induced_graph(edges, indexes))
    return logits.cpu().numpy(), labels[indexes]


def train_fold(features, labels, edges, train, validation, test, seed, max_epochs, patience):
    seed_everything(seed)
    mean = features[train].mean(axis=0)
    std = features[train].std(axis=0)
    std[std < 1e-6] = 1.0
    x = scaled(features, train, mean, std)
    y = torch.tensor(labels[train], dtype=torch.long)
    edge_index = induced_graph(edges, train)
    weights = class_weights(labels[train])
    model = new_model()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)
    best_state, best_score, best_epoch, stale = None, -1.0, 0, 0
    for epoch in range(1, max_epochs + 1):
        model.train()
        optimizer.zero_grad()
        focal_loss(model(x, edge_index), y, weights).backward()
        optimizer.step()
        logits, val_y = evaluate(model, features, labels, edges, validation, mean, std)
        score = f1_score(
            val_y, logits.argmax(axis=1), labels=range(4), average="macro", zero_division=0
        )
        if score > best_score + 1e-4:
            best_state = copy.deepcopy(model.state_dict())
            best_score, best_epoch, stale = score, epoch, 0
        else:
            stale += 1
        if stale >= patience and epoch >= 30:
            break
    model.load_state_dict(best_state)
    logits, test_y = evaluate(model, features, labels, edges, test, mean, std)
    return logits, test_y, best_epoch, best_score


def train_final(features, labels, edges, indexes, epochs, seed):
    seed_everything(seed)
    mean = features[indexes].mean(axis=0)
    std = features[indexes].std(axis=0)
    std[std < 1e-6] = 1.0
    x = scaled(features, indexes, mean, std)
    y = torch.tensor(labels[indexes], dtype=torch.long)
    edge_index = induced_graph(edges, indexes)
    weights = class_weights(labels[indexes])
    model = new_model()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)
    for _ in range(max(int(epochs), 30)):
        model.train()
        optimizer.zero_grad()
        focal_loss(model(x, edge_index), y, weights).backward()
        optimizer.step()
    model.eval()
    return model, mean.astype(np.float32), std.astype(np.float32)


def per_class_metrics(labels, predictions):
    precision, recall, f1, support = precision_recall_fscore_support(
        labels, predictions, labels=range(4), zero_division=0
    )
    return {
        key: {
            "precision": float(precision[index]),
            "recall": float(recall[index]),
            "f1": float(f1[index]),
            "support": int(support[index]),
        }
        for index, key in enumerate(CLASS_KEYS)
    }


def train(seed=23, max_epochs=120, patience=18):
    graph = load_graph("bengaluru")
    features = percentile_matrix(raw_features(graph))
    text_labels = np.asarray(graph["label"], dtype=object)
    labels = np.asarray([CLASS_TO_ID.get(str(label), -1) for label in text_labels], dtype=int)
    labeled = np.flatnonzero(labels >= 0)
    wards = np.asarray(graph["ward"], dtype=object)
    zones = spatial_zones(graph, labeled, seed)
    oof_logits = np.zeros((graph["n"], 4), dtype=np.float32)
    folds, best_epochs = [], []
    for fold in range(5):
        test = labeled[zones[labeled] == fold]
        candidates = labeled[zones[labeled] != fold]
        val_names = validation_wards(wards, candidates, fold)
        validation = np.asarray([i for i in candidates if str(wards[i]) in val_names])
        training = np.asarray([i for i in candidates if str(wards[i]) not in val_names])
        logits, test_y, epoch, validation_f1 = train_fold(
            features, labels, graph["edges"], training, validation, test,
            seed + fold, max_epochs, patience,
        )
        oof_logits[test] = logits
        test_f1 = f1_score(
            test_y, logits.argmax(axis=1), labels=range(4), average="macro", zero_division=0
        )
        folds.append({
            "fold": fold,
            "train_nodes": int(len(training)),
            "validation_nodes": int(len(validation)),
            "test_nodes": int(len(test)),
            "best_epoch": int(epoch),
            "validation_macro_f1": float(validation_f1),
            "test_macro_f1": float(test_f1),
        })
        best_epochs.append(epoch)
        print(f"fold {fold}: test macro-F1={test_f1:.3f}, epoch={epoch}")

    logits = oof_logits[labeled]
    y = labels[labeled]
    temperature = fit_temperature(logits, y)
    probabilities = softmax_probabilities(logits, temperature)
    predictions = probabilities.argmax(axis=1)
    detector = fit_ood_detector(features[labeled])
    source_ood = ood_scores(features[labeled], detector["location"], detector["precision"])
    confidence_threshold, _, threshold_f1 = select_abstention_threshold(
        probabilities, y, MINIMUM_COVERAGE
    )
    entropy = normalized_entropy(probabilities)
    entropy_threshold = float(np.quantile(entropy, ENTROPY_QUANTILE))
    accepted = (
        (probabilities.max(axis=1) >= confidence_threshold)
        & (entropy <= entropy_threshold)
        & (source_ood <= detector["threshold"])
    )
    class_metrics = per_class_metrics(y, predictions)
    macro_f1 = float(f1_score(y, predictions, labels=range(4), average="macro", zero_division=0))
    promotion_checks = {
        "historical_macro_f1": macro_f1 >= HISTORICAL_MACRO_F1,
        "all_classes_predicted": len(set(predictions.tolist())) == 4,
        "minimum_selective_coverage": float(accepted.mean()) >= MINIMUM_COVERAGE,
    }
    promoted = all(promotion_checks.values())
    metrics = {
        "spatial_cv_macro_f1": macro_f1,
        "spatial_cv_accuracy": float(accuracy_score(y, predictions)),
        "per_class": class_metrics,
        "temperature": temperature,
        "uncalibrated_ece": expected_calibration_error(softmax_probabilities(logits), y),
        "calibrated_ece": expected_calibration_error(probabilities, y),
        "confidence_threshold": confidence_threshold,
        "entropy_threshold": entropy_threshold,
        "selective_coverage": float(accepted.mean()),
        "selective_macro_f1": float(f1_score(
            y[accepted], predictions[accepted], labels=range(4), average="macro", zero_division=0
        )),
        "threshold_search_macro_f1": float(threshold_f1),
        "historical_macro_f1_gate": HISTORICAL_MACRO_F1,
        "promotion_passed": promoted,
        "promotion_checks": promotion_checks,
        "folds": folds,
    }
    final_epochs = int(np.median(best_epochs))
    model, mean, std = train_final(
        features, labels, graph["edges"], labeled, final_epochs, seed + 100
    )
    checkpoint = {
        "model_version": NOTEBOOK_MODEL_VERSION,
        "schema_version": NOTEBOOK_SCHEMA_VERSION,
        "feature_names": NOTEBOOK_FEATURES,
        "class_keys": CLASS_KEYS,
        "state_dict": model.state_dict(),
        "mean": mean,
        "std": std,
        "temperature": temperature,
        "confidence_threshold": confidence_threshold,
        "entropy_threshold": entropy_threshold,
        "ood_location": detector["location"],
        "ood_precision": detector["precision"],
        "ood_threshold": detector["threshold"],
        "promotion_passed": promoted,
        "metrics": metrics,
        "training": {
            "seed": seed,
            "final_epochs": final_epochs,
            "labeled_nodes": int(len(labeled)),
            "target": "published Bengaluru ward label broadcast to road nodes",
            "split": "five spatial ward-centroid zones; fold-local scaling; split-safe graphs",
            "trained_at": datetime.now(timezone.utc).isoformat(),
        },
    }
    torch.save(checkpoint, CHECKPOINT_PATH)
    digest = checkpoint_sha256(CHECKPOINT_PATH)
    serializable = {
        key: checkpoint[key]
        for key in ("model_version", "schema_version", "feature_names", "class_keys", "promotion_passed", "metrics", "training")
    }
    serializable["checkpoint_sha256"] = digest
    META_PATH.write_text(json.dumps(serializable, indent=2))
    EVALUATION_PATH.write_text(json.dumps({"metrics": metrics, "folds": folds}, indent=2))
    THESIS_OUTPUTS.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(CHECKPOINT_PATH, THESIS_OUTPUTS / "graphsage_foodenv.pt")
    (THESIS_OUTPUTS / "graphsage_foodenv_meta.json").write_text(
        json.dumps(serializable, indent=2)
    )
    print(f"promotion={'PASS' if promoted else 'FAIL'} macro-F1={macro_f1:.3f}")
    return checkpoint, model, digest, serializable


def predict(graph, checkpoint, model, raw=None, sorted_columns=None):
    raw = raw_features(graph) if raw is None else np.asarray(raw, dtype=np.float32)
    if sorted_columns is None:
        features = percentile_matrix(raw)
    else:
        features = fixed_percentile_rows(sorted_columns, raw)
    normalized = (features - checkpoint["mean"]) / checkpoint["std"]
    with torch.no_grad():
        logits = model(
            torch.tensor(normalized, dtype=torch.float32), full_edge_index(graph["edges"])
        ).cpu().numpy()
    probabilities = softmax_probabilities(logits, checkpoint["temperature"])
    ood = ood_scores(features, checkpoint["ood_location"], checkpoint["ood_precision"])
    labels, confidence, entropy, accepted, reasons = apply_abstention(
        probabilities, ood, checkpoint["confidence_threshold"],
        checkpoint["entropy_threshold"], checkpoint["ood_threshold"],
    )
    top = np.asarray([CLASS_KEYS[i] for i in probabilities.argmax(axis=1)], dtype=object)
    return {
        "labels": labels, "top": top, "probabilities": probabilities,
        "confidence": confidence, "entropy": entropy, "ood": ood,
        "accepted": accepted, "reasons": reasons,
    }


def model_flags(label, reasons):
    flags = ["model_projection", "affordability_unavailable"]
    if label in ("mirage", "oasis"):
        flags.append("affordability_inferred_not_observed")
    if label == "swamp":
        flags.append("quality_inferred_not_observed")
    return flags + list(reasons)


def apply_to_artifacts(checkpoint, model, digest, model_meta):
    promoted = bool(checkpoint["promotion_passed"])
    for city in ("bengaluru", "mysuru"):
        graph_path = DATA / f"{city}_graph.json"
        geojson_path = DATA / f"{city}_nodes.geojson"
        meta_path = DATA / f"{city}_meta.json"
        graph = json.loads(graph_path.read_text())
        geojson = json.loads(geojson_path.read_text())
        metadata = json.loads(meta_path.read_text())
        result = predict(graph, checkpoint, model)
        old_model = metadata.get("model")
        if city == "mysuru" and promoted:
            primary = result["labels"].tolist()
            evidence = ["model" if ok else "unknown" for ok in result["accepted"]]
            risks = [model_flags(primary[i], result["reasons"][i]) for i in range(graph["n"])]
        else:
            primary = list(graph["proxy_label"] if city == "mysuru" else graph["label"])
            evidence = list(graph["evidence_level"])
            risks = list(graph["risk_flags"])
        probability_rows = [
            {key: round(float(result["probabilities"][i, j]), 6) for j, key in enumerate(CLASS_KEYS)}
            for i in range(graph["n"])
        ]
        graph.update({
            "label": primary,
            "evidence_level": evidence,
            "risk_flags": risks,
            "model_label": result["labels"].tolist(),
            "model_top_label": result["top"].tolist(),
            "model_probabilities": probability_rows,
            "model_confidence": np.round(result["confidence"], 6).tolist(),
            "model_entropy": np.round(result["entropy"], 6).tolist(),
            "model_ood_score": np.round(result["ood"], 6).tolist(),
            "model_abstained": (~result["accepted"]).tolist(),
            "model_version": NOTEBOOK_MODEL_VERSION,
            "model_promoted": promoted,
            "notebook_feature_names": NOTEBOOK_FEATURES,
        })
        for i, feature in enumerate(geojson["features"]):
            props = feature["properties"]
            props.update({
                "label": primary[i], "evidence_level": evidence[i], "risk_flags": risks[i],
                "model_label": str(result["labels"][i]), "model_top_label": str(result["top"][i]),
                "model_probabilities": probability_rows[i],
                "model_confidence": round(float(result["confidence"][i]), 6),
                "model_entropy": round(float(result["entropy"][i]), 6),
                "model_ood_score": round(float(result["ood"][i]), 6),
                "model_abstained": bool(not result["accepted"][i]),
                "model_version": NOTEBOOK_MODEL_VERSION, "model_promoted": promoted,
            })
        counts = Counter(primary)
        model_counts = Counter(result["labels"].tolist())
        proxy = graph.get("proxy_label", [None] * graph["n"])
        disagreements = sum(
            city == "mysuru" and result["accepted"][i] and proxy[i] is not None
            and result["labels"][i] != proxy[i]
            for i in range(graph["n"])
        )
        metadata.update({
            "label_counts": {key: int(counts.get(key, 0)) for key in [*CLASS_KEYS, "unknown"]},
            "unknown_count": int(counts.get("unknown", 0)),
            "model_label_counts": {key: int(model_counts.get(key, 0)) for key in [*CLASS_KEYS, "unknown"]},
            "model_proxy_disagreement_count": int(disagreements),
            "label_methodology": (
                "Primary Mysuru labels are calibrated notebook-04 eight-feature GraphSAGE projections with confidence, entropy, and OOD abstention. Affordability is unavailable."
                if city == "mysuru" and promoted else metadata["label_methodology"]
            ),
            "training_schema": NOTEBOOK_FEATURES,
            "comparison_model": old_model,
            "model": {
                **model_meta,
                "status": "promoted" if promoted else "evaluation_only",
                "checkpoint_sha256": digest,
                "target_city_ood_rate": float((result["ood"] > checkpoint["ood_threshold"]).mean()),
                "target_city_abstention_rate": float((~result["accepted"]).mean()),
                "source_notebooks": ["03_graphsage_road_nodes.ipynb", "04_transfer_mysore_scenario.ipynb"],
            },
        })
        graph_path.write_text(json.dumps(graph, separators=(",", ":")))
        geojson_path.write_text(json.dumps(geojson, separators=(",", ":")))
        meta_path.write_text(json.dumps(metadata, indent=2))
        print(f"[{city}] primary labels: {dict(counts)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=23)
    parser.add_argument("--max-epochs", type=int, default=120)
    parser.add_argument("--patience", type=int, default=18)
    args = parser.parse_args()
    checkpoint, model, digest, metadata = train(args.seed, args.max_epochs, args.patience)
    apply_to_artifacts(checkpoint, model, digest, metadata)


if __name__ == "__main__":
    main()
