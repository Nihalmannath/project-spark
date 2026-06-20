# Mysuru OSM projection methodology

## Scope

This deterministic method is the public fallback whenever the matched OSM-only GraphSAGE candidate fails a promotion gate. It is also retained as an explanation layer when a future checkpoint is promoted.

## OSM extraction and tag mapping

The export uses `osmnx` with the place query `Mysuru, Karnataka, India` and the drive network. Food features use these mappings:

| Proxy category | OSM tags |
| --- | --- |
| Grocery | `shop=supermarket`, `grocery`, `convenience`, `greengrocer`; `amenity=marketplace` |
| Restaurant | `amenity=restaurant` |
| Fast food | `amenity=fast_food` |
| Cafe | `amenity=cafe` |

Point and polygon features are represented by a point on their surface. Cuisine values are split on semicolons and commas and normalized to lowercase tokens. The exact extraction run timestamp and global tag coverage are stored in `mysuru_meta.json`.

## Access

For each road node, the pipeline retains food counts within 800 m and 1,500 m and distance to the nearest food POI. The raw access composite is:

```text
log1p(food_800m) + 0.5 × log1p(food_1500m) + 2 × log1p(1 / max(nearest_food_km, 0.05))
```

Nodes are ranked within Mysuru using average ranks for ties. An access percentile below 40 is labelled `desert`.

## Quality/diversity proxy

Nearby OSM features within 1,500 m produce five 0–100 components:

- normalized Shannon diversity across the four proxy categories;
- cuisine-tag diversity, saturating at five unique cuisine tokens;
- grocery share;
- inverse fast-food share;
- category coverage, measured as the share of the four categories present.

The proxy score is:

```text
0.25 × category diversity
+ 0.20 × cuisine diversity
+ 0.25 × grocery share
+ 0.20 × (100 − fast-food share)
+ 0.10 × category coverage
```

At least five nearby POIs and 80% recognized category coverage are required. Otherwise `quality` is `null` and the evidence is insufficient. With adequate access and sufficient proxy evidence, a proxy score below 40 is labelled `swamp` with `evidence_level="proxy"` and explicit risk flags.

## Conservative class policy

| Condition | Mysuru label |
| --- | --- |
| Access percentile < 40 | `desert` |
| Access adequate, sufficient quality proxy < 40 | `swamp` (proxy risk) |
| Access adequate, proxy insufficient or ≥ 40 | `unknown` |
| Any condition requiring affordability | Not classified |

Mysuru never generates `mirage` or `oasis`, because local affordability evidence is unavailable. Unknown is intentional and is reported in GeoJSON, graph data, metadata, legends, and API transitions.

## Scenario semantics

Generic added outlets update food counts, nearest-food distance, and access percentile only. Existing swamp risk is unchanged unless categorized evidence is supplied. The fallback does not fabricate learned graph spillover.

An intervention may explicitly provide a healthy/diverse outlet category and cuisine mix. Only then is the quality proxy recomputed for directly affected nodes. A proxy swamp can become unknown if its proxy score clears the threshold, but it cannot become oasis while affordability remains unavailable.

## Limitations

- OSM completeness and tagging vary spatially and over time.
- Category and cuisine tags are not observations of nutrition, price, household affordability, service quality, or actual shopping behaviour.
- Within-city percentiles are relative and do not establish an absolute access standard.
- The thresholds and weights are transparent screening assumptions, not locally validated causal parameters.
- Scenario additions represent assumed outlet mixes; they do not predict commercial viability or resident uptake.

## Provenance

The road graph and food features come from OpenStreetMap through `osmnx`. Node access features reuse the thesis `gnn_features.py` implementation. Export code, proxy version, extraction timestamp, counts, and thresholds are embedded in the generated metadata so artifacts can be audited together.
