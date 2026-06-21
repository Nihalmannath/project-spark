import sys
import unittest
from pathlib import Path

import numpy as np


PIPELINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE))

from notebook_model import NOTEBOOK_FEATURES  # noqa: E402
from osm_features import MODEL_FEATURES  # noqa: E402
from scenario_intervention import place_outlets_at_hub, validate_outlet_counts  # noqa: E402


class ScenarioInterventionTests(unittest.TestCase):
    def setUp(self):
        self.index = {name: i for i, name in enumerate(MODEL_FEATURES)}
        self.matrix = np.zeros((4, len(MODEL_FEATURES)), dtype=np.float32)
        self.xy = np.array([[0, 0], [700, 0], [1000, 0], [1600, 0]], dtype=float)
        for name in ("nearest_food_km", "nearest_grocery_km", "nearest_restaurant_km"):
            self.matrix[:, self.index[name]] = 10.0
        self.matrix[:, self.index["food_1500m"]] = 4.0
        self.matrix[:, self.index["grocery_1500m"]] = 2.0
        self.matrix[:, self.index["restaurant_1500m"]] = 2.0
        self.matrix[:, self.index["cuisine_diversity_1500m"]] = 20.0

    def test_exact_hub_counts_respect_both_catchments(self):
        result = place_outlets_at_hub(self.matrix, self.xy, np.array([0, 0]), 6, 6)
        after = result["full_raw"]
        food_800 = after[:, self.index["food_800m"]]
        food_1500 = after[:, self.index["food_1500m"]]

        np.testing.assert_array_equal(food_800, [12, 12, 0, 0])
        np.testing.assert_array_equal(food_1500, [16, 16, 16, 4])
        self.assertEqual(result["intervention"]["food_800m_increment"], 12)
        self.assertEqual(result["intervention"]["food_1500m_increment"], 12)
        self.assertEqual(result["intervention"]["nodes_within_800m"], 2)
        self.assertEqual(result["intervention"]["nodes_within_1500m"], 3)

    def test_nearest_distances_use_projected_hub_distance(self):
        after = place_outlets_at_hub(self.matrix, self.xy, np.array([0, 0]), 1, 1)["full_raw"]
        np.testing.assert_allclose(
            after[:, self.index["nearest_food_km"]], [0.0, 0.7, 1.0, 10.0], atol=1e-6
        )
        self.assertTrue(np.all(after[:, self.index["nearest_food_km"]] >= 0))

    def test_intervention_radius_limits_direct_feature_changes(self):
        result = place_outlets_at_hub(
            self.matrix, self.xy, np.array([0, 0]), 6, 6, intervention_radius_m=500
        )
        after = result["full_raw"]
        np.testing.assert_array_equal(after[:, self.index["food_800m"]], [12, 0, 0, 0])
        np.testing.assert_array_equal(after[:, self.index["food_1500m"]], [16, 4, 4, 4])
        self.assertEqual(result["intervention"]["nodes_within_intervention"], 1)
        self.assertEqual(result["intervention"]["intervention_radius_m"], 500)

    def test_equal_totals_have_equal_model_inputs_but_different_proxy(self):
        grocery = place_outlets_at_hub(self.matrix, self.xy, np.array([0, 0]), 12, 0)
        restaurant = place_outlets_at_hub(self.matrix, self.xy, np.array([0, 0]), 0, 12)
        model_columns = [self.index[name] for name in NOTEBOOK_FEATURES]
        np.testing.assert_allclose(
            grocery["full_raw"][:, model_columns], restaurant["full_raw"][:, model_columns]
        )
        self.assertNotEqual(
            grocery["proxy_summary"]["grocery_share_pct"]["after_median"],
            restaurant["proxy_summary"]["grocery_share_pct"]["after_median"],
        )

    def test_zero_outlets_is_noop(self):
        result = place_outlets_at_hub(self.matrix, self.xy, np.array([0, 0]), 0, 0)
        np.testing.assert_array_equal(result["full_raw"], self.matrix)
        self.assertEqual(result["directly_affected"].tolist(), [])

    def test_count_contract(self):
        self.assertEqual(validate_outlet_counts(6, 6), (6, 6))
        with self.assertRaises(ValueError):
            validate_outlet_counts(-1, 0)
        with self.assertRaises(ValueError):
            validate_outlet_counts(20, 11)


if __name__ == "__main__":
    unittest.main()
