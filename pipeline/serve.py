"""Baseline metadata and evidence-aware scenario inference service."""
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

from common import (
    FOOD_CATEGORIES,
    access_raw,
    build_adjacency,
    classify_mysuru,
    normalized_entropy as category_entropy,
    proxy_components,
)
from osm_features import MODEL_FEATURES, fixed_percentile_rows
from osm_model import (
    CLASS_KEYS,
    MODEL_VERSION,
    apply_abstention,
    checkpoint_sha256,
    full_edge_index,
    load_checkpoint,
    ood_scores,
    softmax_probabilities,
)

DATA = Path(__file__).resolve().parents[1] / "public" / "data"
MODEL_DIR = Path(__file__).resolve().parent / "models"
CHECKPOINT = MODEL_DIR / "osm_graphsage_v1.pt"
MODEL_META = MODEL_DIR / "osm_graphsage_v1_meta.json"
_T = Transformer.from_crs(4326, 32643, always_xy=True)

app = FastAPI(title="Food-Environment OSM GraphSAGE Projection Service")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


def _array(graph, key, default=None, dtype=object):
    values = graph.get(key)
    if values is None:
        values = [default] * graph["n"]
    return np.asarray(values, dtype=dtype)


@lru_cache(maxsize=1)
def load_model_bundle():
    if not CHECKPOINT.exists() or not MODEL_META.exists():
        return None
    metadata = json.loads(MODEL_META.read_text())
    digest = checkpoint_sha256(CHECKPOINT)
    if digest != metadata.get("checkpoint_sha256"):
        raise RuntimeError("OSM GraphSAGE checkpoint hash does not match metadata")
    checkpoint, model = load_checkpoint(CHECKPOINT)
    return checkpoint, model, metadata


@lru_cache(maxsize=4)
def load_city(city: str):
    path = DATA / f"{city}_graph.json"
    if not path.exists():
        raise HTTPException(404, f"no graph for '{city}' — run export_nodes.py")
    graph = json.loads(path.read_text())
    if graph.get("model_feature_names") != MODEL_FEATURES:
        raise HTTPException(500, f"{city} graph has an incompatible model feature schema")
    lonlat = np.asarray(graph["lonlat"], dtype=float)
    xy = np.asarray(_T.transform(lonlat[:, 0], lonlat[:, 1])).T
    raw = np.asarray(graph["model_features_raw"], dtype=np.float32)
    return {
        "city": city,
        "n": graph["n"],
        "edges": graph["edges"],
        "lonlat": lonlat,
        "xy": xy,
        "tree": cKDTree(xy),
        "raw": raw,
        "sorted_raw": [np.sort(raw[:, column]) for column in range(raw.shape[1])],
        "label": _array(graph, "label", "unknown", object),
        "proxy_label": _array(graph, "proxy_label", "unknown", object),
        "model_label": _array(graph, "model_label", "unknown", object),
        "model_probabilities": graph.get("model_probabilities", []),
        "affordability": _array(graph, "affordability", None, object),
        "quality": _array(graph, "quality", None, object),
        "quality_proxy": _array(graph, "quality_proxy", None, object),
        "proxy_sufficient": _array(graph, "proxy_sufficient", False, bool),
        "support": {
            key: np.asarray(value).copy() for key, value in graph.get("model_support", {}).items()
        },
        "adj": build_adjacency(graph["n"], graph["edges"]),
        "access_base": np.sort(access_raw(
            raw[:, MODEL_FEATURES.index("food_800m")],
            raw[:, MODEL_FEATURES.index("food_1500m")],
            raw[:, MODEL_FEATURES.index("nearest_food_km")],
        )),
    }


def _fixed_access_percentile(sorted_baseline, values):
    left = np.searchsorted(sorted_baseline, values, side="left")
    right = np.searchsorted(sorted_baseline, values, side="right")
    tied = right > left
    ranks = right.astype(float)
    ranks[tied] = (left[tied] + 1 + right[tied]) / 2.0
    return ranks / len(sorted_baseline) * 100.0


def _model_flags(label, reasons):
    flags = ["model_projection", "affordability_unavailable"]
    if label in ("mirage", "oasis"):
        flags.append("affordability_inferred_not_observed")
    elif label == "swamp":
        flags.append("quality_inferred_from_osm")
    elif label == "desert":
        flags.append("low_access_pattern_model")
    return flags + reasons


