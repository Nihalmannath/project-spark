"""Canonical OSM-only feature schema shared by training and transfer cities."""
from __future__ import annotations

from collections.abc import Iterable

import geopandas as gpd
import numpy as np
from pyproj import Transformer
from scipy.spatial import cKDTree
from scipy.stats import rankdata

from common import (
    FOOD_CATEGORIES,
    normalize_osm_value,
    osm_food_category,
    parse_cuisines,
    proxy_components,
)

MODEL_SCHEMA_VERSION = "osm-road-food-v1.0.0"
MODEL_FEATURES = [
    "road_degree",
    "road_rank_mean",
    "road_rank_max",
    "inter_density_1km",
    "major_road_dist_km",
    "food_800m",
    "food_1500m",
    "nearest_food_km",
    *[f"{category}_800m" for category in FOOD_CATEGORIES],
    *[f"{category}_1500m" for category in FOOD_CATEGORIES],
    *[f"nearest_{category}_km" for category in FOOD_CATEGORIES],
    "grocery_share_1500m",
    "fast_food_share_1500m",
    "category_entropy_1500m",
    "cuisine_diversity_1500m",
    "osm_detail_tag_coverage_1500m",
]
assert len(MODEL_FEATURES) == 25

HIGHWAY_RANK = {
    "motorway": 6.0,
    "motorway_link": 6.0,
    "trunk": 5.0,
    "trunk_link": 5.0,
    "primary": 4.0,
    "primary_link": 4.0,
    "secondary": 3.0,
    "secondary_link": 3.0,
    "tertiary": 2.0,
    "tertiary_link": 2.0,
    "residential": 1.0,
    "living_street": 1.0,
    "unclassified": 1.0,
    "service": 1.0,
    "road": 1.0,
}

_UTM = Transformer.from_crs(4326, 32643, always_xy=True)


def highway_rank(value) -> float:
    """Map scalar/list OSM highway tags to the shared 1..6 rank scale."""
    if isinstance(value, (list, tuple, set, np.ndarray)):
        return max((highway_rank(item) for item in value), default=1.0)
    normalized = normalize_osm_value(value)
    if not normalized:
        return 1.0
    candidates = [token.strip() for token in normalized.split(",")]
    return max((HIGHWAY_RANK.get(token, 1.0) for token in candidates), default=1.0)


