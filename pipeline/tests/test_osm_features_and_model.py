import json
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
import torch

PIPELINE = Path(__file__).resolve().parents[1]
ROOT = PIPELINE.parent
sys.path.insert(0, str(PIPELINE))

from osm_features import (  # noqa: E402
    MODEL_FEATURES,
    MODEL_SCHEMA_VERSION,
    fixed_percentile_rows,
    highway_rank,
    percentile_matrix,
)
from osm_model import (  # noqa: E402
    CLASS_KEYS,
    MODEL_VERSION,
    OSMGraphSAGE,
    apply_abstention,
    checkpoint_sha256,
    expected_calibration_error,
    softmax_probabilities,
    validate_checkpoint,
)
from notebook_model import (  # noqa: E402
    NOTEBOOK_FEATURES,
    NOTEBOOK_MODEL_VERSION,
    checkpoint_sha256 as notebook_checkpoint_sha256,
    load_checkpoint as load_notebook_checkpoint,
)
from train_osm_graphsage import _train_final  # noqa: E402


class FeatureSchemaTests(unittest.TestCase):
    def test_schema_has_exactly_25_transferable_features(self):
        self.assertEqual(len(MODEL_FEATURES), 25)
        forbidden = ("price", "rating", "zomato", "swiggy", "instamart", "boundary", "label")
        self.assertFalse(any(token in name for name in MODEL_FEATURES for token in forbidden))

    def test_highway_rank_mapping_handles_scalar_and_list_tags(self):
        self.assertEqual(highway_rank("motorway"), 6.0)
        self.assertEqual(highway_rank(["residential", "primary"]), 4.0)
        self.assertEqual(highway_rank(None), 1.0)

    def test_percentile_schema_is_city_shape_invariant(self):
        source = np.arange(75, dtype=float).reshape(3, 25)
        target = np.arange(125, dtype=float).reshape(5, 25)
        self.assertEqual(percentile_matrix(source).shape[1], 25)
        self.assertEqual(percentile_matrix(target).shape[1], 25)

    def test_generated_city_graphs_use_identical_feature_order(self):
        source = json.loads((ROOT / "public/data/bengaluru_graph.json").read_text())
        target = json.loads((ROOT / "public/data/mysuru_graph.json").read_text())
        self.assertEqual(source["model_feature_names"], MODEL_FEATURES)
        self.assertEqual(target["model_feature_names"], MODEL_FEATURES)

    def test_fixed_ecdf_preserves_baseline_average_ranks(self):
        matrix = np.array([[1, 2], [1, 4], [3, 6]], dtype=float)
        expected = percentile_matrix(matrix)
        actual = fixed_percentile_rows([np.sort(matrix[:, i]) for i in range(2)], matrix)
        np.testing.assert_allclose(actual, expected)


class ModelContractTests(unittest.TestCase):
    def test_notebook_checkpoint_is_valid_and_matches_metadata(self):
        checkpoint_path = PIPELINE / "models" / "notebook04_graphsage_v2.pt"
        metadata_path = PIPELINE / "models" / "notebook04_graphsage_v2_meta.json"
        metadata = json.loads(metadata_path.read_text())
        checkpoint, model = load_notebook_checkpoint(checkpoint_path)
        self.assertEqual(checkpoint["model_version"], NOTEBOOK_MODEL_VERSION)
        self.assertEqual(checkpoint["feature_names"], NOTEBOOK_FEATURES)
        self.assertEqual(notebook_checkpoint_sha256(checkpoint_path), metadata["checkpoint_sha256"])
        self.assertEqual(model.conv1.in_channels, len(NOTEBOOK_FEATURES))

    def test_notebook_promotion_meets_historical_gate(self):
        metadata = json.loads(
            (PIPELINE / "models" / "notebook04_graphsage_v2_meta.json").read_text()
        )
        metrics = metadata["metrics"]
        self.assertTrue(metadata["promotion_passed"])
        self.assertGreaterEqual(metrics["spatial_cv_macro_f1"], 0.292)
        self.assertGreaterEqual(metrics["selective_coverage"], 0.60)
        self.assertTrue(all(metrics["promotion_checks"].values()))

    def test_probabilities_normalize_and_calibration_metric_is_bounded(self):
        logits = np.array([[2.0, 1.0, 0.0, -1.0], [0.0, 1.0, 2.0, 3.0]])
        probabilities = softmax_probabilities(logits, temperature=1.5)
        np.testing.assert_allclose(probabilities.sum(axis=1), 1.0)
        ece = expected_calibration_error(probabilities, np.array([0, 3]))
        self.assertGreaterEqual(ece, 0.0)
        self.assertLessEqual(ece, 1.0)

    def test_abstention_supports_confidence_entropy_and_ood(self):
        probabilities = np.array([
            [0.9, 0.04, 0.03, 0.03],
            [0.26, 0.25, 0.25, 0.24],
            [0.9, 0.04, 0.03, 0.03],
        ])
        labels, _, _, accepted, reasons = apply_abstention(
            probabilities, np.array([1.0, 1.0, 99.0]),
            confidence_threshold=0.5, entropy_threshold=0.9, ood_threshold=10.0,
        )
        self.assertEqual(labels.tolist(), ["desert", "unknown", "unknown"])
        self.assertEqual(accepted.tolist(), [True, False, False])
        self.assertIn("low_model_confidence", reasons[1])
        self.assertIn("outside_training_feature_domain", reasons[2])

    def test_checkpoint_schema_and_hash_validation(self):
        model = OSMGraphSAGE()
        checkpoint = {
            "model_version": MODEL_VERSION,
            "schema_version": MODEL_SCHEMA_VERSION,
            "feature_names": MODEL_FEATURES,
            "class_keys": CLASS_KEYS,
            "state_dict": model.state_dict(),
        }
        self.assertIs(validate_checkpoint(checkpoint), checkpoint)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "model.pt"
            torch.save(checkpoint, path)
            digest = checkpoint_sha256(path)
            self.assertEqual(len(digest), 64)

    def test_generated_metadata_records_failed_gate_without_primary_switch(self):
        metadata = json.loads((ROOT / "public/data/mysuru_meta.json").read_text())
        if not metadata["model"]["promotion_passed"]:
            self.assertEqual(metadata["model"]["status"], "evaluation_only")
            self.assertEqual(metadata["label_counts"], metadata["proxy_label_counts"])

    def test_seeded_training_is_deterministic_on_tiny_graph(self):
        features = np.arange(200, dtype=np.float32).reshape(8, 25)
        labels = np.array([0, 1, 2, 3, 0, 1, 2, 3])
        edges = [[index, index + 1] for index in range(7)]
        indexes = np.arange(8)
        first, _, _ = _train_final(features, labels, edges, indexes, 30, 123, 1.0)
        second, _, _ = _train_final(features, labels, edges, indexes, 30, 123, 1.0)
        for key in first.state_dict():
            self.assertTrue(torch.equal(first.state_dict()[key], second.state_dict()[key]))


if __name__ == "__main__":
    unittest.main()
