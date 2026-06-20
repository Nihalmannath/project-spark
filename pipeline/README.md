# Food-environment node pipeline

Real road-intersection node export + the transfer/scenario inference service that
powers the **Transfer & Scenario** page.

## Data reality
The original transferable GraphSAGE checkpoint on disk
(`data visualisation/outputs/graphsage_foodenv.pt`) is **corrupted** (it is a PNG,
not a torch file), and the surviving checkpoints need a 38-feature rich set that
does not exist for a transfer city like Mysuru. So baseline node labels here come
from the **real published ward labels** (Bengaluru) and the **documented score
rule** on real OSM features (Mysuru) — the same deterministic methodology that
produced the thesis labels — plus 1-hop graph spillover that mimics GraphSAGE
neighbourhood smoothing. Fully real-data-backed and transparent.

## Setup
```bash
pip install -r requirements.txt          # torch already in the studio env
```

## 1. Export real nodes  → project-spark/public/data/
```bash
python export_nodes.py --city all        # bengaluru (offline) + mysuru (live OSM)
```
Produces `<city>_nodes.geojson` (client render), `<city>_graph.json`
(edges + features for the service), `<city>_meta.json`.

- **Bengaluru** (34,200 nodes): real BBMP road graph + OSM food points; baseline
  label = the published ward food-environment label each node falls in.
- **Mysuru** (19,116 nodes): road network fetched live from OSM via `osmnx`;
  baseline = documented access rule (projection, no local ground truth).

## 2. Run the inference service
```bash
uvicorn serve:app --host 0.0.0.0 --port 8000
```
- `GET  /api/health`            — liveness + available cities
- `GET  /api/meta/{city}`       — node/label counts, centre
- `POST /api/scenario/{city}`   — `{hub:[lon,lat], radius_m, d_food_800, ...}`
  applies notebook-04's intervention to the in-radius zone, re-scores against the
  fixed baseline ECDF, re-tiers, propagates 1-hop spillover, and returns the
  changed nodes + transition counts + `moved_out_of_desert`.

The React app reads `VITE_INFERENCE_URL` (default `http://localhost:8000`). The
baseline map still renders from the static GeoJSON when the service is offline;
only live scenario re-runs need it.
