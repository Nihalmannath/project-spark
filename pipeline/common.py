"""Shared helpers for the food-environment node export + inference service.

The deterministic quality proxy remains a comparison and fallback layer. Mysuru's
primary published projection is now produced by the separately validated notebook-04
GraphSAGE checkpoint; these helpers do not imitate graph inference.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path
import numpy as np

LABEL_KEYS = ["desert", "oasis", "mirage", "swamp", "unknown"]
FOOD_CATEGORIES = ("grocery", "restaurant", "fast_food", "cafe")
GROCERY_SHOPS = {"supermarket", "grocery", "convenience", "greengrocer"}
FOOD_AMENITIES = {"restaurant", "fast_food", "cafe", "marketplace"}
ACCESS_THRESHOLD = 40.0
QUALITY_PROXY_THRESHOLD = 40.0
MIN_PROXY_POIS = 5
PROXY_VERSION = "mysuru-osm-quality-v1.0.0"
# map thesis label names -> short UI keys used by the React app (labels.ts)
THESIS_TO_KEY = {
    "food_desert": "desert",
    "food_oasis": "oasis",
    "food_mirage": "mirage",
    "food_swamp": "swamp",
}
# severity ladder used for the scenario step-improvement (worst -> best access tier)
LADDER = ["desert", "swamp", "mirage", "oasis"]

THESIS_VIZ = Path(__file__).resolve().parents[3] / "data visualisation"


def load_thesis_features():
    """Import the thesis feature module only when export-time graph generation needs it."""
    if str(THESIS_VIZ) not in sys.path:
        sys.path.insert(0, str(THESIS_VIZ))
    import gnn_features as G  # noqa: E402
    return G


def access_raw(food_800, food_1500, nearest_food_km):
    """Raw OSM food-access composite (higher = better physical access).

    A fixed weighted blend of nearby food counts (log-damped) + closeness to the
    nearest food point. Crucially this has NO internal ranking, so a *local*
    scenario can be re-scored against the FIXED baseline ECDF (notebook 04's rule):
    only the intervened area + its graph spillover move, not the whole-city ranking.
    """
    food_800 = np.asarray(food_800, float)
    food_1500 = np.asarray(food_1500, float)
    nearest_food_km = np.asarray(nearest_food_km, float)
    closeness = 1.0 / np.maximum(nearest_food_km, 0.05)
    return np.log1p(food_800) + 0.5 * np.log1p(food_1500) + 2.0 * np.log1p(closeness)


def access_percentile(food_800, food_1500, nearest_food_km):
    """0..100 within-city percentile of the raw access composite (the baseline ECDF).

    This is the access dimension the scenario intervention actually moves;
    affordability / quality are held from baseline (Mysuru imputes them neutral,
    per the thesis transfer caveat).
    """
    raw = access_raw(food_800, food_1500, nearest_food_km)
    return average_rank(raw) / len(raw) * 100.0


def average_rank(values):
    """Return 1-based average ranks with tie handling, matching scipy.rankdata(..., method="average")."""
    values = np.asarray(values, float)
    order = np.argsort(values, kind="mergesort")
    sorted_values = values[order]
    ranks = np.empty(len(values), float)
    i = 0
    while i < len(sorted_values):
        j = i + 1
        while j < len(sorted_values) and sorted_values[j] == sorted_values[i]:
            j += 1
        avg_rank = (i + 1 + j) / 2.0
        ranks[order[i:j]] = avg_rank
        i = j
    return ranks


def ecdf_average_percentile(sorted_base, values):
    """Score values against a fixed baseline ECDF with average tie ranks."""
    sorted_base = np.asarray(sorted_base, float)
    values = np.asarray(values, float)
    if len(sorted_base) == 0:
        return np.zeros_like(values)
    left = np.searchsorted(sorted_base, values, side="left")
    right = np.searchsorted(sorted_base, values, side="right")
    tied = right > left
    ranks = right.astype(float)
    ranks[tied] = (left[tied] + 1 + right[tied]) / 2.0
    return ranks / len(sorted_base) * 100.0


def normalize_osm_value(value):
    if value is None:
        return None
    try:
        if bool(np.isnan(value)):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, (list, tuple, set, np.ndarray)):
        value = next((item for item in value if item is not None), None)
    if value is None:
        return None
    text = str(value).strip().lower().replace("-", "_").replace(" ", "_")
    return text or None


def osm_food_category(tags):
    shop = normalize_osm_value(tags.get("shop"))
    amenity = normalize_osm_value(tags.get("amenity"))
    if shop in GROCERY_SHOPS or amenity == "marketplace":
        return "grocery"
    if amenity in ("restaurant", "fast_food", "cafe"):
        return amenity
    return None


def parse_cuisines(value):
    value = normalize_osm_value(value)
    if not value:
        return set()
    return {token.strip("_ ") for token in re.split(r"[;,]", value) if token.strip("_ ")}


def normalized_entropy(counts):
    counts = np.asarray(counts, float)
    counts = counts[counts > 0]
    if len(counts) <= 1:
        return 0.0
    probabilities = counts / counts.sum()
    return float(
        -(probabilities * np.log(probabilities)).sum() / np.log(len(FOOD_CATEGORIES)) * 100.0
    )


def proxy_components(category_counts, cuisine_count, poi_count=None):
    counts = np.asarray(category_counts, float)
    if len(counts) != len(FOOD_CATEGORIES):
        raise ValueError(f"category_counts must have {len(FOOD_CATEGORIES)} values")
    total = float(counts.sum() if poi_count is None else poi_count)
    if total <= 0:
        return {
            "poi_count": 0, "category_diversity": 0.0, "cuisine_diversity": 0.0,
            "grocery_share": 0.0, "fast_food_share": 0.0, "category_coverage": 0.0,
            "quality_proxy": None, "sufficient": False,
        }
    recognized = float(counts.sum())
    category_coverage = np.count_nonzero(counts) / len(FOOD_CATEGORIES) * 100.0
    grocery_share = counts[0] / total * 100.0
    fast_food_share = counts[2] / total * 100.0
    category_diversity = normalized_entropy(counts)
    cuisine_diversity = min(max(float(cuisine_count), 0.0) / 5.0, 1.0) * 100.0
    sufficient = total >= MIN_PROXY_POIS and recognized / total >= 0.8
    quality_proxy = (
        0.25 * category_diversity + 0.20 * cuisine_diversity
        + 0.25 * grocery_share + 0.20 * (100.0 - fast_food_share)
        + 0.10 * category_coverage
    ) if sufficient else None
    return {
        "poi_count": int(total), "category_diversity": category_diversity,
        "cuisine_diversity": cuisine_diversity, "grocery_share": grocery_share,
        "fast_food_share": fast_food_share, "category_coverage": category_coverage,
        "quality_proxy": quality_proxy, "sufficient": sufficient,
    }


def classify_mysuru(access_pct, quality_proxy, proxy_sufficient):
    if float(access_pct) < ACCESS_THRESHOLD:
        return "desert", "proxy", ["low_access", "affordability_unavailable"]
    if proxy_sufficient and quality_proxy is not None and float(quality_proxy) < QUALITY_PROXY_THRESHOLD:
        return "swamp", "proxy", [
            "low_quality_proxy", "quality_is_osm_proxy", "affordability_unavailable"
        ]
    flags = ["affordability_unavailable", "class_indeterminate_without_affordability"]
    flags.append(
        "quality_is_osm_proxy" if proxy_sufficient and quality_proxy is not None
        else "insufficient_quality_proxy_evidence"
    )
    return "unknown", "unknown", flags


def build_adjacency(n_nodes, edges):
    """undirected adjacency list for 1-hop spillover."""
    adj = [[] for _ in range(n_nodes)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    return adj
