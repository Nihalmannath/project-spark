# Food-environment transfer pipeline

The pipeline builds matched OSM-only features for Bengaluru and Mysuru, evaluates a new GraphSAGE checkpoint, and promotes it only when every release gate passes. The deterministic Mysuru proxy remains the public fallback.

## Rebuild

```bash
pip install -r requirements.txt
python export_nodes.py --city all
python train_osm_graphsage.py
uvicorn serve:app --host 0.0.0.0 --port 8000
```

`export_nodes.py` uses the same 25-column schema in both cities: road structure; total, grocery, restaurant, fast-food, and cafe counts/distances; category shares and entropy; cuisine diversity; and OSM detail-tag coverage. OSM polygons use an interior representative point and metadata records extraction time and coverage.

`train_osm_graphsage.py` performs split-safe five-zone spatial CV, fold-local scaling, class-balanced training, temperature calibration, confidence/entropy abstention, and joint-feature domain-shift scoring. It writes a versioned checkpoint, metadata, and evaluation report under `pipeline/models/`, then annotates graph, GeoJSON, and city metadata artifacts.

The checkpoint is promoted only if macro-F1 ≥ 0.312, every class F1 ≥ 0.15, calibrated ECE ≤ 0.15, and selective coverage ≥ 60%. Failure leaves proxy labels primary while preserving candidate probabilities for audit.

## API

- `GET /api/health` reports model availability and promotion state.
- `GET /api/meta/{city}` returns coverage, checkpoint provenance, CV/calibration metrics, and label counts.
- `POST /api/scenario/{city}` recalculates affected features against fixed baseline ECDFs. A promoted model permits unrestricted graph-aware transitions; otherwise the endpoint returns conservative proxy transitions and evaluation-only candidate-model summaries.

## Tests

```bash
python -m unittest discover -s tests -v
```

See [OSM_GRAPHSAGE_TRANSFER.md](OSM_GRAPHSAGE_TRANSFER.md) and [MYSURU_PROXY_METHODOLOGY.md](MYSURU_PROXY_METHODOLOGY.md).
