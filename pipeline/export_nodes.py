"""Export matched OSM-only features, proxy evidence, and observed source labels."""
from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

from common import (
    ACCESS_THRESHOLD,
    FOOD_AMENITIES,
    FOOD_CATEGORIES,
    G,
    GROCERY_SHOPS,
    LABEL_KEYS,
    MIN_PROXY_POIS,
    PROXY_VERSION,
    QUALITY_PROXY_THRESHOLD,
    THESIS_TO_KEY,
    access_percentile,
    classify_mysuru,
)
from osm_features import (
    MODEL_FEATURES,
    MODEL_SCHEMA_VERSION,
    build_model_features,
    highway_rank,
)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT.parent / "DATA"
VIZ_OUT = ROOT.parents[1] / "data visualisation" / "outputs"
OUT = ROOT / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def _round(value, digits=5):
    return float(np.round(float(value), digits))


def _nullable_score(value):
    return _round(float(value) / 100.0, 2) if pd.notna(value) else None


def _fetch_food_pois(place):
    import osmnx as ox

    ox.settings.use_cache = True
    tags = {"shop": sorted(GROCERY_SHOPS), "amenity": sorted(FOOD_AMENITIES)}
    pois = ox.features_from_place(place, tags).to_crs(4326)
    return pois[pois.geometry.notna() & ~pois.geometry.is_empty].copy()


def _node_records(coords, matrix, proxy_rows):
    feature_index = {name: index for index, name in enumerate(MODEL_FEATURES)}
    access_pct = access_percentile(
        matrix[:, feature_index["food_800m"]],
        matrix[:, feature_index["food_1500m"]],
        matrix[:, feature_index["nearest_food_km"]],
    )
    records = []
    for index, (lon, lat) in enumerate(coords):
        proxy = proxy_rows[index]
        quality_proxy = proxy["quality_proxy"]
        records.append({
            "id": int(index),
            "lon": _round(lon),
            "lat": _round(lat),
            "food_800m": int(matrix[index, feature_index["food_800m"]]),
            "food_1500m": int(matrix[index, feature_index["food_1500m"]]),
            "nearest_food_km": _round(matrix[index, feature_index["nearest_food_km"]], 3),
            "road_degree": int(matrix[index, feature_index["road_degree"]]),
            "inter_density_1km": int(matrix[index, feature_index["inter_density_1km"]]),
            "access_pct": _round(access_pct[index], 1),
            "quality_proxy": _round(quality_proxy / 100.0, 3) if quality_proxy is not None else None,
            "proxy_poi_count": int(proxy["poi_count"]),
            "proxy_category_diversity_pct": _round(proxy["category_diversity"], 1),
            "proxy_cuisine_diversity_pct": _round(proxy["cuisine_diversity"], 1),
            "proxy_grocery_share_pct": _round(proxy["grocery_share"], 1),
            "proxy_fast_food_share_pct": _round(proxy["fast_food_share"], 1),
            "proxy_category_coverage_pct": _round(proxy["category_coverage"], 1),
            "proxy_category_counts": proxy["category_counts"],
            "proxy_cuisine_count": int(proxy["cuisine_count"]),
            "proxy_sufficient": bool(proxy["sufficient"]),
            "model_label": None,
            "model_top_label": None,
            "model_probabilities": None,
            "model_confidence": None,
            "model_entropy": None,
            "model_version": None,
            "model_ood_score": None,
            "model_abstained": None,
        })
    return records, access_pct


def _observed_flags(label):
    return {
        "desert": ["published_desert_label"],
        "mirage": ["published_mirage_label"],
        "swamp": ["published_swamp_label"],
        "oasis": [],
        "unknown": ["outside_published_label_coverage"],
    }[label]


def _load_bengaluru():
    roads = gpd.read_file(DATA / "boundaries" / "bangalore_road_rank.geojson").to_crs(4326)
    roads["r"] = pd.to_numeric(roads["r"], errors="coerce").fillna(1.0)
    pois = _fetch_food_pois("Bengaluru, Karnataka, India")
    return roads, pois


