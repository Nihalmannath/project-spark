"""Notebook-04 GraphSAGE baseline metadata and full-graph scenario inference."""
from __future__ import annotations

import json
from collections import Counter
from functools import lru_cache
from pathlib import Path

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pyproj import Transformer
from scipy.spatial import cKDTree

from notebook_model import (
    CLASS_KEYS,
    NOTEBOOK_FEATURES,
    NOTEBOOK_MODEL_VERSION,
    checkpoint_sha256,
    feature_indexes,
    load_checkpoint,
)
from osm_features import fixed_percentile_rows
from osm_model import apply_abstention, full_edge_index, ood_scores, softmax_probabilities

DATA = Path(__file__).resolve().parents[1] / "public" / "data"
MODEL_DIR = Path(__file__).resolve().parent / "models"
CHECKPOINT = MODEL_DIR / "notebook04_graphsage_v2.pt"
MODEL_META = MODEL_DIR / "notebook04_graphsage_v2_meta.json"
_T = Transformer.from_crs(4326, 32643, always_xy=True)

app = FastAPI(title="Notebook 04 Mysuru GraphSAGE Projection Service")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


@lru_cache(maxsize=1)
def load_model_bundle():
    if not CHECKPOINT.exists() or not MODEL_META.exists():
        return None
    metadata = json.loads(MODEL_META.read_text())
    digest = checkpoint_sha256(CHECKPOINT)
    if digest != metadata.get("checkpoint_sha256"):
        raise RuntimeError("notebook GraphSAGE checkpoint hash does not match metadata")
    checkpoint, model = load_checkpoint(CHECKPOINT)
    return checkpoint, model, metadata


@lru_cache(maxsize=4)
def load_city(city):
    path = DATA / f"{city}_graph.json"
    if not path.exists():
        raise HTTPException(404, f"no graph for '{city}'")
    graph = json.loads(path.read_text())
    indexes = feature_indexes(graph)
    raw = np.asarray(graph["model_features_raw"], dtype=np.float32)[:, indexes]
    lonlat = np.asarray(graph["lonlat"], dtype=float)
    xy = np.asarray(_T.transform(lonlat[:, 0], lonlat[:, 1])).T
    return {
        "n": graph["n"], "edges": graph["edges"], "lonlat": lonlat, "xy": xy,
        "tree": cKDTree(xy), "raw": raw,
        "sorted_raw": [np.sort(raw[:, column]) for column in range(raw.shape[1])],
        "label": np.asarray(graph["label"], dtype=object),
        "scenario_label": np.asarray(graph.get("model_label", graph["label"]), dtype=object),
        "probabilities": graph["model_probabilities"],
        "affordability": graph.get("affordability", [None] * graph["n"]),
        "quality": graph.get("quality", [None] * graph["n"]),
        "city": city,
    }


class ScenarioReq(BaseModel):
    hub: list[float]
    radius_m: float = 2000.0
    d_food_800: float = 12.0
    d_food_1500: float = 25.0
    near_floor: float = 0.15
    dens_mult: float = 1.4
    outlet_categories: list[str] = Field(default_factory=list)
    cuisine_categories: list[str] = Field(default_factory=list)


def _model_flags(city, label, reasons):
    flags = ["model_projection"]
    if city == "mysuru":
        flags.append("affordability_unavailable")
    else:
        flags.append("trained_on_bengaluru_ward_targets")
    if label in ("mirage", "oasis"):
        flags.append("affordability_inferred_not_observed")
    if label == "swamp":
        flags.append("quality_inferred_not_observed")
    return flags + list(reasons)


def _predict(city, raw):
    bundle = load_model_bundle()
    if bundle is None:
        raise HTTPException(503, "notebook GraphSAGE checkpoint unavailable")
    checkpoint, model, metadata = bundle
    percentiles = fixed_percentile_rows(city["sorted_raw"], raw)
    normalized = (percentiles - checkpoint["mean"]) / checkpoint["std"]
    with torch.no_grad():
        logits = model(
            torch.tensor(normalized, dtype=torch.float32), full_edge_index(city["edges"])
        ).cpu().numpy()
    probabilities = softmax_probabilities(logits, checkpoint["temperature"])
    ood = ood_scores(percentiles, checkpoint["ood_location"], checkpoint["ood_precision"])
    labels, confidence, entropy, accepted, reasons = apply_abstention(
        probabilities, ood, checkpoint["confidence_threshold"],
        checkpoint["entropy_threshold"], checkpoint["ood_threshold"],
    )
    return checkpoint, metadata, labels, probabilities, confidence, entropy, ood, accepted, reasons


