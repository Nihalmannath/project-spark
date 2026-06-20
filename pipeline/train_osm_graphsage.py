"""Train, validate, promote, and apply the matched OSM-only GraphSAGE model."""
from __future__ import annotations

import argparse
import copy
import json
import random
from collections import Counter
from pathlib import Path

import numpy as np
import torch
from sklearn.cluster import KMeans
from sklearn.metrics import accuracy_score, f1_score, precision_recall_fscore_support

from osm_features import MODEL_FEATURES, MODEL_SCHEMA_VERSION, percentile_matrix
from osm_model import (
    CLASS_KEYS,
    CLASS_TO_ID,
    MODEL_VERSION,
    OSMGraphSAGE,
    apply_abstention,
    checkpoint_sha256,
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
MODELS = Path(__file__).resolve().parent / "models"
MODELS.mkdir(exist_ok=True)
CHECKPOINT_PATH = MODELS / "osm_graphsage_v1.pt"
MODEL_META_PATH = MODELS / "osm_graphsage_v1_meta.json"
EVALUATION_PATH = MODELS / "osm_graphsage_v1_evaluation.json"

PROMOTION = {
    "minimum_macro_f1": 0.312,
    "minimum_class_f1": 0.15,
    "maximum_ece": 0.15,
    "minimum_selective_coverage": 0.60,
}
ENTROPY_QUANTILE = 0.995


def seed_everything(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)


def _load_graph(city):
    graph = json.loads((DATA / f"{city}_graph.json").read_text())
    if graph.get("model_feature_names") != MODEL_FEATURES:
        raise ValueError(f"{city} model feature schema is missing or out of date; rerun export_nodes.py")
    return graph


def _spatial_zones(graph, labeled_indexes, seed):
    wards = np.asarray(graph["ward"], dtype=object)
    lonlat = np.asarray(graph["lonlat"], dtype=float)
    valid_wards = sorted({str(wards[index]) for index in labeled_indexes})
    centroids = np.array([
        lonlat[[index for index in labeled_indexes if str(wards[index]) == ward]].mean(axis=0)
        for ward in valid_wards
    ])
    ward_zone = dict(zip(
        valid_wards,
        KMeans(n_clusters=5, n_init=20, random_state=seed).fit_predict(centroids),
    ))
    return np.array([ward_zone.get(str(ward), -1) for ward in wards], dtype=int)


def _validation_wards(wards, candidate_indexes, fold):
    unique = sorted({str(wards[index]) for index in candidate_indexes})
    selected = {ward for offset, ward in enumerate(unique) if (offset + fold) % 5 == 0}
    return selected


def _scaled(features, indexes, mean, std):
    return torch.tensor((features[indexes] - mean) / std, dtype=torch.float32)


def _evaluate(model, features, labels, edges, indexes, mean, std):
    model.eval()
    with torch.no_grad():
        logits = model(_scaled(features, indexes, mean, std), induced_graph(edges, indexes))
    return logits.cpu().numpy(), labels[indexes]


def _train_fold(features, labels, edges, train_indexes, val_indexes, test_indexes,
                seed, max_epochs, patience, swamp_weight):
    seed_everything(seed)
    mean = features[train_indexes].mean(axis=0)
    std = features[train_indexes].std(axis=0)
    std[std < 1e-6] = 1.0
    train_x = _scaled(features, train_indexes, mean, std)
    train_y = torch.tensor(labels[train_indexes], dtype=torch.long)
    train_edges = induced_graph(edges, train_indexes)
    weights = class_weights(labels[train_indexes], swamp_weight)
    model = OSMGraphSAGE()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)
    best_state = None
    best_score = -1.0
    best_epoch = 0
    stale = 0
    for epoch in range(1, max_epochs + 1):
        model.train()
        optimizer.zero_grad()
        logits = model(train_x, train_edges)
        loss = focal_loss(logits, train_y, weights)
        loss.backward()
        optimizer.step()

        val_logits, val_labels = _evaluate(
            model, features, labels, edges, val_indexes, mean, std
        )
        score = f1_score(
            val_labels, val_logits.argmax(axis=1), labels=range(len(CLASS_KEYS)),
            average="macro", zero_division=0,
        )
        if score > best_score + 1e-4:
            best_score = score
            best_epoch = epoch
            best_state = copy.deepcopy(model.state_dict())
            stale = 0
        else:
            stale += 1
        if stale >= patience and epoch >= 30:
            break
    model.load_state_dict(best_state)
    test_logits, test_labels = _evaluate(
        model, features, labels, edges, test_indexes, mean, std
    )
    return test_logits, test_labels, best_epoch, best_score


