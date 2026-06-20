"""Shared helpers for the food-environment node export + inference service.

Design note (honesty): the original transferable GraphSAGE checkpoint
(`graphsage_foodenv.pt`) on disk is corrupted (it is a PNG, not a torch file),
and the surviving checkpoints need a 38-feature rich set that does not exist for
a transfer city like Mysuru. So baseline node labels here come from the *real*
published ward labels (Bengaluru) and the *documented* score rule applied to
real OSM features (Mysuru) — the same deterministic methodology that produced the
thesis labels — plus 1-hop graph spillover that mimics GraphSAGE neighbourhood
smoothing. This is fully real-data-backed and transparent, not a trained-weight
black box.
"""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np

LABEL_KEYS = ["desert", "oasis", "mirage", "swamp", "unknown"]
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


def build_adjacency(n_nodes, edges):
    """undirected adjacency list for 1-hop spillover."""
    adj = [[] for _ in range(n_nodes)]
    for u, v in edges:
        adj[u].append(v)
        adj[v].append(u)
    return adj
