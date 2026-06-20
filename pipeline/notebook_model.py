"""Reproducible eight-feature GraphSAGE used by thesis notebooks 03 and 04."""
from __future__ import annotations

import hashlib
from pathlib import Path

import torch

from osm_model import OSMGraphSAGE

NOTEBOOK_SCHEMA_VERSION = "notebook-osm-road-food-v2.0.0"
NOTEBOOK_MODEL_VERSION = "notebook04-graphsage-mysuru-v2.0.0"
NOTEBOOK_FEATURES = [
    "food_800m",
    "food_1500m",
    "nearest_food_km",
    "road_degree",
    "road_rank_mean",
    "road_rank_max",
    "inter_density_1km",
    "major_road_dist_km",
]
CLASS_KEYS = ["desert", "oasis", "mirage", "swamp"]
CLASS_TO_ID = {key: index for index, key in enumerate(CLASS_KEYS)}


def feature_indexes(graph):
    names = graph.get("model_feature_names", [])
    missing = [name for name in NOTEBOOK_FEATURES if name not in names]
    if missing:
        raise ValueError(f"notebook feature schema missing: {', '.join(missing)}")
    return [names.index(name) for name in NOTEBOOK_FEATURES]


def new_model():
    return OSMGraphSAGE(in_dim=len(NOTEBOOK_FEATURES))


def validate_checkpoint(checkpoint):
    if checkpoint.get("model_version") != NOTEBOOK_MODEL_VERSION:
        raise ValueError("unsupported notebook GraphSAGE model version")
    if checkpoint.get("schema_version") != NOTEBOOK_SCHEMA_VERSION:
        raise ValueError("notebook GraphSAGE schema mismatch")
    if checkpoint.get("feature_names") != NOTEBOOK_FEATURES:
        raise ValueError("notebook GraphSAGE feature order mismatch")
    if checkpoint.get("class_keys") != CLASS_KEYS:
        raise ValueError("notebook GraphSAGE class order mismatch")
    return checkpoint


def load_checkpoint(path):
    checkpoint = torch.load(path, map_location="cpu", weights_only=False)
    validate_checkpoint(checkpoint)
    model = new_model()
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    return checkpoint, model


def checkpoint_sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