class ScenarioReq(BaseModel):
    hub: list[float]
    radius_m: float = 2000.0
    d_food_800: float = 12.0
    d_food_1500: float = 25.0
    near_floor: float = 0.15
    dens_mult: float = 1.4
    outlet_categories: list[str] = Field(default_factory=list)
    cuisine_categories: list[str] = Field(default_factory=list)


def _perturb_model_features(city, affected, request):
    raw = city["raw"].copy()
    index = {name: position for position, name in enumerate(MODEL_FEATURES)}
    add_800 = max(float(request.d_food_800), 0.0)
    add_1500 = max(float(request.d_food_1500), 0.0)
    raw[affected, index["food_800m"]] += add_800
    raw[affected, index["food_1500m"]] += add_1500
    raw[affected, index["nearest_food_km"]] = np.minimum(
        raw[affected, index["nearest_food_km"]], max(float(request.near_floor), 0.05)
    )

    categories = [category for category in request.outlet_categories if category in FOOD_CATEGORIES]
    if categories:
        per_category_800 = add_800 / len(categories)
        per_category_1500 = add_1500 / len(categories)
        for category in categories:
            raw[affected, index[f"{category}_800m"]] += per_category_800
            raw[affected, index[f"{category}_1500m"]] += per_category_1500
            raw[affected, index[f"nearest_{category}_km"]] = np.minimum(
                raw[affected, index[f"nearest_{category}_km"]],
                max(float(request.near_floor), 0.05),
            )

        category_counts = np.column_stack([
            raw[affected, index[f"{category}_1500m"]] for category in FOOD_CATEGORIES
        ])
        total = np.maximum(raw[affected, index["food_1500m"]], 1.0)
        raw[affected, index["grocery_share_1500m"]] = category_counts[:, 0] / total * 100.0
        raw[affected, index["fast_food_share_1500m"]] = category_counts[:, 2] / total * 100.0
        raw[affected, index["category_entropy_1500m"]] = np.array([
            category_entropy(row) for row in category_counts
        ])

        base_cuisine = city["support"]["cuisine_count"][affected].astype(float)
        cuisine_added = min(len(set(request.cuisine_categories)), int(add_1500))
        raw[affected, index["cuisine_diversity_1500m"]] = np.minimum(
            (base_cuisine + cuisine_added) / 5.0, 1.0
        ) * 100.0
        detail_count = city["support"]["detail_tag_count"][affected].astype(float)
        raw[affected, index["osm_detail_tag_coverage_1500m"]] = (
            detail_count + add_1500
        ) / total * 100.0
    return raw


def _run_model_scenario(city, affected, request):
    bundle = load_model_bundle()
    if bundle is None:
        return None
    checkpoint, model, metadata = bundle
    raw = _perturb_model_features(city, affected, request)
    percentiles = fixed_percentile_rows(city["sorted_raw"], raw)
    normalized = (percentiles - checkpoint["mean"]) / checkpoint["std"]
    with torch.no_grad():
        logits = model(
            torch.tensor(normalized, dtype=torch.float32), full_edge_index(city["edges"])
        ).cpu().numpy()
    probabilities = softmax_probabilities(logits, checkpoint["temperature"])
    access_pct = _fixed_access_percentile(
        city["access_base"],
        access_raw(
            raw[:, MODEL_FEATURES.index("food_800m")],
            raw[:, MODEL_FEATURES.index("food_1500m")],
            raw[:, MODEL_FEATURES.index("nearest_food_km")],
        ),
    )
    ood = ood_scores(percentiles, checkpoint["ood_location"], checkpoint["ood_precision"])
    labels, confidence, entropy, accepted, reasons = apply_abstention(
        probabilities, ood, checkpoint["confidence_threshold"],
        checkpoint["entropy_threshold"], checkpoint["ood_threshold"],
    )
    before = city["model_label"]
    changed_indexes = np.where(labels != before)[0]
    rows = []
    for node in changed_indexes:
        rows.append({
            "id": int(node),
            "before": str(before[node]),
            "after": str(labels[node]),
            "spillover": int(node) not in set(map(int, affected)),
            "before_probabilities": city["model_probabilities"][node],
            "after_probabilities": {
                key: round(float(probabilities[node, class_index]), 5)
                for class_index, key in enumerate(CLASS_KEYS)
            },
            "model_confidence": round(float(confidence[node]), 5),
            "model_entropy": round(float(entropy[node]), 5),
            "model_ood_score": round(float(ood[node]), 5),
            "access_pct": round(float(access_pct[node]), 1),
            "evidence_level": "model" if accepted[node] else "unknown",
            "risk_flags": _model_flags(str(labels[node]), reasons[node]),
            "affordability": None,
            "quality": None,
        })
    return {
        "labels": labels,
        "probabilities": probabilities,
        "changes": rows,
        "promotion_passed": bool(checkpoint["promotion_passed"]),
        "model_version": MODEL_VERSION,
        "checkpoint_sha256": metadata["checkpoint_sha256"],
    }


