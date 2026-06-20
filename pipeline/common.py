"""Shared, deterministic helpers for node export and scenario inference.

Physical access comes from the real road graph and nearby OSM food POIs. The
quality/diversity dimension is an explicitly labelled proxy and affordability
is unavailable. These helpers implement the conservative fallback; the separate
matched GraphSAGE candidate may estimate all four classes but becomes primary
only after passing every promotion gate.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np
from scipy.stats import rankdata

# Reuse the thesis's exact road-graph + feature code.
THESIS_VIZ = Path(__file__).resolve().parents[3] / "data visualisation"
sys.path.insert(0, str(THESIS_VIZ))
import gnn_features as G  # noqa: E402  build_graph, compute_features, FEATS, LABELS

LABEL_KEYS = ["desert", "oasis", "mirage", "swamp", "unknown"]
THESIS_TO_KEY = {
    "food_desert": "desert",
    "food_oasis": "oasis",
    "food_mirage": "mirage",
    "food_swamp": "swamp",
}

ACCESS_THRESHOLD = 40.0
QUALITY_PROXY_THRESHOLD = 40.0
MIN_PROXY_POIS = 5
PROXY_VERSION = "mysuru-osm-quality-v1.0.0"

# High-level categories retained by the OSM extraction.  The order is stable
# because graph JSON stores category counts as arrays.
FOOD_CATEGORIES = ("grocery", "restaurant", "fast_food", "cafe")
GROCERY_SHOPS = {"supermarket", "grocery", "convenience", "greengrocer"}
FOOD_AMENITIES = {"restaurant", "fast_food", "cafe", "marketplace"}


def access_raw(food_800, food_1500, nearest_food_km):
    """Raw OSM food-access composite; higher means better physical access."""
    food_800 = np.asarray(food_800, float)
    food_1500 = np.asarray(food_1500, float)
    nearest_food_km = np.asarray(nearest_food_km, float)
    closeness = 1.0 / np.maximum(nearest_food_km, 0.05)
    return np.log1p(food_800) + 0.5 * np.log1p(food_1500) + 2.0 * np.log1p(closeness)


def access_percentile(food_800, food_1500, nearest_food_km):
    """Average-rank 0..100 within-city percentile (ties get the same value)."""
    raw = access_raw(food_800, food_1500, nearest_food_km)
    if len(raw) == 0:
        return np.array([], dtype=float)
    return rankdata(raw, method="average") / len(raw) * 100.0


def ecdf_average_percentile(sorted_base, values):
    """Score new values against a fixed baseline ECDF with average tie ranks."""
    sorted_base = np.asarray(sorted_base, float)
    values = np.asarray(values, float)
    if len(sorted_base) == 0:
        return np.zeros_like(values)
    left = np.searchsorted(sorted_base, values, side="left")
    right = np.searchsorted(sorted_base, values, side="right")
    # Existing values use their average 1-based rank. Values between observations
    # use the count below them, matching the empirical CDF.
    tied = right > left
    pct = right.astype(float)
    pct[tied] = (left[tied] + 1 + right[tied]) / 2.0
    return pct / len(sorted_base) * 100.0


def normalize_osm_value(value):
    """Return a normalized scalar OSM tag value or None for missing/list tags."""
    if value is None:
        return None
    try:
        if bool(np.isnan(value)):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, (list, tuple, set, np.ndarray)):
        value = next((v for v in value if v is not None), None)
    if value is None:
        return None
    text = str(value).strip().lower().replace("-", "_").replace(" ", "_")
    return text or None


def osm_food_category(tags):
    """Map OSM food tags to the four documented proxy categories."""
    shop = normalize_osm_value(tags.get("shop"))
    amenity = normalize_osm_value(tags.get("amenity"))
    if shop in GROCERY_SHOPS or amenity == "marketplace":
        return "grocery"
    if amenity in ("restaurant", "fast_food", "cafe"):
        return amenity
    return None


def parse_cuisines(value):
    """Normalize common semicolon/comma-separated OSM cuisine values."""
    value = normalize_osm_value(value)
    if not value:
        return set()
    return {
        token.strip("_ ")
        for token in re.split(r"[;,]", value)
        if token.strip("_ ")
    }


def normalized_entropy(counts):
    """0..100 Shannon diversity normalized by the available category count."""
    counts = np.asarray(counts, float)
    counts = counts[counts > 0]
    if len(counts) <= 1:
        return 0.0
    p = counts / counts.sum()
    return float(-(p * np.log(p)).sum() / np.log(len(FOOD_CATEGORIES)) * 100.0)


def proxy_components(category_counts, cuisine_count, poi_count=None):
    """Calculate the documented OSM quality/diversity proxy components.

    The score is a risk-screening proxy, not a nutrition or outlet-quality
    observation. Cuisine diversity saturates at five unique cuisine tags.
    """
    counts = np.asarray(category_counts, float)
    if len(counts) != len(FOOD_CATEGORIES):
        raise ValueError(f"category_counts must have {len(FOOD_CATEGORIES)} values")
    total = float(counts.sum() if poi_count is None else poi_count)
    if total <= 0:
        return {
            "poi_count": 0,
            "category_diversity": 0.0,
            "cuisine_diversity": 0.0,
            "grocery_share": 0.0,
            "fast_food_share": 0.0,
            "category_coverage": 0.0,
            "quality_proxy": None,
            "sufficient": False,
        }
    recognized = float(counts.sum())
    coverage_ratio = recognized / total
    category_coverage = np.count_nonzero(counts) / len(FOOD_CATEGORIES) * 100.0
    grocery_share = counts[0] / total * 100.0
    fast_food_share = counts[2] / total * 100.0
    category_diversity = normalized_entropy(counts)
    cuisine_diversity = min(max(float(cuisine_count), 0.0) / 5.0, 1.0) * 100.0
    sufficient = total >= MIN_PROXY_POIS and coverage_ratio >= 0.8
    quality_proxy = (
        0.25 * category_diversity
        + 0.20 * cuisine_diversity
        + 0.25 * grocery_share
        + 0.20 * (100.0 - fast_food_share)
        + 0.10 * category_coverage
    ) if sufficient else None
    return {
        "poi_count": int(total),
        "category_diversity": category_diversity,
        "cuisine_diversity": cuisine_diversity,
        "grocery_share": grocery_share,
        "fast_food_share": fast_food_share,
        "category_coverage": category_coverage,
        "quality_proxy": quality_proxy,
        "sufficient": sufficient,
    }


def classify_mysuru(access_pct, quality_proxy, proxy_sufficient):
    """Conservative Mysuru label and evidence flags."""
    if float(access_pct) < ACCESS_THRESHOLD:
        return "desert", "proxy", ["low_access", "affordability_unavailable"]
    if proxy_sufficient and quality_proxy is not None and float(quality_proxy) < QUALITY_PROXY_THRESHOLD:
        return "swamp", "proxy", [
            "low_quality_proxy", "quality_is_osm_proxy", "affordability_unavailable"
        ]
    flags = ["affordability_unavailable", "class_indeterminate_without_affordability"]
    if not proxy_sufficient or quality_proxy is None:
        flags.append("insufficient_quality_proxy_evidence")
    else:
        flags.append("quality_is_osm_proxy")
    return "unknown", "unknown", flags


def classify_observed(access_pct, affordability, quality):
    """Four-class rule when access, affordability, and quality are observed."""
    if float(access_pct) < ACCESS_THRESHOLD:
        return "desert"
    if affordability is None or quality is None:
        return "unknown"
    if float(affordability) * 100.0 < 40.0:
        return "mirage"
    if float(quality) * 100.0 < QUALITY_PROXY_THRESHOLD:
        return "swamp"
    return "oasis"


def build_adjacency(n_nodes, edges):
    adj = [[] for _ in range(n_nodes)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    return adj