def poi_points(pois: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Represent point/polygon OSM features by a point on the feature surface."""
    clean = pois[pois.geometry.notna() & ~pois.geometry.is_empty].copy()
    projected = clean.to_crs(32643)
    points = projected.geometry.representative_point()
    return gpd.GeoDataFrame(
        clean.drop(columns="geometry"), geometry=points, crs=32643
    ).to_crs(4326)


def _detail_tagged(row) -> bool:
    return any(
        normalize_osm_value(row.get(key))
        for key in ("cuisine", "diet:vegetarian", "diet:vegan", "organic", "opening_hours")
    )


def _counts(tree: cKDTree | None, node_xy, radius: float) -> np.ndarray:
    if tree is None:
        return np.zeros(len(node_xy), dtype=float)
    return np.fromiter(
        (len(indexes) for indexes in tree.query_ball_point(node_xy, radius)),
        dtype=float,
        count=len(node_xy),
    )


def _nearest(tree: cKDTree | None, node_xy, fallback_km=25.0) -> np.ndarray:
    if tree is None:
        return np.full(len(node_xy), fallback_km, dtype=float)
    return tree.query(node_xy, k=1)[0] / 1000.0


def _road_features(coords, edges, ranks, node_xy):
    n_nodes = len(coords)
    degree = np.zeros(n_nodes)
    rank_sum = np.zeros(n_nodes)
    rank_max = np.zeros(n_nodes)
    major = np.zeros(n_nodes, dtype=bool)
    for (u, v), rank in zip(edges, ranks):
        for node in (u, v):
            degree[node] += 1
            rank_sum[node] += rank
            rank_max[node] = max(rank_max[node], rank)
            if rank >= 4:
                major[node] = True
    rank_mean = np.divide(rank_sum, np.maximum(degree, 1))
    node_tree = cKDTree(node_xy)
    intersection_density = _counts(node_tree, node_xy, 1000.0) - 1
    major_distance = (
        cKDTree(node_xy[major]).query(node_xy, k=1)[0] / 1000.0
        if major.any()
        else np.full(n_nodes, 25.0)
    )
    return degree, rank_mean, rank_max, intersection_density, major_distance


def build_model_features(coords, edges, ranks, pois: gpd.GeoDataFrame):
    """Return the canonical raw feature matrix, proxy rows, support arrays, and coverage."""
    points = poi_points(pois)
    node_xy = np.array(_UTM.transform(coords[:, 0], coords[:, 1])).T
    poi_xy = np.array(
        _UTM.transform(points.geometry.x.to_numpy(), points.geometry.y.to_numpy())
    ).T
    all_tree = cKDTree(poi_xy) if len(poi_xy) else None

    categories = [osm_food_category(row) for _, row in points.iterrows()]
    cuisines = [parse_cuisines(row.get("cuisine")) for _, row in points.iterrows()]
    detail_tagged = np.array([_detail_tagged(row) for _, row in points.iterrows()], dtype=bool)
    category_indexes = {
        category: np.array([i for i, value in enumerate(categories) if value == category], dtype=int)
        for category in FOOD_CATEGORIES
    }
    category_trees = {
        category: cKDTree(poi_xy[indexes]) if len(indexes) else None
        for category, indexes in category_indexes.items()
    }

    road = _road_features(coords, edges, ranks, node_xy)
    food_800 = _counts(all_tree, node_xy, 800.0)
    food_1500 = _counts(all_tree, node_xy, 1500.0)
    nearest_food = _nearest(all_tree, node_xy)
    category_800 = np.column_stack([
        _counts(category_trees[category], node_xy, 800.0) for category in FOOD_CATEGORIES
    ])
    category_1500 = np.column_stack([
        _counts(category_trees[category], node_xy, 1500.0) for category in FOOD_CATEGORIES
    ])
    nearest_category = np.column_stack([
        _nearest(category_trees[category], node_xy) for category in FOOD_CATEGORIES
    ])

    neighborhoods = all_tree.query_ball_point(node_xy, 1500.0) if all_tree else [[] for _ in node_xy]
    proxy_rows = []
    cuisine_count = np.zeros(len(coords), dtype=float)
    detail_count = np.zeros(len(coords), dtype=float)
    category_entropy = np.zeros(len(coords), dtype=float)
    cuisine_diversity = np.zeros(len(coords), dtype=float)
    detail_coverage = np.zeros(len(coords), dtype=float)
    for node, nearby in enumerate(neighborhoods):
        cuisine_set = set()
        for poi_index in nearby:
            cuisine_set.update(cuisines[poi_index])
        cuisine_count[node] = len(cuisine_set)
        detail_count[node] = int(detail_tagged[nearby].sum()) if nearby else 0
        comp = proxy_components(category_1500[node], len(cuisine_set), poi_count=len(nearby))
        comp["category_counts"] = category_1500[node].astype(int).tolist()
        comp["category_counts_800"] = category_800[node].astype(int).tolist()
        comp["cuisine_count"] = len(cuisine_set)
        comp["detail_tag_count"] = int(detail_count[node])
        proxy_rows.append(comp)
        category_entropy[node] = comp["category_diversity"]
        cuisine_diversity[node] = comp["cuisine_diversity"]
        detail_coverage[node] = detail_count[node] / max(len(nearby), 1) * 100.0

    grocery_share = category_1500[:, 0] / np.maximum(food_1500, 1) * 100.0
    fast_food_share = category_1500[:, 2] / np.maximum(food_1500, 1) * 100.0
    matrix = np.column_stack([
        *road,
        food_800,
        food_1500,
        nearest_food,
        *[category_800[:, i] for i in range(len(FOOD_CATEGORIES))],
        *[category_1500[:, i] for i in range(len(FOOD_CATEGORIES))],
        *[nearest_category[:, i] for i in range(len(FOOD_CATEGORIES))],
        grocery_share,
        fast_food_share,
        category_entropy,
        cuisine_diversity,
        detail_coverage,
    ]).astype(np.float32)
    assert matrix.shape == (len(coords), len(MODEL_FEATURES))

    categorized = sum(category is not None for category in categories)
    coverage = {
        "extracted_food_pois": int(len(pois)),
        "located_food_pois": int(len(points)),
        "categorized_food_pois": int(categorized),
        "categorized_pct": round(categorized / max(len(points), 1) * 100.0, 1),
        "cuisine_tagged_food_pois": int(sum(bool(value) for value in cuisines)),
        "cuisine_tagged_pct": round(sum(bool(value) for value in cuisines) / max(len(points), 1) * 100.0, 1),
        "detail_tagged_food_pois": int(detail_tagged.sum()),
        "detail_tagged_pct": round(detail_tagged.mean() * 100.0, 1) if len(points) else 0.0,
        "nodes_with_sufficient_proxy": int(sum(row["sufficient"] for row in proxy_rows)),
        "proxy_radius_m": 1500,
    }
    support = {
        "category_counts_800": category_800.astype(int),
        "category_counts_1500": category_1500.astype(int),
        "cuisine_count": cuisine_count.astype(int),
        "detail_tag_count": detail_count.astype(int),
    }
    return matrix, proxy_rows, support, coverage, points


def percentile_matrix(matrix: np.ndarray) -> np.ndarray:
    """Within-city average ranks used identically by source and target cities."""
    matrix = np.asarray(matrix, dtype=float)
    ranked = np.zeros_like(matrix, dtype=np.float32)
    for column in range(matrix.shape[1]):
        ranked[:, column] = rankdata(matrix[:, column], method="average") / len(matrix) * 100.0
    return ranked


def fixed_percentile_rows(sorted_columns: Iterable[np.ndarray], rows: np.ndarray) -> np.ndarray:
    """Map scenario rows to the fixed baseline ECDF for every model feature."""
    rows = np.asarray(rows, dtype=float)
    output = np.zeros_like(rows, dtype=np.float32)
    for column, baseline in enumerate(sorted_columns):
        baseline = np.asarray(baseline, dtype=float)
        values = rows[:, column]
        left = np.searchsorted(baseline, values, side="left")
        right = np.searchsorted(baseline, values, side="right")
        tied = right > left
        ranks = right.astype(float)
        ranks[tied] = (left[tied] + 1 + right[tied]) / 2.0
        output[:, column] = ranks / len(baseline) * 100.0
    return output
