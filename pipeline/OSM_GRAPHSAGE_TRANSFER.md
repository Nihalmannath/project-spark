# OSM-only GraphSAGE transfer

## Purpose and evidence boundary

The model estimates how Bengaluru's published ward classes map onto road and OSM food patterns that can be reproduced in Mysuru. It does not create Mysuru ground truth. In particular, a predicted mirage or oasis is a learned class pattern—not evidence that local affordability was observed.

## Canonical schema

Both cities use the same ordered 25 features:

- Road degree, mean/max highway rank, 1 km intersection density, and distance to a major road.
- Total food POI counts within 800 m and 1,500 m, plus nearest distance.
- Grocery, restaurant, fast-food, and cafe counts within both radii and nearest distance for each category.
- Grocery share, fast-food share, category entropy, cuisine diversity, and detail-tag coverage within 1,500 m.

Highway tags map to a stable 1–6 hierarchy from service/residential to motorway. Food tags use the mappings documented in the proxy methodology. Each feature becomes an average-rank within-city percentile before fold-local standardization.

No label-derived scores, commercial restaurant platforms, prices, ratings, menus, Instamart fields, or Bengaluru boundary-label features enter this schema.

## Training and validation

Bengaluru ward labels are broadcast to road nodes. Wards are grouped into five geographic zones using ward-centroid clustering. For each outer holdout zone, validation wards are removed from the remaining zones and train, validation, and test graphs are induced separately so message passing cannot cross split boundaries.

The model is a two-layer mean-aggregation GraphSAGE network with 64 hidden units, dropout, class-balanced cross entropy, Adam optimization, and validation macro-F1 early stopping. Scaling is fitted on each training fold only. A final checkpoint is trained on all labelled Bengaluru nodes for the median selected epoch count.

Out-of-fold logits are temperature-calibrated. The confidence threshold maximizes selective macro-F1 while retaining at least 62% pre-gate coverage. High predictive entropy and robust Mahalanobis feature-domain outliers abstain to `unknown`.

## Promotion gates

The model becomes Mysuru's primary label source only when all of these pass:

- Spatial-CV macro-F1 ≥ 0.312.
- Every class F1 ≥ 0.15.
- Calibrated expected calibration error ≤ 0.15.
- Final selective coverage ≥ 60%.

The current evaluation is intentionally allowed to fail. When it does, model probabilities, uncertainty, OOD scores, and proxy disagreement remain visible, but proxy labels stay primary.

## Scenario behavior

Generic outlets change total food counts and nearest distance. Categorized interventions additionally change category counts/distances, shares, entropy, cuisine diversity, and detail-tag coverage. Features are scored against the fixed baseline Mysuru ECDF before inference.

A promoted checkpoint may make any class transition and may affect connected neighbours through GraphSAGE message passing. An unpromoted checkpoint never controls public transitions; the service uses the conservative proxy fallback and reports candidate-model transition summaries separately.

## Artifacts and provenance

The checkpoint contains the state dictionary, feature order, scaler, temperature, abstention thresholds, OOD detector, promotion result, metrics, seed, epoch count, and training-target statement. A companion JSON records the SHA-256 hash and human-readable evaluation. City metadata embeds the same version and hash so stale or mismatched artifacts fail closed.