def _load_mysuru():
    import osmnx as ox

    ox.settings.use_cache = True
    graph = ox.graph_from_place("Mysuru, Karnataka, India", network_type="drive", simplify=True)
    _, edge_gdf = ox.graph_to_gdfs(graph)
    roads = edge_gdf.reset_index().to_crs(4326)[["geometry", "highway"]].copy()
    roads["r"] = roads["highway"].apply(highway_rank)
    pois = _fetch_food_pois("Mysuru, Karnataka, India")
    return roads, pois


def export_bengaluru():
    started = time.time()
    print("[blr] loading matched road + OSM food sources …")
    roads, pois = _load_bengaluru()
    coords, edges, ranks = G.build_graph(roads, "r")
    matrix, proxy_rows, support, coverage, _ = build_model_features(
        coords, edges, ranks, pois
    )
    records, _ = _node_records(coords, matrix, proxy_rows)
    wards = gpd.read_file(VIZ_OUT / "ward_food_environment_labels.geojson").to_crs(4326)
    node_gdf = gpd.GeoDataFrame(
        {"node": np.arange(len(coords))},
        geometry=gpd.points_from_xy(coords[:, 0], coords[:, 1]), crs=4326,
    )
    keep = [
        "ward_name", "label_name", "access_score", "affordability_score",
        "quality_diversity_score", "label_confidence_score",
    ]
    joined = gpd.sjoin(node_gdf, wards[keep + ["geometry"]], how="left", predicate="within")
    joined = joined[~joined.index.duplicated(keep="first")].reindex(range(len(coords)))

    counts = {}
    for index, record in enumerate(records):
        row = joined.loc[index]
        label = THESIS_TO_KEY.get(row["label_name"], "unknown")
        record.update({
            "label": label,
            "proxy_label": None,
            "ward": row["ward_name"] if pd.notna(row["ward_name"]) else "—",
            "access": _nullable_score(row["access_score"]) or 0.0,
            "affordability": _nullable_score(row["affordability_score"]),
            "quality": _nullable_score(row["quality_diversity_score"]),
            "confidence": _round(row["label_confidence_score"], 2)
                if pd.notna(row["label_confidence_score"]) else 0.6,
            "evidence_level": "observed" if label != "unknown" else "unknown",
            "risk_flags": _observed_flags(label),
        })
        counts[label] = counts.get(label, 0) + 1

    extracted_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    _write(
        city="bengaluru", records=records, edges=edges, matrix=matrix, support=support,
        counts=counts, center=[float(coords[:, 0].mean()), float(coords[:, 1].mean())],
        source="BBMP road graph plus matched live/cached OSM food categories; published ward labels.",
        label_methodology="Published Bengaluru ward labels mapped to road nodes; model training target, not road-node ground truth.",
        osm_extraction_timestamp=extracted_at, poi_coverage=coverage,
    )
    print(f"[blr] nodes={len(coords)} edges={len(edges)} POIs={len(pois)} ({time.time()-started:.1f}s)")


