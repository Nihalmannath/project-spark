"""On-demand OSM extraction + frozen Bengaluru-model inference for ANY location.

Self-contained FastAPI router (mounted by serve.py via include_router) so the
existing serve.py is untouched except one line. Pick a lat/lon + radius, download
that area's OSM road network + food POIs, rebuild the same transferable features,
and apply the frozen notebook-04 GraphSAGE checkpoint — a true transfer.

Endpoints:
  POST /api/extract                  {lat, lon, radius_m} -> {city_id, center, meta, nodes}
  POST /api/extract/scenario/{id}    ScenarioReq          -> ScenarioResult
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import numpy as np
import osmnx as ox
import torch
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from pyproj import Transformer
from scipy.spatial import cKDTree
from scipy.stats import rankdata

from notebook_model import (
    CLASS_KEYS,
    NOTEBOOK_FEATURES,
    NOTEBOOK_MODEL_VERSION,
    load_checkpoint,
)
from osm_features import MODEL_FEATURES, build_model_features, fixed_percentile_rows, highway_rank
from osm_model import apply_abstention, full_edge_index, ood_scores, softmax_probabilities
from scenario_intervention import place_outlets_at_hub

MODEL_DIR = Path(__file__).resolve().parent / "models"
CHECKPOINT = MODEL_DIR / "notebook04_graphsage_v2.pt"
_T = Transformer.from_crs(4326, 32643, always_xy=True)  # UTM 43N

# The 8 notebook features as column positions inside the 25-feature model matrix.
_NB_INDEX = [MODEL_FEATURES.index(name) for name in NOTEBOOK_FEATURES]
_FEAT = {name: index for index, name in enumerate(NOTEBOOK_FEATURES)}

FOOD_TAGS = {
    "shop": ["supermarket", "grocery", "convenience", "greengrocer"],
    "amenity": ["restaurant", "fast_food", "cafe", "marketplace"],
}

router = APIRouter()

_BUNDLE = None  # (checkpoint, model)
_CACHE: dict[str, dict] = {}  # city_id -> extracted graph dict


def _bundle():
    global _BUNDLE
    if _BUNDLE is None:
        if not CHECKPOINT.exists():
            raise HTTPException(503, "notebook GraphSAGE checkpoint unavailable")
        _BUNDLE = load_checkpoint(CHECKPOINT)
    return _BUNDLE


class ExtractReq(BaseModel):
    lat: float
    lon: float
    radius_m: float = 5000.0


class ScenarioReq(BaseModel):
    hub: list[float]
    radius_m: float = 2000.0
    d_food_800: float = 12.0
    d_food_1500: float = 25.0
    near_floor: float = 0.15
    dens_mult: float = 1.4
    grocery_outlets: int | None = Field(default=None, ge=0, le=30)
    restaurant_outlets: int | None = Field(default=None, ge=0, le=30)
    outlet_categories: list[str] = Field(default_factory=list)
    cuisine_categories: list[str] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# OSM download -> (coords, edges, ranks, pois)
# --------------------------------------------------------------------------- #
def _osm_arrays(lat: float, lon: float, radius_m: float):
    ox.settings.use_cache = True
    graph = ox.graph_from_point(
        (lat, lon), dist=radius_m, network_type="drive", simplify=True
    )
    nodes_gdf, edges_gdf = ox.graph_to_gdfs(graph)
    nodes_gdf = nodes_gdf.reset_index()  # columns: osmid, x(lon), y(lat), ...
    index_of = {int(osmid): i for i, osmid in enumerate(nodes_gdf["osmid"].to_numpy())}
    coords = np.c_[
        nodes_gdf["x"].to_numpy(dtype=float), nodes_gdf["y"].to_numpy(dtype=float)
    ]

    edges_gdf = edges_gdf.reset_index()  # columns: u, v, key, highway, geometry, ...
    highways = (
        edges_gdf["highway"] if "highway" in edges_gdf.columns else [None] * len(edges_gdf)
    )
    edges: list[tuple[int, int]] = []
    ranks: list[float] = []
    for u, v, hw in zip(edges_gdf["u"], edges_gdf["v"], highways):
        ui, vi = index_of.get(int(u)), index_of.get(int(v))
        if ui is not None and vi is not None and ui != vi:
            edges.append((ui, vi))
            ranks.append(highway_rank(hw))

    try:
        pois = ox.features_from_point((lat, lon), FOOD_TAGS, dist=radius_m)
        if pois.crs is not None:
            pois = pois.to_crs(4326)
    except Exception:
        import geopandas as gpd

        pois = gpd.GeoDataFrame({"geometry": []}, geometry="geometry", crs=4326)
    return coords, edges, np.asarray(ranks, dtype=float), pois


# --------------------------------------------------------------------------- #
# Frozen-model inference (mirrors serve._predict, 8-feature notebook model)
# --------------------------------------------------------------------------- #
def _predict(city: dict, raw: np.ndarray):
    checkpoint, model = _bundle()
    percentiles = fixed_percentile_rows(city["sorted_raw"], raw)
    normalized = (percentiles - checkpoint["mean"]) / checkpoint["std"]
    with torch.no_grad():
        logits = (
            model(torch.tensor(normalized, dtype=torch.float32), city["edge_index"])
            .cpu()
            .numpy()
        )
    probabilities = softmax_probabilities(logits, checkpoint["temperature"])
    ood = ood_scores(percentiles, checkpoint["ood_location"], checkpoint["ood_precision"])
    labels, confidence, entropy, accepted, reasons = apply_abstention(
        probabilities,
        ood,
        checkpoint["confidence_threshold"],
        checkpoint["entropy_threshold"],
        checkpoint["ood_threshold"],
    )
    return labels, probabilities, confidence, entropy, ood, accepted, reasons, percentiles


def _prob_rows(probabilities: np.ndarray):
    return [
        {key: round(float(probabilities[i, j]), 5) for j, key in enumerate(CLASS_KEYS)}
        for i in range(len(probabilities))
    ]


def _model_flags(label, reasons):
    flags = ["model_projection", "affordability_unavailable"]
    if label in ("mirage", "oasis"):
        flags.append("affordability_inferred_not_observed")
    if label == "swamp":
        flags.append("quality_inferred_from_osm")
    return flags + list(reasons)


# --------------------------------------------------------------------------- #
# POST /api/extract
# --------------------------------------------------------------------------- #
@router.post("/api/extract")
def extract(request: ExtractReq):
    radius = float(min(max(request.radius_m, 800.0), 10000.0))
    try:
        coords, edges, ranks, pois = _osm_arrays(request.lat, request.lon, radius)
    except Exception as exc:  # osmnx geocode/download failures
        raise HTTPException(502, f"OSM download failed: {type(exc).__name__}: {exc}")
    if len(coords) < 8 or not edges:
        raise HTTPException(422, "Not enough road network at this location — try a larger radius.")

    matrix, *_ = build_model_features(coords, edges, ranks, pois)
    raw = matrix[:, _NB_INDEX].astype(np.float32)
    xy = np.asarray(_T.transform(coords[:, 0], coords[:, 1])).T

    city = {
        "n": len(coords),
        "edges": edges,
        "edge_index": full_edge_index(edges),
        "lonlat": coords,
        "xy": xy,
        "tree": cKDTree(xy),
        "raw": raw,
        "full_raw": matrix.astype(np.float32),
        "sorted_raw": [np.sort(raw[:, column]) for column in range(raw.shape[1])],
    }
    labels, probabilities, confidence, entropy, ood, accepted, reasons, percentiles = _predict(city, raw)
    city["label"] = np.asarray(labels, dtype=object)
    city["probabilities"] = _prob_rows(probabilities)

    city_id = f"loc_{round(request.lat, 4)}_{round(request.lon, 4)}_{int(radius)}"
    _CACHE[city_id] = city

    access_pct = rankdata(raw[:, _FEAT["food_800m"]], method="average") / len(raw) * 100.0
    top = [CLASS_KEYS[i] for i in probabilities.argmax(axis=1)]
    features = []
    for i in range(len(coords)):
        label = str(labels[i])
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [round(float(coords[i, 0]), 5), round(float(coords[i, 1]), 5)]},
            "properties": {
                "id": i,
                "label": label,
                "ward": "—",
                "access": round(float(access_pct[i] / 100.0), 2),
                "affordability": None,
                "quality": None,
                "evidence_level": "model" if accepted[i] else "unknown",
                "risk_flags": _model_flags(label, reasons[i]),
                "confidence": round(float(confidence[i]), 3),
                "food_800m": int(raw[i, _FEAT["food_800m"]]),
                "food_1500m": int(raw[i, _FEAT["food_1500m"]]),
                "nearest_food_km": round(float(raw[i, _FEAT["nearest_food_km"]]), 3),
                "road_degree": int(raw[i, _FEAT["road_degree"]]),
                "inter_density_1km": int(raw[i, _FEAT["inter_density_1km"]]),
                "access_pct": round(float(access_pct[i]), 1),
                "model_label": label,
                "model_top_label": str(top[i]),
                "model_probabilities": city["probabilities"][i],
                "model_confidence": round(float(confidence[i]), 5),
                "model_entropy": round(float(entropy[i]), 5),
                "model_ood_score": round(float(ood[i]), 5),
                "model_abstained": bool(not accepted[i]),
                "model_version": NOTEBOOK_MODEL_VERSION,
                "model_promoted": True,
            },
        })

    counts = Counter(str(label) for label in labels)
    meta = {
        "city": city_id,
        "n_nodes": len(coords),
        "n_edges": len(edges),
        "center": [float(coords[:, 0].mean()), float(coords[:, 1].mean())],
        "label_counts": {key: int(counts.get(key, 0)) for key in [*CLASS_KEYS, "unknown"]},
        "unknown_count": int(counts.get("unknown", 0)),
        "feats": NOTEBOOK_FEATURES,
        "source": f"On-demand OSM extraction within {int(radius)} m; frozen Bengaluru GraphSAGE projection.",
        "abstention_rate": round(float((~accepted).mean()), 3),
        "model": {
            "status": "promoted",
            "version": NOTEBOOK_MODEL_VERSION,
            "method": "frozen notebook-04 eight-feature GraphSAGE (transfer projection)",
        },
    }
    return {
        "city_id": city_id,
        "center": [float(coords[:, 0].mean()), float(coords[:, 1].mean())],
        "meta": meta,
        "nodes": {"type": "FeatureCollection", "features": features},
    }


# --------------------------------------------------------------------------- #
# POST /api/extract/scenario/{city_id}  (mirrors serve.scenario)
# --------------------------------------------------------------------------- #
def _transitions(changes):
    counts = Counter((row["before"], row["after"]) for row in changes)
    return [{"from": before, "to": after, "count": count} for (before, after), count in counts.most_common()]


@router.post("/api/extract/scenario/{city_id}")
def extract_scenario(city_id: str, request: ScenarioReq):
    city = _CACHE.get(city_id)
    if city is None:
        raise HTTPException(404, "location not extracted (or server restarted) — re-run extract")

    hub_xy = np.asarray(_T.transform(request.hub[0], request.hub[1]))
    physical = request.grocery_outlets is not None or request.restaurant_outlets is not None
    intervention = None
    proxy_summary = None
    if physical:
        try:
            placed = place_outlets_at_hub(
                city["full_raw"], city["xy"], hub_xy,
                request.grocery_outlets or 0, request.restaurant_outlets or 0,
                request.radius_m,
            )
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        raw = placed["full_raw"][:, _NB_INDEX]
        affected = placed["directly_affected"]
        intervention = placed["intervention"]
        proxy_summary = placed["proxy_summary"]
    else:
        affected = np.asarray(city["tree"].query_ball_point(hub_xy, request.radius_m), dtype=int)
        if len(affected) == 0:
            return {
                "affected": 0, "moved_out_of_desert": 0, "spillover": 0,
                "changed": [], "transitions": [], "hub": request.hub,
                "radius_m": request.radius_m, "intervention_evidence": "none",
            }
        raw = city["raw"].copy()
        raw[affected, _FEAT["food_800m"]] += max(float(request.d_food_800), 0.0)
        raw[affected, _FEAT["food_1500m"]] += max(float(request.d_food_1500), 0.0)
        raw[affected, _FEAT["nearest_food_km"]] = np.minimum(
            raw[affected, _FEAT["nearest_food_km"]], max(float(request.near_floor), 0.05)
        )
        raw[affected, _FEAT["inter_density_1km"]] *= max(float(request.dens_mult), 0.0)

    labels, probabilities, confidence, entropy, ood, accepted, reasons, _pct = _predict(city, raw)
    affected_set = set(map(int, affected))
    changed_indexes = np.flatnonzero(labels != city["label"])
    changes = []
    for node in changed_indexes:
        node = int(node)
        after = str(labels[node])
        changes.append({
            "id": node,
            "before": str(city["label"][node]),
            "after": after,
            "spillover": node not in affected_set,
            "access_pct": round(
                float(fixed_percentile_rows(city["sorted_raw"], raw[node : node + 1])[0, _FEAT["food_800m"]]),
                1,
            ),
            "affordability": None,
            "quality": None,
            "evidence_level": "model" if accepted[node] else "unknown",
            "risk_flags": _model_flags(after, reasons[node]),
            "before_probabilities": city["probabilities"][node],
            "after_probabilities": {
                key: round(float(probabilities[node, j]), 6) for j, key in enumerate(CLASS_KEYS)
            },
            "model_confidence": round(float(confidence[node]), 6),
            "model_entropy": round(float(entropy[node]), 6),
            "model_ood_score": round(float(ood[node]), 6),
            "unknown_reasons": reasons[node],
        })
    return {
        "affected": int(len(affected)),
        "moved_out_of_desert": sum(r["before"] == "desert" and r["after"] != "desert" for r in changes),
        "spillover": sum(bool(r["spillover"]) for r in changes),
        "changed": changes,
        "transitions": _transitions(changes),
        "hub": request.hub,
        "radius_m": request.radius_m,
        "intervention_evidence": "none" if physical and intervention["total_outlets"] == 0 else "model",
        "outlet_intervention": intervention,
        "proxy_summary": proxy_summary,
        "model_version": NOTEBOOK_MODEL_VERSION,
        "model_promotion_passed": True,
        "candidate_model_changed_count": len(changes),
        "candidate_model_transitions": _transitions(changes),
        "candidate_model_changes": changes,
    }
