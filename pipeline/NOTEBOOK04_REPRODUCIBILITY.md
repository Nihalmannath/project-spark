# Notebook 04 Reproducibility Record

## Canonical model

Mysuru's primary public layer is the two-layer GraphSAGE reconstruction used by thesis notebooks
03 and 04. It consumes the same eight within-city percentile features in both cities:

1. food outlets within 800 m and 1,500 m;
2. nearest-food distance;
3. road degree, mean rank, and maximum rank;
4. intersection density within 1 km; and
5. distance to a major road.

Bengaluru's published ward labels are broadcast to road nodes as training targets. Five spatial
ward-centroid zones provide held-out folds. Scaling is fitted inside each fold, class-balanced loss
is used during training, and seeds and deterministic Torch behavior are fixed.

## Calibration and abstention

Out-of-fold logits are temperature calibrated. The confidence threshold maximizes selective
macro-F1 while preserving at least 60% Bengaluru coverage. A node becomes `unknown` when calibrated
confidence is too low, normalized entropy is too high, or its joint feature vector exceeds the
Ledoit-Wolf Mahalanobis domain threshold.

The reconstruction is promoted only when spatial-CV macro-F1 is at least the notebook's historical
0.292 result, every class is predicted, and selective coverage remains at least 60%. Failure leaves
the deterministic proxy as primary.

## Scenario behavior

Notebook 04 changes food counts, nearest-food distance, and intersection density inside the chosen
radius. Every changed row is mapped against the fixed baseline Mysuru ECDF, then the full graph is
rerun. Nodes outside the radius may change only through actual GraphSAGE message passing; no manual
spillover ladder is used.

Affordability remains unavailable. Mirage and oasis are learned Bengaluru label patterns, not
Mysuru affordability observations. The 25-feature model and OSM quality proxy remain visible for
comparison and disagreement auditing.

## Commands

```bash
python pipeline/sync_thesis_notebooks.py
python pipeline/train_notebook_graphsage.py
python -m unittest discover -s pipeline/tests -v
```

The checkpoint SHA-256, training timestamp, fold metrics, calibration metrics, thresholds, target
OOD rate, abstention rate, and label counts are stored in `pipeline/models/` and city metadata.