def export_mysuru():
    started = time.time()
    print("[mys] loading matched road + OSM food sources …")
    roads, pois = _load_mysuru()
    coords, edges, ranks = G.build_graph(roads, "r")
    matrix, proxy_rows, support, coverage, _ = build_model_features(
        coords, edges, ranks, pois
    )
    records, access_pct = _node_records(coords, matrix, proxy_rows)
    counts = {}
    for index, record in enumerate(records):
        proxy = proxy_rows[index]
        proxy_label, evidence, flags = classify_mysuru(
            access_pct[index], proxy["quality_proxy"], proxy["sufficient"]
        )
        quality_proxy = proxy["quality_proxy"]
        record.update({
            "label": proxy_label,
            "proxy_label": proxy_label,
            "ward": "Mysuru",
            "access": _round(access_pct[index] / 100.0, 2),
            "affordability": None,
            "quality": _round(quality_proxy / 100.0, 2) if quality_proxy is not None else None,
            "confidence": 0.55 if proxy_label == "desert" else (0.45 if proxy_label == "swamp" else 0.25),
            "evidence_level": evidence,
            "risk_flags": flags,
        })
        counts[proxy_label] = counts.get(proxy_label, 0) + 1

    extracted_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    _write(
        city="mysuru", records=records, edges=edges, matrix=matrix, support=support,
        counts=counts, center=[float(coords[:, 0].mean()), float(coords[:, 1].mean())],
        source="Mysuru OSM drive network and matched OSM food categories; no local ground truth.",
        label_methodology=(
            "Pre-model fallback: access percentile below 40 = desert; adequate access plus "
            "OSM quality proxy below 40 = swamp risk; otherwise unknown."
        ),
        osm_extraction_timestamp=extracted_at, poi_coverage=coverage,
    )
    print(f"[mys] nodes={len(coords)} edges={len(edges)} POIs={len(pois)} ({time.time()-started:.1f}s)")


def _write(city, records, edges, matrix, support, counts, center, source,
           label_methodology, osm_extraction_timestamp, poi_coverage):
    normalized_counts = {key: int(counts.get(key, 0)) for key in LABEL_KEYS}
    geojson = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature", "id": record["id"],
            "geometry": {"type": "Point", "coordinates": [record["lon"], record["lat"]]},
            "properties": {
                key: value for key, value in record.items() if key not in ("lon", "lat")
            },
        } for record in records],
    }
    (OUT / f"{city}_nodes.geojson").write_text(json.dumps(geojson, separators=(",", ":")))

    graph_keys = [
        "food_800m", "food_1500m", "nearest_food_km", "inter_density_1km",
        "access_pct", "label", "proxy_label", "affordability", "quality",
        "evidence_level", "risk_flags", "quality_proxy", "proxy_poi_count",
        "proxy_category_counts", "proxy_cuisine_count", "proxy_sufficient",
    ]
    graph = {
        "n": len(records),
        "edges": [[int(left), int(right)] for left, right in edges],
        "lonlat": [[record["lon"], record["lat"]] for record in records],
        "ward": [record["ward"] for record in records],
        "model_feature_names": MODEL_FEATURES,
        "model_features_raw": np.round(matrix, 5).tolist(),
        "model_support": {key: np.asarray(value).tolist() for key, value in support.items()},
        **{key: [record.get(key) for record in records] for key in graph_keys},
    }
    (OUT / f"{city}_graph.json").write_text(json.dumps(graph, separators=(",", ":")))

    metadata = {
        "city": city,
        "n_nodes": len(records),
        "n_edges": len(edges),
        "center": center,
        "label_counts": normalized_counts,
        "unknown_count": normalized_counts["unknown"],
        "feats": MODEL_FEATURES,
        "model_schema_version": MODEL_SCHEMA_VERSION,
        "source": source,
        "label_methodology": label_methodology,
        "proxy_version": PROXY_VERSION if city == "mysuru" else None,
        "osm_extraction_timestamp": osm_extraction_timestamp,
        "poi_coverage": poi_coverage,
        "thresholds": {
            "access_percentile_desert_below": ACCESS_THRESHOLD,
            "quality_proxy_swamp_below": QUALITY_PROXY_THRESHOLD,
            "minimum_nearby_proxy_pois": MIN_PROXY_POIS,
        },
        "model": {"status": "not_trained", "promotion_passed": False},
        "provenance": {
            "pipeline": "pipeline/export_nodes.py",
            "road_network": "OpenStreetMap-compatible ranked road graph",
            "food_pois": "OpenStreetMap matched category extraction",
            "local_ground_truth": city == "bengaluru",
        },
    }
    (OUT / f"{city}_meta.json").write_text(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--city", choices=["bengaluru", "mysuru", "all"], default="all")
    args = parser.parse_args()
    if args.city in ("bengaluru", "all"):
        export_bengaluru()
    if args.city in ("mysuru", "all"):
        export_mysuru()
