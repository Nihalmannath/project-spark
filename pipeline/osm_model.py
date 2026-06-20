"""GraphSAGE model, calibration, abstention, and checkpoint helpers."""
from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from scipy.optimize import minimize_scalar
from sklearn.covariance import LedoitWolf
from sklearn.metrics import f1_score
from torch_geometric.nn import SAGEConv

from osm_features import MODEL_FEATURES, MODEL_SCHEMA_VERSION

MODEL_VERSION = "osm-graphsage-mysuru-v1.0.0"
CLASS_KEYS = ["desert", "oasis", "mirage", "swamp"]
CLASS_TO_ID = {key: index for index, key in enumerate(CLASS_KEYS)}


class OSMGraphSAGE(nn.Module):
    def __init__(self, in_dim=len(MODEL_FEATURES), hidden=64, dropout=0.3):
        super().__init__()
        self.conv1 = SAGEConv(in_dim, hidden, aggr="mean")
        self.conv2 = SAGEConv(hidden, hidden, aggr="mean")
        self.classifier = nn.Linear(hidden, len(CLASS_KEYS))
        self.dropout = dropout

    def forward(self, features, edge_index):
        hidden = F.relu(self.conv1(features, edge_index))
        hidden = F.dropout(hidden, self.dropout, training=self.training)
        hidden = F.relu(self.conv2(hidden, edge_index))
        return self.classifier(hidden)


def focal_loss(logits, target, class_weight, gamma=0.0):
    """Class-balanced cross entropy; gamma can enable standard focal modulation."""
    log_probability = F.log_softmax(logits, dim=1)
    selected_log_probability = log_probability[torch.arange(len(target)), target]
    probability = selected_log_probability.exp()
    alpha = class_weight[target]
    return (-alpha * ((1.0 - probability) ** gamma) * selected_log_probability).mean()


def class_weights(labels, swamp_multiplier=1.0):
    counts = np.bincount(np.asarray(labels, dtype=int), minlength=len(CLASS_KEYS)).astype(float)
    weights = counts.sum() / (len(CLASS_KEYS) * np.maximum(counts, 1.0))
    weights[CLASS_KEYS.index("swamp")] *= float(swamp_multiplier)
    return torch.tensor(weights, dtype=torch.float32)


def induced_graph(edges, node_indexes):
    """Return local undirected edge_index for a split-safe induced subgraph."""
    node_indexes = np.asarray(node_indexes, dtype=int)
    remap = {int(old): new for new, old in enumerate(node_indexes)}
    local_edges = []
    for left, right in edges:
        if left in remap and right in remap:
            local_edges.append((remap[left], remap[right]))
            local_edges.append((remap[right], remap[left]))
    if not local_edges:
        local_edges = [(index, index) for index in range(len(node_indexes))]
    return torch.tensor(np.asarray(local_edges).T, dtype=torch.long)


def full_edge_index(edges):
    directed = [(int(left), int(right)) for left, right in edges]
    directed += [(right, left) for left, right in directed]
    return torch.tensor(np.asarray(directed).T, dtype=torch.long)


def softmax_probabilities(logits, temperature=1.0):
    logits = np.asarray(logits, dtype=float) / max(float(temperature), 1e-3)
    logits -= logits.max(axis=1, keepdims=True)
    exp = np.exp(logits)
    return exp / exp.sum(axis=1, keepdims=True)


def fit_temperature(logits, labels):
    logits = np.asarray(logits, dtype=float)
    labels = np.asarray(labels, dtype=int)

    def nll(temperature):
        probabilities = softmax_probabilities(logits, temperature)
        return -np.log(np.maximum(probabilities[np.arange(len(labels)), labels], 1e-12)).mean()

    result = minimize_scalar(nll, bounds=(0.5, 5.0), method="bounded")
    return float(result.x)