def _proxy_fallback(city, affected, request):
    raw = _perturb_model_features(city, affected, request)
    index = {name: position for position, name in enumerate(MODEL_FEATURES)}
    access_values = access_raw(
        raw[affected, index["food_800m"]],
        raw[affected, index["food_1500m"]],
        raw[affected, index["nearest_food_km"]],
    )
    access_pct = _fixed_access_percentile(city["access_base"], access_values)
    primary = city["label"].copy()
    changes = []
    categories = [category for category in request.outlet_categories if category in FOOD_CATEGORIES]
    for offset, node in enumerate(affected):
        node = int(node)
        if categories:
            category_counts = [
                raw[node, MODEL_FEATURES.index(f"{category}_1500m")]
                for category in FOOD_CATEGORIES
            ]
            cuisine = city["support"]["cuisine_count"][node] + len(set(request.cuisine_categories))
            proxy = proxy_components(
                category_counts, cuisine,
                poi_count=raw[node, MODEL_FEATURES.index("food_1500m")],
            )
            quality_proxy = proxy["quality_proxy"]
            sufficient = proxy["sufficient"]
        else:
            stored = city["quality_proxy"][node]
            quality_proxy = None if stored is None else float(stored) * 100.0
            sufficient = bool(city["proxy_sufficient"][node])
        after, evidence, flags = classify_mysuru(
            access_pct[offset], quality_proxy, sufficient
        )
        before = str(primary[node])
        if after == before:
            continue
        primary[node] = after
        changes.append({
            "id": node, "before": before, "after": after, "spillover": False,
            "access_pct": round(float(access_pct[offset]), 1),
            "affordability": None,
            "quality": None if quality_proxy is None else round(quality_proxy / 100.0, 3),
            "evidence_level": evidence, "risk_flags": flags,
        })
    return primary, changes


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
        "method": "OSM-only GraphSAGE with conservative proxy fallback",
        "model_available": bundle is not None,
        "model_promoted": bool(bundle and bundle[0]["promotion_passed"]),
        "cities": sorted(path.stem.replace("_graph", "") for path in DATA.glob("*_graph.json")),
    }


@app.get("/api/meta/{city}")
def meta(city: str):
    path = DATA / f"{city}_meta.json"
    if not path.exists():
        raise HTTPException(404, f"no meta for '{city}'")
    return json.loads(path.read_text())


@app.post("/api/scenario/{city}")
def scenario(city: str, request: ScenarioReq):
    data = load_city(city)
    hub_xy = np.asarray(_T.transform(request.hub[0], request.hub[1]))
    affected = np.asarray(data["tree"].query_ball_point(hub_xy, request.radius_m), dtype=int)
    if len(affected) == 0:
        return {
            "affected": 0, "moved_out_of_desert": 0, "spillover": 0,
            "changed": [], "transitions": [], "hub": request.hub,
            "radius_m": request.radius_m, "intervention_evidence": "none",
        }

    model_result = _run_model_scenario(data, affected, request)
    if model_result and model_result["promotion_passed"]:
        changes = model_result["changes"]
        method = "model"
    else:
        _, changes = _proxy_fallback(data, affected, request)
        method = "proxy_fallback_model_not_promoted"

    candidate_changes = model_result["changes"] if model_result else []
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
        "intervention_evidence": method,
        "model_version": model_result["model_version"] if model_result else None,
        "model_promotion_passed": bool(model_result and model_result["promotion_passed"]),
        "candidate_model_changed_count": len(candidate_changes),
        "candidate_model_transitions": _transitions(candidate_changes),
        "candidate_model_changes": candidate_changes,
    }
