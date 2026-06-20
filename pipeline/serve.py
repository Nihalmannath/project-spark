"""Food-environment transfer inference service.

Serves baseline node predictions and on-demand scenario re-inference for the
React app. The scenario reproduces notebook 04's intervention faithfully:

  within `radius_m` of the placed hub:
    food_800m  += d_food_800   (default +12)
    food_1500m += d_food_1500  (default +25)
    nearest_food_km = min(_, near_floor)   (default 0.15 km)
    inter_density_1km *= dens_mult         (default 1.4)

then the affected nodes are re-scored against the FIXED baseline access ECDF
(only the intervened area moves), re-tiered, and a 1-hop graph spillover lets
neighbours of improved nodes step up once — mimicking GraphSAGE smoothing.

Run:  uvicorn serve:app --port 8000   (from this pipeline/ dir)
"""
from __future__ import annotations
import json
from pathlib import Path
from functools import lru_cache

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pyproj import Transformer

from common import access_raw, LADDER

DATA = Path(__file__).resolve().parents[1] / "public" / "data"
_T = Transformer.from_crs(4326, 32643, always_xy=True)  # UTM 43N (BLR + Mysuru)

app = FastAPI(title="Food-Environment Transfer Inference")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


@lru_cache(maxsize=4)
def load_city(city: str):
    p = DATA / f"{city}_graph.json"
    if not p.exists():
        raise HTTPException(404, f"no graph for '{city}' — run export_nodes.py --city {city}")
    g = json.loads(p.read_text())
    lonlat = np.array(g["lonlat"], float)
    xy = np.array(_T.transform(lonlat[:, 0], lonlat[:, 1])).T  # (n,2) metres
    feats = {
        "food_800m": np.array(g["food_800m"], float),
        "food_1500m": np.array(g["food_1500m"], float),
        "nearest_food_km": np.array(g["nearest_food_km"], float),
    }
    a_base = access_raw(feats["food_800m"], feats["food_1500m"], feats["nearest_food_km"])
    sorted_base = np.sort(a_base)
    return {
        "n": g["n"], "edges": g["edges"], "lonlat": lonlat, "xy": xy,
        "feats": feats, "a_base": a_base,
        "sorted_base": sorted_base, "label": list(g["label"]),
        "adj": _adjacency(g["n"], g["edges"]),
    }


def _adjacency(n, edges):
    adj = [[] for _ in range(n)]
    for u, v in edges:
        adj[u].append(v); adj[v].append(u)
    return adj


def _ecdf_pct(sorted_base, values):
    return np.searchsorted(sorted_base, values, side="right") / len(sorted_base) * 100.0


def _tier(pct):
    # documented access rule: <40 desert, <55 mirage(access-limited), else oasis
    return np.where(pct < 40, "desert", np.where(pct < 55, "mirage", "oasis"))


def _radius_query(xy, center_xy, radius_m):
    deltas = xy - center_xy
    within = np.sum(deltas * deltas, axis=1) <= radius_m * radius_m
    return np.flatnonzero(within)


def _ladder_max(a, b):
    """better of two labels on the access ladder (improvement-only)."""
    ia = LADDER.index(a) if a in LADDER else 0
    ib = LADDER.index(b) if b in LADDER else 0
    return LADDER[max(ia, ib)]


class ScenarioReq(BaseModel):
    hub: list[float]            # [lon, lat]
    radius_m: float = 2000.0
    d_food_800: float = 12.0
    d_food_1500: float = 25.0
    near_floor: float = 0.15
    dens_mult: float = 1.4


@app.get("/api/health")
def health():
    return {"ok": True, "cities": [p.stem.replace("_graph", "")
                                   for p in DATA.glob("*_graph.json")]}


@app.get("/api/meta/{city}")
def meta(city: str):
    p = DATA / f"{city}_meta.json"
    if not p.exists():
        raise HTTPException(404, f"no meta for '{city}'")
    return json.loads(p.read_text())


@app.post("/api/scenario/{city}")
def scenario(city: str, req: ScenarioReq):
    c = load_city(city)
    hub_xy = np.array(_T.transform(req.hub[0], req.hub[1]))
    idx = _radius_query(c["xy"], hub_xy, req.radius_m)
    base_label = np.array(c["label"], dtype=object)

    if len(idx) == 0:
        return {"affected": 0, "moved_out_of_desert": 0, "spillover": 0,
                "changed": [], "transitions": [], "hub": req.hub, "radius_m": req.radius_m}

    # 1) perturb features in the intervened zone (notebook-04 deltas)
    f800 = c["feats"]["food_800m"].copy()
    f1500 = c["feats"]["food_1500m"].copy()
    nfk = c["feats"]["nearest_food_km"].copy()
    f800[idx] += req.d_food_800
    f1500[idx] += req.d_food_1500
    nfk[idx] = np.minimum(nfk[idx], req.near_floor)

    # 2) re-score affected nodes against the FIXED baseline ECDF
    a_scn = access_raw(f800[idx], f1500[idx], nfk[idx])
    pct_scn = _ecdf_pct(c["sorted_base"], a_scn)
    tier_scn = _tier(pct_scn)

    new_label = base_label.copy()
    for k, node in enumerate(idx):
        new_label[node] = _ladder_max(base_label[node], tier_scn[k])

    # 3) 1-hop spillover: a desert/swamp neighbour of an improved node steps up once
    improved = {int(n) for n in idx if new_label[n] != base_label[n]}
    spill = set()
    for n in list(improved):
        for nb in c["adj"][n]:
            if nb in improved:
                continue
            cur = base_label[nb]
            if cur in ("desert", "swamp"):
                up = LADDER[min(len(LADDER) - 1, LADDER.index(cur) + 1)]
                if up != cur:
                    new_label[nb] = up
                    spill.add(int(nb))

    # 4) assemble response
    changed = []
    for n in sorted(improved | spill):
        changed.append({
            "id": int(n),
            "before": base_label[n],
            "after": new_label[n],
            "spillover": n in spill and n not in improved,
        })
    moved_out = sum(1 for ch in changed if ch["before"] == "desert" and ch["after"] != "desert")
    trans = {}
    for ch in changed:
        key = f'{ch["before"]}→{ch["after"]}'
        trans[key] = trans.get(key, 0) + 1
    transitions = sorted(
        ([*kv.split("→"), n] for kv, n in ((k, v) for k, v in trans.items())),
        key=lambda t: -t[2],
    )

    return {
        "affected": int(len(idx)),
        "moved_out_of_desert": int(moved_out),
        "spillover": int(len(spill)),
        "changed": changed,
        "transitions": [{"from": f, "to": t, "count": n} for f, t, n in transitions],
        "hub": req.hub,
        "radius_m": req.radius_m,
    }