def _transitions(changes):
    counts = Counter((row["before"], row["after"]) for row in changes)
    return [
        {"from": before, "to": after, "count": count}
        for (before, after), count in counts.most_common()
    ]


@app.get("/api/health")
def health():
    bundle = load_model_bundle()
    return {
        "ok": True,
        "method": "calibrated notebook-04 eight-feature GraphSAGE",
        "model_available": bundle is not None,
        "model_promoted": bool(bundle and bundle[0]["promotion_passed"]),
        "cities": sorted(path.stem.replace("_graph", "") for path in DATA.glob("*_graph.json")),
    }


@app.get("/api/meta/{city}")
def meta(city):
    path = DATA / f"{city}_meta.json"
    if not path.exists():
        raise HTTPException(404, f"no meta for '{city}'")
    return json.loads(path.read_text())


@app.post("/api/scenario/{city}")
def scenario(city, request: ScenarioReq):
    data = load_city(city)
    hub_xy = np.asarray(_T.transform(request.hub[0], request.hub[1]))
    affected = np.asarray(data["tree"].query_ball_point(hub_xy, request.radius_m), dtype=int)
    if len(affected) == 0:
        return {
            "affected": 0, "moved_out_of_desert": 0, "spillover": 0,
            "changed": [], "transitions": [], "hub": request.hub,
            "radius_m": request.radius_m, "intervention_evidence": "none",
        }

    raw = data["raw"].copy()
    indexes = {name: index for index, name in enumerate(NOTEBOOK_FEATURES)}
    raw[affected, indexes["food_800m"]] += max(float(request.d_food_800), 0.0)
    raw[affected, indexes["food_1500m"]] += max(float(request.d_food_1500), 0.0)
    raw[affected, indexes["nearest_food_km"]] = np.minimum(
        raw[affected, indexes["nearest_food_km"]], max(float(request.near_floor), 0.05)
    )
    raw[affected, indexes["inter_density_1km"]] *= max(float(request.dens_mult), 0.0)

    checkpoint, metadata, labels, probabilities, confidence, entropy, ood, accepted, reasons = _predict(data, raw)
    affected_set = set(map(int, affected))
    changed_indexes = np.flatnonzero(labels != data["scenario_label"])
    changes = []
    for node in changed_indexes:
        node = int(node)
        after = str(labels[node])
        changes.append({
            "id": node,
            "before": str(data["scenario_label"][node]),
            "after": after,
            "spillover": node not in affected_set,
            "access_pct": round(float(fixed_percentile_rows(
                data["sorted_raw"], raw[node:node + 1]
            )[0, indexes["food_800m"]]), 1),
            "affordability": data["affordability"][node],
            "quality": data["quality"][node],
            "evidence_level": "model" if accepted[node] else "unknown",
            "risk_flags": _model_flags(data["city"], after, reasons[node]),
            "before_probabilities": data["probabilities"][node],
            "after_probabilities": {
                key: round(float(probabilities[node, class_index]), 6)
                for class_index, key in enumerate(CLASS_KEYS)
            },
            "model_confidence": round(float(confidence[node]), 6),
            "model_entropy": round(float(entropy[node]), 6),
            "model_ood_score": round(float(ood[node]), 6),
            "unknown_reasons": reasons[node],
        })
    return {
        "affected": int(len(affected)),
        "moved_out_of_desert": sum(
            row["before"] == "desert" and row["after"] != "desert" for row in changes
        ),
        "spillover": sum(bool(row["spillover"]) for row in changes),
        "changed": changes,
        "transitions": _transitions(changes),
        "hub": request.hub,
        "radius_m": request.radius_m,
        "intervention_evidence": "model",
        "model_version": NOTEBOOK_MODEL_VERSION,
        "model_promotion_passed": bool(checkpoint["promotion_passed"]),
        "checkpoint_sha256": metadata["checkpoint_sha256"],
        "candidate_model_changed_count": len(changes),
        "candidate_model_transitions": _transitions(changes),
        "candidate_model_changes": changes,
    }
