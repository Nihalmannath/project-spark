import json
import sys
import unittest
from pathlib import Path

PIPELINE = Path(__file__).resolve().parents[1]
ROOT = PIPELINE.parent
sys.path.insert(0, str(PIPELINE))

from fastapi.testclient import TestClient  # noqa: E402
import serve  # noqa: E402


class ArtifactAndApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = ROOT / "public" / "data"
        serve.load_city.cache_clear()
        serve.load_model_bundle.cache_clear()
        cls.client = TestClient(serve.app)

    def test_metadata_counts_match_geojson(self):
        for city in ("bengaluru", "mysuru"):
            meta = json.loads((self.data / f"{city}_meta.json").read_text())
            geo = json.loads((self.data / f"{city}_nodes.geojson").read_text())
            counts = {key: 0 for key in meta["label_counts"]}
            for feature in geo["features"]:
                counts[feature["properties"]["label"]] += 1
            self.assertEqual(counts, meta["label_counts"])
            self.assertEqual(meta["n_nodes"], len(geo["features"]))
            self.assertEqual(meta["unknown_count"], counts["unknown"])

    def test_promotion_failure_keeps_proxy_primary(self):
        meta = self.client.get("/api/meta/mysuru").json()
        if not meta["model"]["promotion_passed"]:
            self.assertEqual(meta["label_counts"], meta["proxy_label_counts"])
            self.assertEqual(meta["label_counts"]["mirage"], 0)
            self.assertEqual(meta["label_counts"]["oasis"], 0)

    def test_scenario_reports_model_candidate_when_not_promoted(self):
        graph = json.loads((self.data / "mysuru_graph.json").read_text())
        node = graph["label"].index("swamp")
        response = self.client.post("/api/scenario/mysuru", json={
            "hub": graph["lonlat"][node],
            "radius_m": 100,
            "d_food_800": 1000,
            "d_food_1500": 2000,
        })
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("candidate_model_changed_count", body)
        self.assertEqual(
            body["intervention_evidence"],
            "model" if body["model_promotion_passed"] else "proxy_fallback_model_not_promoted",
        )

    def test_promoted_model_allows_model_driven_desert_transition(self):
        graph = json.loads((self.data / "mysuru_graph.json").read_text())
        node = graph["label"].index("desert")
        response = self.client.post("/api/scenario/mysuru", json={
            "hub": graph["lonlat"][node],
            "radius_m": 100,
            "d_food_800": 1000,
            "d_food_1500": 2000,
        })
        changed = {row["id"]: row for row in response.json()["changed"]}
        self.assertIn(node, changed)
        self.assertIn(changed[node]["after"], ("desert", "swamp", "mirage", "oasis", "unknown"))
        self.assertEqual(response.json()["intervention_evidence"], "model")
        self.assertEqual(set(changed[node]["after_probabilities"]), {
            "desert", "oasis", "mirage", "swamp"
        })

    def test_notebook_hub_produces_real_full_graph_changes(self):
        response = self.client.post("/api/scenario/mysuru", json={
            "hub": [76.6558, 12.3041],
            "radius_m": 2000,
            "d_food_800": 12,
            "d_food_1500": 25,
            "near_floor": 0.15,
            "dens_mult": 1.4,
        })
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertGreater(body["affected"], 0)
        self.assertGreater(len(body["changed"]), 0)
        self.assertGreater(body["candidate_model_changed_count"], 0)
        self.assertTrue(any(change["spillover"] for change in body["changed"]))

    def test_bengaluru_scenario_uses_model_baseline(self):
        graph = json.loads((self.data / "bengaluru_graph.json").read_text())
        node = graph["model_label"].index("desert")
        response = self.client.post("/api/scenario/bengaluru", json={
            "hub": graph["lonlat"][node],
            "radius_m": 1000,
            "d_food_800": 12,
            "d_food_1500": 25,
            "dens_mult": 1.4,
        })
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["intervention_evidence"], "model")
        self.assertGreater(len(body["changed"]), 0)
        for change in body["changed"]:
            self.assertEqual(change["before"], graph["model_label"][change["id"]])

    def test_bengaluru_noop_scenario_has_no_changes(self):
        graph = json.loads((self.data / "bengaluru_graph.json").read_text())
        response = self.client.post("/api/scenario/bengaluru", json={
            "hub": graph["lonlat"][0],
            "radius_m": 1000,
            "d_food_800": 0,
            "d_food_1500": 0,
            "near_floor": 999,
            "dens_mult": 1,
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["changed"], [])

    def test_categorized_scenario_supports_unrestricted_candidate_transitions(self):
        graph = json.loads((self.data / "mysuru_graph.json").read_text())
        node = graph["label"].index("swamp")
        response = self.client.post("/api/scenario/mysuru", json={
            "hub": graph["lonlat"][node],
            "radius_m": 100,
            "d_food_800": 100,
            "d_food_1500": 200,
            "outlet_categories": ["grocery", "restaurant", "cafe"],
            "cuisine_categories": ["local", "vegetarian", "fresh_food"],
        })
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("candidate_model_transitions", body)
        self.assertIsInstance(body["candidate_model_transitions"], list)
        for change in body["candidate_model_changes"]:
            self.assertEqual(set(change["before_probabilities"]), {
                "desert", "oasis", "mirage", "swamp"
            })
            self.assertEqual(set(change["after_probabilities"]), {
                "desert", "oasis", "mirage", "swamp"
            })

    def test_mysuru_scores_keep_affordability_null(self):
        geo = json.loads((self.data / "mysuru_nodes.geojson").read_text())
        for feature in geo["features"][::500]:
            props = feature["properties"]
            self.assertIsNone(props["affordability"])
            self.assertIn(props["evidence_level"], ("model", "proxy", "unknown"))
            self.assertEqual(set(props["model_probabilities"]), {
                "desert", "oasis", "mirage", "swamp"
            })
            self.assertAlmostEqual(sum(props["model_probabilities"].values()), 1.0, places=3)


if __name__ == "__main__":
    unittest.main()
