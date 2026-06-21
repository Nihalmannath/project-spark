"""Physical hub-outlet perturbations shared by all scenario endpoints."""
from __future__ import annotations

import numpy as np

from common import FOOD_CATEGORIES, proxy_components
from osm_features import MODEL_FEATURES


FEATURE_INDEX = {name: index for index, name in enumerate(MODEL_FEATURES)}
CATEGORY_INDEX = {category: FOOD_CATEGORIES.index(category) for category in FOOD_CATEGORIES}


def validate_outlet_counts(grocery_outlets: int, restaurant_outlets: int) -> tuple[int, int]:
    grocery = int(grocery_outlets)
    restaurant = int(restaurant_outlets)
    if grocery < 0 or restaurant < 0:
        raise ValueError("outlet counts must be non-negative")
    if grocery + restaurant > 30:
        raise ValueError("grocery_outlets + restaurant_outlets must not exceed 30")
    return grocery, restaurant


def _proxy_rows(matrix: np.ndarray, indexes: np.ndarray) -> dict[str, list[float | None]]:
    category_columns = [FEATURE_INDEX[f"{category}_1500m"] for category in FOOD_CATEGORIES]
    cuisine_column = FEATURE_INDEX["cuisine_diversity_1500m"]
    food_column = FEATURE_INDEX["food_1500m"]
    rows: dict[str, list[float | None]] = {
        "grocery_share_pct": [],
        "category_diversity_pct": [],
        "category_coverage_pct": [],
        "quality_proxy": [],
    }
    for node in indexes:
        counts = matrix[node, category_columns]
        cuisine_count_equivalent = matrix[node, cuisine_column] / 20.0
        components = proxy_components(
            counts,
            cuisine_count_equivalent,
            poi_count=matrix[node, food_column],
        )
        rows["grocery_share_pct"].append(float(components["grocery_share"]))
        rows["category_diversity_pct"].append(float(components["category_diversity"]))
        rows["category_coverage_pct"].append(float(components["category_coverage"]))
        quality = components["quality_proxy"]
        rows["quality_proxy"].append(None if quality is None else float(quality))
    return rows


def _median(values: list[float | None]) -> float | None:
    available = [value for value in values if value is not None and np.isfinite(value)]
    return round(float(np.median(available)), 1) if available else None


def _proxy_summary(before: np.ndarray, after: np.ndarray, indexes: np.ndarray) -> dict:
    baseline = _proxy_rows(before, indexes)
    scenario = _proxy_rows(after, indexes)
    return {
        key: {"before_median": _median(baseline[key]), "after_median": _median(scenario[key])}
        for key in baseline
    }


def place_outlets_at_hub(
    full_raw: np.ndarray,
    xy: np.ndarray,
    hub_xy: np.ndarray,
    grocery_outlets: int,
    restaurant_outlets: int,
    intervention_radius_m: float = 1500.0,
) -> dict:
    """Place exact outlet counts at one projected hub and rebuild dependent evidence.

    Distances match the source feature builder: straight-line metres in EPSG:32643.
    Generic restaurants carry no cuisine, price, or nutrition assumptions.
    """
    grocery, restaurant = validate_outlet_counts(grocery_outlets, restaurant_outlets)
    radius_m = float(intervention_radius_m)
    if not np.isfinite(radius_m) or radius_m <= 0:
        raise ValueError("intervention_radius_m must be a positive finite number")
    total = grocery + restaurant
    before = np.asarray(full_raw, dtype=np.float32)
    after = before.copy()
    distances_m = np.linalg.norm(np.asarray(xy, dtype=float) - np.asarray(hub_xy, dtype=float), axis=1)
    within_intervention = np.flatnonzero(distances_m <= radius_m)
    within_800 = np.flatnonzero(distances_m <= min(800.0, radius_m))
    within_1500 = np.flatnonzero(distances_m <= min(1500.0, radius_m))

    if total:
        after[within_800, FEATURE_INDEX["food_800m"]] += total
        after[within_1500, FEATURE_INDEX["food_1500m"]] += total
        after[within_intervention, FEATURE_INDEX["nearest_food_km"]] = np.minimum(
            before[within_intervention, FEATURE_INDEX["nearest_food_km"]],
            distances_m[within_intervention] / 1000.0,
        )

    for category, count in (("grocery", grocery), ("restaurant", restaurant)):
        if not count:
            continue
        after[within_800, FEATURE_INDEX[f"{category}_800m"]] += count
        after[within_1500, FEATURE_INDEX[f"{category}_1500m"]] += count
        after[within_intervention, FEATURE_INDEX[f"nearest_{category}_km"]] = np.minimum(
            before[within_intervention, FEATURE_INDEX[f"nearest_{category}_km"]],
            distances_m[within_intervention] / 1000.0,
        )

    if total:
        category_columns = [FEATURE_INDEX[f"{category}_1500m"] for category in FOOD_CATEGORIES]
        category_counts = after[within_1500][:, category_columns]
        food_counts = np.maximum(after[within_1500, FEATURE_INDEX["food_1500m"]], 1.0)
        after[within_1500, FEATURE_INDEX["grocery_share_1500m"]] = (
            category_counts[:, CATEGORY_INDEX["grocery"]] / food_counts * 100.0
        )
        after[within_1500, FEATURE_INDEX["fast_food_share_1500m"]] = (
            category_counts[:, CATEGORY_INDEX["fast_food"]] / food_counts * 100.0
        )
        entropy = []
        for row in category_counts:
            positive = row[row > 0]
            if len(positive) <= 1:
                entropy.append(0.0)
            else:
                probabilities = positive / positive.sum()
                entropy.append(
                    float(-(probabilities * np.log(probabilities)).sum() / np.log(len(FOOD_CATEGORIES)) * 100.0)
                )
        after[within_1500, FEATURE_INDEX["category_entropy_1500m"]] = entropy

    notebook_columns = [FEATURE_INDEX[name] for name in (
        "food_800m",
        "food_1500m",
        "nearest_food_km",
        "road_degree",
        "road_rank_mean",
        "road_rank_max",
        "inter_density_1km",
        "major_road_dist_km",
    )]
    changed_model_input = np.any(after[:, notebook_columns] != before[:, notebook_columns], axis=1)
    directly_affected = np.flatnonzero(changed_model_input)

    return {
        "full_raw": after,
        "directly_affected": directly_affected,
        "within_800": within_800,
        "within_1500": within_1500,
        "intervention": {
            "placement_mode": "hub",
            "grocery_outlets": grocery,
            "restaurant_outlets": restaurant,
            "total_outlets": total,
            "food_800m_increment": total,
            "food_1500m_increment": total,
            "intervention_radius_m": radius_m,
            "nodes_within_intervention": int(len(within_intervention)),
            "nodes_within_800m": int(len(within_800)),
            "nodes_within_1500m": int(len(within_1500)),
            "model_uses_combined_total": True,
        },
        "proxy_summary": _proxy_summary(before, after, within_1500),
    }