def _train_final(features, labels, edges, indexes, epochs, seed, swamp_weight):
    seed_everything(seed)
    mean = features[indexes].mean(axis=0)
    std = features[indexes].std(axis=0)
    std[std < 1e-6] = 1.0
    x = _scaled(features, indexes, mean, std)
    y = torch.tensor(labels[indexes], dtype=torch.long)
    edge_index = induced_graph(edges, indexes)
    weights = class_weights(labels[indexes], swamp_weight)
    model = OSMGraphSAGE()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)
    for _ in range(max(int(epochs), 30)):
        model.train()
        optimizer.zero_grad()
        loss = focal_loss(model(x, edge_index), y, weights)
        loss.backward()
        optimizer.step()
    model.eval()
    return model, mean.astype(np.float32), std.astype(np.float32)


def _per_class_metrics(labels, predictions):
    precision, recall, f1, support = precision_recall_fscore_support(
        labels, predictions, labels=range(len(CLASS_KEYS)), zero_division=0
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


def _promotion_decision(metrics):
    checks = {
        "macro_f1": metrics["spatial_cv_macro_f1"] >= PROMOTION["minimum_macro_f1"],
        "all_class_f1": min(row["f1"] for row in metrics["per_class"].values())
            >= PROMOTION["minimum_class_f1"],
        "calibration": metrics["calibrated_ece"] <= PROMOTION["maximum_ece"],
        "coverage": metrics["selective_coverage"] >= PROMOTION["minimum_selective_coverage"],
    }
    return all(checks.values()), checks


def train(seed=17, max_epochs=140, patience=18, swamp_weight=1.0):
    graph = _load_graph("bengaluru")
    raw = np.asarray(graph["model_features_raw"], dtype=np.float32)
    features = percentile_matrix(raw)
    labels_text = np.asarray(graph["label"], dtype=object)
    labels = np.array([CLASS_TO_ID.get(str(label), -1) for label in labels_text], dtype=int)
    labeled = np.where(labels >= 0)[0]
    wards = np.asarray(graph["ward"], dtype=object)
    zones = _spatial_zones(graph, labeled, seed)

    oof_logits = np.zeros((len(graph["label"]), len(CLASS_KEYS)), dtype=np.float32)
    fold_rows = []
    best_epochs = []
    for fold in range(5):
        test_indexes = labeled[zones[labeled] == fold]
        candidates = labeled[zones[labeled] != fold]
        val_wards = _validation_wards(wards, candidates, fold)
        val_indexes = np.array([index for index in candidates if str(wards[index]) in val_wards])
        train_indexes = np.array([index for index in candidates if str(wards[index]) not in val_wards])
        logits, fold_labels, best_epoch, val_score = _train_fold(
            features, labels, graph["edges"], train_indexes, val_indexes, test_indexes,
            seed + fold, max_epochs, patience, swamp_weight,
        )
        oof_logits[test_indexes] = logits
        prediction = logits.argmax(axis=1)
        fold_f1 = f1_score(
            fold_labels, prediction, labels=range(len(CLASS_KEYS)),
            average="macro", zero_division=0,
        )
        fold_rows.append({
            "fold": fold,
            "train_nodes": int(len(train_indexes)),
            "validation_nodes": int(len(val_indexes)),
            "test_nodes": int(len(test_indexes)),
            "best_epoch": int(best_epoch),
            "validation_macro_f1": float(val_score),
            "test_macro_f1": float(fold_f1),
        })
        best_epochs.append(best_epoch)
        print(f"fold {fold}: test macro-F1={fold_f1:.3f}, epoch={best_epoch}")

    labeled_logits = oof_logits[labeled]
    labeled_y = labels[labeled]
    temperature = fit_temperature(labeled_logits, labeled_y)
    probabilities = softmax_probabilities(labeled_logits, temperature)
    predictions = probabilities.argmax(axis=1)
    detector = fit_ood_detector(features[labeled])
    source_ood = ood_scores(
        features[labeled], detector["location"], detector["precision"]
    )
    confidence_threshold, _, selective_f1 = select_abstention_threshold(
        probabilities, labeled_y, 0.62
    )
    entropy = normalized_entropy(probabilities)
    entropy_threshold = float(np.quantile(entropy, ENTROPY_QUANTILE))
    accepted = (
        (probabilities.max(axis=1) >= confidence_threshold)
        & (entropy <= entropy_threshold)
        & (source_ood <= detector["threshold"])
    )
    selective_coverage = float(accepted.mean())
    metrics = {
        "spatial_cv_macro_f1": float(f1_score(
            labeled_y, predictions, labels=range(len(CLASS_KEYS)),
            average="macro", zero_division=0,
        )),
        "spatial_cv_accuracy": float(accuracy_score(labeled_y, predictions)),
        "per_class": _per_class_metrics(labeled_y, predictions),
        "temperature": temperature,
        "uncalibrated_ece": expected_calibration_error(
            softmax_probabilities(labeled_logits, 1.0), labeled_y
        ),
        "calibrated_ece": expected_calibration_error(probabilities, labeled_y),
        "confidence_threshold": confidence_threshold,
        "entropy_threshold": entropy_threshold,
        "entropy_quantile": ENTROPY_QUANTILE,
        "selective_coverage": selective_coverage,
        "selective_macro_f1": float(f1_score(
            labeled_y[accepted], predictions[accepted], labels=range(len(CLASS_KEYS)),
            average="macro", zero_division=0,
        )) if accepted.any() else 0.0,
        "threshold_search_macro_f1": float(selective_f1),
        "folds": fold_rows,
    }
    promoted, checks = _promotion_decision(metrics)
    metrics["promotion_passed"] = promoted
    metrics["promotion_checks"] = checks
    metrics["promotion_thresholds"] = PROMOTION

    final_epochs = int(np.median(best_epochs))
    final_model, mean, std = _train_final(
        features, labels, graph["edges"], labeled, final_epochs, seed + 100, swamp_weight
    )
    checkpoint = {
        "model_version": MODEL_VERSION,
        "schema_version": MODEL_SCHEMA_VERSION,
        "feature_names": MODEL_FEATURES,
        "class_keys": CLASS_KEYS,
        "state_dict": final_model.state_dict(),
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
            "swamp_class_weight_multiplier": swamp_weight,
            "final_epochs": final_epochs,
            "labeled_nodes": int(len(labeled)),
            "target": "published Bengaluru ward label broadcast to road nodes",
            "split": "five spatial ward-centroid zones; split-safe induced graphs",
        },
    }
    torch.save(checkpoint, CHECKPOINT_PATH)
    digest = checkpoint_sha256(CHECKPOINT_PATH)
    serializable = {
        "model_version": MODEL_VERSION,
        "schema_version": MODEL_SCHEMA_VERSION,
        "feature_names": MODEL_FEATURES,
        "class_keys": CLASS_KEYS,
        "checkpoint_sha256": digest,
        "promotion_passed": promoted,
        "metrics": metrics,
        "training": checkpoint["training"],
    }
    MODEL_META_PATH.write_text(json.dumps(serializable, indent=2))
    EVALUATION_PATH.write_text(json.dumps({"metrics": metrics, "folds": fold_rows}, indent=2))
    print(f"promotion={'PASS' if promoted else 'FAIL'} macro-F1={metrics['spatial_cv_macro_f1']:.3f}")
    return checkpoint, final_model, digest, serializable


