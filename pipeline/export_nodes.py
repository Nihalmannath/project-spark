"""Export REAL road-intersection nodes for the food-environment transfer UI.

Bengaluru (evidence city):
  - real road graph from DATA/boundaries/bangalore_road_rank.geojson (61,908 segments)
  - 8 transferable OSM features per node (gnn_features.compute_features)
  - baseline label = the REAL published ward label the node falls in
    (data visualisation/outputs/ward_food_environment_labels.geojson) — exactly how
    notebook 03 assigns node labels.

Mysuru (transfer/projection city):
  - real road graph fetched live from OSM via osmnx (cache was lost)
  - same 8 transferable features (food points from OSM groceries/food)
  - baseline label = documented score rule on within-Mysuru access percentile
    (affordability/quality imputed neutral, per the thesis transfer caveat)

Writes to project-spark/public/data/:
  <city>_nodes.geojson   (id, lon, lat, label, ward, scores, 8 feats, confidence)
  <city>_graph.json      (edges + per-node access percentile + raw feats; server-side use)
  <city>_meta.json       (label counts, feature names, source provenance)
"""
from __future__ import annotations
import json, time, argparse
from pathlib import Path
import numpy as np
import pandas as pd
import geopandas as gpd

from common import THESIS_TO_KEY, access_percentile, load_thesis_features

ROOT = Path(__file__).resolve().parents[1]          # project-spark/
DATA = ROOT.parents[0] / "DATA"                      # PROTOTYPE/DATA
VIZ_OUT = ROOT.parents[1] / "data visualisation" / "outputs"
OUT = ROOT / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

G = load_thesis_features()
FEATS = G.FEATS  # 8 transferable features


def _round(x, n=5):
    return float(np.round(float(x), n))


def _node_records(coords, X, nxy):
    """common per-node feature dict (raw, pre-label)."""
    acc_pct = access_percentile(X[:, 0], X[:, 1], X[:, 2])
    recs = []
    for i in range(len(coords)):
        recs.append({
            "id": int(i),
            "lon": _round(coords[i, 0]),
            "lat": _round(coords[i, 1]),
            "food_800m": int(X[i, 0]),
            "food_1500m": int(X[i, 1]),
            "nearest_food_km": _round(X[i, 2], 3),
            "road_degree": int(X[i, 3]),
            "inter_density_1km": int(X[i, 6]),
            "access_pct": _round(acc_pct[i], 1),
        })
    return recs, acc_pct


def export_bengaluru():
    t0 = time.time()
    print("[blr] reading roads + food + ward labels …")
    roads = gpd.read_file(DATA / "boundaries" / "bangalore_road_rank.geojson").to_crs(4326)
    food = pd.read_csv(DATA / "grocery" / "osm_food_retail.csv").dropna(subset=["lat", "lon"])
    wards = gpd.read_file(VIZ_OUT / "ward_food_environment_labels.geojson").to_crs(4326)

    coords, E, R = G.build_graph(roads, "r")
    food_lonlat = food[["lon", "lat"]].to_numpy()
    X, nxy = G.compute_features(coords, E, R, food_lonlat)
    print(f"[blr] nodes={len(coords)} edges={len(E)}  ({time.time()-t0:.1f}s)")

    recs, acc_pct = _node_records(coords, X, nxy)

    # baseline label + scores via spatial join to REAL ward labels
    nodes_gdf = gpd.GeoDataFrame(
        {"node": np.arange(len(coords))},
        geometry=gpd.points_from_xy(coords[:, 0], coords[:, 1]),
        crs=4326,
    )
    keep = ["ward_name", "label_name", "access_score", "affordability_score",
            "quality_diversity_score", "label_confidence_score"]
    joined = gpd.sjoin(nodes_gdf, wards[keep + ["geometry"]], how="left", predicate="within")
    joined = joined[~joined.index.duplicated(keep="first")].reindex(range(len(coords)))

    counts = {}
    for i, r in enumerate(recs):
        lab = THESIS_TO_KEY.get(joined.loc[i, "label_name"], "unknown")
        r["label"] = lab
        r["ward"] = (joined.loc[i, "ward_name"] if pd.notna(joined.loc[i, "ward_name"]) else "—")
        r["access"] = _round((joined.loc[i, "access_score"] or 0) / 100, 2)
        r["affordability"] = _round((joined.loc[i, "affordability_score"] or 0) / 100, 2)
        r["quality"] = _round((joined.loc[i, "quality_diversity_score"] or 0) / 100, 2)
        conf = joined.loc[i, "label_confidence_score"]
        r["confidence"] = _round(conf if pd.notna(conf) else 0.6, 2)
        counts[lab] = counts.get(lab, 0) + 1

    _write(city="bengaluru", recs=recs, edges=E, acc_pct=acc_pct, counts=counts,
           center=[float(coords[:, 0].mean()), float(coords[:, 1].mean())],
           source="Real BBMP road graph + OSM food points; baseline = published ward labels (nb01/03).")
    print(f"[blr] label counts: {counts}")