def expected_calibration_error(probabilities, labels, bins=10):
    probabilities = np.asarray(probabilities, dtype=float)
    labels = np.asarray(labels, dtype=int)
    confidence = probabilities.max(axis=1)
    correct = probabilities.argmax(axis=1) == labels
    error = 0.0
    for lower, upper in zip(np.linspace(0, 1, bins + 1)[:-1], np.linspace(0, 1, bins + 1)[1:]):
        selected = (confidence > lower) & (confidence <= upper)
        if selected.any():
            error += selected.mean() * abs(correct[selected].mean() - confidence[selected].mean())
    return float(error)


def normalized_entropy(probabilities):
    probabilities = np.asarray(probabilities, dtype=float)
    return -(probabilities * np.log(np.maximum(probabilities, 1e-12))).sum(axis=1) / np.log(
        probabilities.shape[1]
    )


def select_abstention_threshold(probabilities, labels, minimum_coverage=0.60):
    """Choose the confidence threshold maximizing selective macro-F1."""
    confidence = probabilities.max(axis=1)
    prediction = probabilities.argmax(axis=1)
    best = None
    for threshold in np.linspace(0.25, 0.90, 66):
        accepted = confidence >= threshold
        coverage = float(accepted.mean())
        if coverage < minimum_coverage:
            continue
        macro_f1 = f1_score(
            labels[accepted], prediction[accepted], labels=range(len(CLASS_KEYS)),
            average="macro", zero_division=0,
        )
        candidate = (float(macro_f1), float(threshold), coverage)
        if best is None or candidate[0] > best[0] or (
            candidate[0] == best[0] and candidate[2] > best[2]
        ):
            best = candidate
    if best is None:
        return 0.25, 1.0, f1_score(labels, prediction, average="macro", zero_division=0)
    return best[1], best[2], best[0]


def fit_ood_detector(features, quantile=0.99):
    estimator = LedoitWolf().fit(np.asarray(features, dtype=float))
    scores = ood_scores(features, estimator.location_, estimator.precision_)
    return {
        "location": estimator.location_.astype(np.float32),
        "precision": estimator.precision_.astype(np.float32),
        "threshold": float(np.quantile(scores, quantile)),
        "quantile": quantile,
    }


def ood_scores(features, location, precision):
    centered = np.asarray(features, dtype=float) - np.asarray(location, dtype=float)
    squared = np.einsum("ij,jk,ik->i", centered, np.asarray(precision, dtype=float), centered)
    return np.sqrt(np.maximum(squared, 0.0))


def apply_abstention(probabilities, ood, confidence_threshold, entropy_threshold, ood_threshold):
    confidence = probabilities.max(axis=1)
    entropy = normalized_entropy(probabilities)
    accepted = (
        (confidence >= confidence_threshold)
        & (entropy <= entropy_threshold)
        & (np.asarray(ood) <= ood_threshold)
    )
    top = probabilities.argmax(axis=1)
    labels = np.array([CLASS_KEYS[index] for index in top], dtype=object)
    labels[~accepted] = "unknown"
    reasons = []
    for index in range(len(labels)):
        flags = []
        if confidence[index] < confidence_threshold:
            flags.append("low_model_confidence")
        if entropy[index] > entropy_threshold:
            flags.append("high_predictive_entropy")
        if ood[index] > ood_threshold:
            flags.append("outside_training_feature_domain")
        reasons.append(flags)
    return labels, confidence, entropy, accepted, reasons


def validate_checkpoint(checkpoint):
    if checkpoint.get("model_version") != MODEL_VERSION:
        raise ValueError("unsupported OSM GraphSAGE model version")
    if checkpoint.get("schema_version") != MODEL_SCHEMA_VERSION:
        raise ValueError("OSM feature schema mismatch")
    if checkpoint.get("feature_names") != MODEL_FEATURES:
        raise ValueError("OSM feature order mismatch")
    if checkpoint.get("class_keys") != CLASS_KEYS:
        raise ValueError("model class order mismatch")
    return checkpoint


def checkpoint_sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_checkpoint(path):
    checkpoint = torch.load(path, map_location="cpu", weights_only=False)
    validate_checkpoint(checkpoint)
    model = OSMGraphSAGE()
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    return checkpoint, model