def _predict_city(graph, checkpoint, model):
    raw = np.asarray(graph["model_features_raw"], dtype=np.float32)
    features = percentile_matrix(raw)
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
    top = np.array([CLASS_KEYS[index] for index in probabilities.argmax(axis=1)], dtype=object)
    return {
        "labels": labels,
        "top": top,
        "probabilities": probabilities,
        "confidence": confidence,
        "entropy": entropy,
        "ood": ood,
        "accepted": accepted,
        "reasons": reasons,
    }


def _model_flags(label, reasons):
    flags = ["model_projection", "affordability_unavailable"]
    if label == "mirage":
        flags.append("affordability_inferred_not_observed")
    elif label == "oasis":
        flags.append("affordability_inferred_not_observed")
    elif label == "swamp":
        flags.append("quality_inferred_from_osm")
    elif label == "desert":
        flags.append("low_access_pattern_model")
    return flags + reasons


def apply_to_artifacts(checkpoint, model, digest, model_meta):
    promoted = bool(checkpoint["promotion_passed"])
    for city in ("bengaluru", "mysuru"):
        graph_path = DATA / f"{city}_graph.json"
        geojson_path = DATA / f"{city}_nodes.geojson"
        meta_path = DATA / f"{city}_meta.json"
        graph = json.loads(graph_path.read_text())
        geojson = json.loads(geojson_path.read_text())
        metadata = json.loads(meta_path.read_text())
        prediction = _predict_city(graph, checkpoint, model)
        primary = list(graph["label"])
        evidence = list(graph["evidence_level"])
        risk_flags = list(graph["risk_flags"])
        if city == "mysuru" and promoted:
            primary = prediction["labels"].tolist()
            evidence = ["model" if accepted else "unknown" for accepted in prediction["accepted"]]
            risk_flags = [
                _model_flags(str(primary[index]), prediction["reasons"][index])
                for index in range(graph["n"])
            ]

        probability_rows = [
            {key: round(float(prediction["probabilities"][index, class_index]), 5)
             for class_index, key in enumerate(CLASS_KEYS)}
            for index in range(graph["n"])
        ]
        graph.update({
            "label": primary,
            "evidence_level": evidence,
            "risk_flags": risk_flags,
            "model_label": prediction["labels"].tolist(),
            "model_top_label": prediction["top"].tolist(),
            "model_probabilities": probability_rows,
            "model_confidence": np.round(prediction["confidence"], 5).tolist(),
            "model_entropy": np.round(prediction["entropy"], 5).tolist(),
            "model_ood_score": np.round(prediction["ood"], 5).tolist(),
            "model_abstained": (~prediction["accepted"]).tolist(),
            "model_version": MODEL_VERSION,
            "model_promoted": promoted,
        })
        for index, feature in enumerate(geojson["features"]):
            props = feature["properties"]
            props.update({
                "label": primary[index],
                "evidence_level": evidence[index],
                "risk_flags": risk_flags[index],
                "model_label": str(prediction["labels"][index]),
                "model_top_label": str(prediction["top"][index]),
                "model_probabilities": probability_rows[index],
                "model_confidence": round(float(prediction["confidence"][index]), 5),
                "model_entropy": round(float(prediction["entropy"][index]), 5),
                "model_version": MODEL_VERSION,
                "model_promoted": promoted,
                "model_ood_score": round(float(prediction["ood"][index]), 5),
                "model_abstained": bool(not prediction["accepted"][index]),
            })

        counts = Counter(primary)
        model_counts = Counter(prediction["labels"].tolist())
        proxy = graph.get("proxy_label", [None] * graph["n"])
        disagreements = sum(
            city == "mysuru" and prediction["accepted"][index]
            and proxy[index] is not None and prediction["labels"][index] != proxy[index]
            for index in range(graph["n"])
        )
        metadata.update({
            "label_counts": {key: int(counts.get(key, 0)) for key in [*CLASS_KEYS, "unknown"]},
            "unknown_count": int(counts.get("unknown", 0)),
            "model_label_counts": {key: int(model_counts.get(key, 0)) for key in [*CLASS_KEYS, "unknown"]},
            "proxy_label_counts": {
                key: int(Counter(proxy).get(key, 0)) for key in [*CLASS_KEYS, "unknown"]
            } if city == "mysuru" else None,
            "model_proxy_disagreement_count": int(disagreements),
            "label_methodology": (
                "Primary labels are calibrated OSM-only GraphSAGE projections with uncertainty and domain-shift abstention. "
                "Mirage and oasis are learned classes; Mysuru affordability remains unavailable."
                if city == "mysuru" and promoted else metadata["label_methodology"]
            ),
            "model": {
                **model_meta,
                "status": "promoted" if promoted else "evaluation_only",
                "checkpoint_sha256": digest,
                "target_city_ood_rate": float((prediction["ood"] > checkpoint["ood_threshold"]).mean()),
                "target_city_abstention_rate": float((~prediction["accepted"]).mean()),
            },
        })
        graph_path.write_text(json.dumps(graph, separators=(",", ":")))
        geojson_path.write_text(json.dumps(geojson, separators=(",", ":")))
        meta_path.write_text(json.dumps(metadata, indent=2))
        print(f"[{city}] primary labels: {dict(counts)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=17)
    parser.add_argument("--max-epochs", type=int, default=140)
    parser.add_argument("--patience", type=int, default=18)
    parser.add_argument("--swamp-weight", type=float, default=1.0)
    args = parser.parse_args()
    checkpoint, model, digest, metadata = train(
        args.seed, args.max_epochs, args.patience, args.swamp_weight
    )
    apply_to_artifacts(checkpoint, model, digest, metadata)


if __name__ == "__main__":
    main()