def export_mysuru():
    t0 = time.time()
    print("[mys] fetching Mysuru road network from OSM via osmnx …")
    try:
        import osmnx as ox
        ox.settings.use_cache = True
        place = "Mysuru, Karnataka, India"
        Gx = ox.graph_from_place(place, network_type="drive", simplify=True)
        nodes_osm, edges_osm = ox.graph_to_gdfs(Gx)
        edges_osm = edges_osm.reset_index().to_crs(4326)
        roads = edges_osm[["geometry"]].copy()
        roads["r"] = 1.0  # uniform rank; OSM 'highway' could refine, kept simple/transferable
        # food/grocery points
        tags = {"shop": ["supermarket", "grocery", "convenience", "greengrocer"],
                "amenity": ["restaurant", "fast_food", "cafe", "marketplace"]}
        pois = ox.features_from_place(place, tags).to_crs(4326)
        pois = pois[pois.geometry.geom_type == "Point"]
        food_lonlat = np.c_[pois.geometry.x.values, pois.geometry.y.values]
        print(f"[mys] osm: {len(roads)} segments, {len(food_lonlat)} food points  ({time.time()-t0:.1f}s)")
    except Exception as e:
        print(f"[mys] OSM fetch FAILED ({type(e).__name__}: {e}). Skipping Mysuru — run with network.")
        return

    coords, E, R = G.build_graph(roads, "r")
    X, nxy = G.compute_features(coords, E, R, food_lonlat)
    print(f"[mys] nodes={len(coords)} edges={len(E)}")

    recs, acc_pct = _node_records(coords, X, nxy)
    # transfer projection: documented rule on within-city access percentile.
    # access<40 -> desert; else oasis (affordability/quality imputed neutral=50, per caveat).
    counts = {}
    for i, r in enumerate(recs):
        ap = acc_pct[i]
        lab = "desert" if ap < 40 else ("mirage" if ap < 55 else "oasis")
        r["label"] = lab
        r["ward"] = "Mysuru"
        r["access"] = _round(ap / 100, 2)
        r["affordability"] = 0.5
        r["quality"] = 0.5
        r["confidence"] = 0.45  # projection, no local ground truth
        counts[lab] = counts.get(lab, 0) + 1

    _write(city="mysuru", recs=recs, edges=E, acc_pct=acc_pct, counts=counts,
           center=[float(coords[:, 0].mean()), float(coords[:, 1].mean())],
           source="Real Mysuru OSM road graph + OSM food points; baseline = documented access rule (projection, no local labels).")
    print(f"[mys] label counts: {counts}")


def _write(city, recs, edges, acc_pct, counts, center, source):
    # GeoJSON (client render) — node points
    features = [{
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [r["lon"], r["lat"]]},
        "properties": {k: r[k] for k in r if k not in ("lon", "lat")},
    } for r in recs]
    fc = {"type": "FeatureCollection", "features": features}
    (OUT / f"{city}_nodes.geojson").write_text(json.dumps(fc))

    # graph (server-side scenario) — edges + raw feats needed for perturbation
    graph = {
        "n": len(recs),
        "edges": [[int(u), int(v)] for u, v in edges],
        "lonlat": [[r["lon"], r["lat"]] for r in recs],
        "food_800m": [r["food_800m"] for r in recs],
        "food_1500m": [r["food_1500m"] for r in recs],
        "nearest_food_km": [r["nearest_food_km"] for r in recs],
        "inter_density_1km": [r["inter_density_1km"] for r in recs],
        "access_pct": [r["access_pct"] for r in recs],
        "label": [r["label"] for r in recs],
    }
    (OUT / f"{city}_graph.json").write_text(json.dumps(graph))

    meta = {
        "city": city, "n_nodes": len(recs), "n_edges": len(edges),
        "center": center, "label_counts": counts, "feats": FEATS, "source": source,
    }
    (OUT / f"{city}_meta.json").write_text(json.dumps(meta, indent=2))
    print(f"[{city}] wrote nodes.geojson ({len(recs)}), graph.json ({len(edges)} edges), meta.json")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", choices=["bengaluru", "mysuru", "all"], default="all")
    args = ap.parse_args()
    if args.city in ("bengaluru", "all"):
        export_bengaluru()
    if args.city in ("mysuru", "all"):
        export_mysuru()
