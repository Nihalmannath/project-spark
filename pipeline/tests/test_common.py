import sys
import unittest
from pathlib import Path

import numpy as np

PIPELINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE))

from common import (  # noqa: E402
    access_percentile,
    classify_mysuru,
    normalized_entropy,
    osm_food_category,
    parse_cuisines,
    proxy_components,
)


class AccessTests(unittest.TestCase):
    def test_tied_percentiles_use_average_rank(self):
        pct = access_percentile([1, 1, 1], [2, 2, 2], [0.5, 0.5, 0.5])
        np.testing.assert_allclose(pct, [200 / 3] * 3)

    def test_access_threshold_is_strictly_below_40(self):
        self.assertEqual(classify_mysuru(39.9, 80, True)[0], "desert")
        self.assertEqual(classify_mysuru(40.0, 20, True)[0], "swamp")


class ProxyTests(unittest.TestCase):
    def test_balanced_categories_have_maximum_diversity(self):
        self.assertAlmostEqual(normalized_entropy([1, 1, 1, 1]), 100.0)
        self.assertEqual(normalized_entropy([4, 0, 0, 0]), 0.0)

    def test_unhealthy_share_is_calculated(self):
        comp = proxy_components([1, 1, 2, 0], cuisine_count=2, poi_count=4)
        self.assertEqual(comp["fast_food_share"], 50.0)
        self.assertEqual(comp["grocery_share"], 25.0)

    def test_sparse_pois_do_not_create_quality_score(self):
        comp = proxy_components([1, 1, 1, 1], cuisine_count=4, poi_count=4)
        self.assertFalse(comp["sufficient"])
        self.assertIsNone(comp["quality_proxy"])
        self.assertEqual(classify_mysuru(70, None, False)[0], "unknown")

    def test_missing_osm_tags_are_unclassified(self):
        self.assertIsNone(osm_food_category({}))
        self.assertIsNone(osm_food_category({"shop": np.nan, "amenity": None}))
        self.assertEqual(parse_cuisines(None), set())

    def test_swamp_requires_adequate_access_and_poor_proxy(self):
        self.assertEqual(classify_mysuru(70, 39.9, True)[0], "swamp")
        self.assertEqual(classify_mysuru(70, 40.0, True)[0], "unknown")
        self.assertEqual(classify_mysuru(20, 10, True)[0], "desert")

    def test_good_proxy_still_cannot_fabricate_oasis(self):
        label, evidence, flags = classify_mysuru(90, 95, True)
        self.assertEqual(label, "unknown")
        self.assertEqual(evidence, "unknown")
        self.assertIn("affordability_unavailable", flags)


if __name__ == "__main__":
    unittest.main()
