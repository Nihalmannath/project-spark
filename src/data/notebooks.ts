import type { LabelKey } from "./labels";

export interface NotebookFeatureGroup {
  group: string;
  count: number;
  examples: string[];
}

export interface NotebookRecord {
  id: string;
  number: string;
  title: string;
  file: string;
  tagline: string;
  what: string;
  whyItMatters: string;
  targetType: "ward-broadcast" | "adaptive-local";
  nodes: number;
  edges?: number;
  featureCount: number;
  rawSources: { name: string; detail: string }[];
  featureGroups: NotebookFeatureGroup[];
  correlationPolicy: string;
  model: string;
  metrics: {
    macroF1: number;
    accuracy?: number;
    perClassF1?: Partial<Record<LabelKey, number>>;
  };
  keyFindings: string[];
  delta?: string;
  isHeadline?: boolean;
}

export const NOTEBOOKS: NotebookRecord[] = [
  {
    id: "03",
    number: "03",
    title: "Baseline — OSM + road features only",
    file: "03_graphsage_road_nodes.ipynb",
    tagline: "The starting point. Free data only, no commercial enrichment.",
    what:
      "Builds the road graph from OpenStreetMap, assigns ward labels to each road intersection, and trains a basic GraphSAGE model using only freely available road geometry and sparse OSM food data. Sets the performance floor.",
    whyItMatters:
      "Establishes the floor and isolates how much signal the raw road network alone carries.",
    targetType: "ward-broadcast",
    nodes: 31645,
    edges: 61908,
    featureCount: 8,
    rawSources: [
      { name: "bangalore_road_rank.geojson", detail: "Road segments + rank" },
      { name: "osm_food_retail.csv", detail: "2,487 OSM food shops (sparse, crowd-sourced)" },
      { name: "ward_food_environment_labels.geojson", detail: "4-label ward targets" },
    ],
    featureGroups: [
      {
        group: "Road structure",
        count: 5,
        examples: ["road_degree", "road_rank_mean", "road_rank_max", "inter_density_1km", "major_road_dist_km"],
      },
      {
        group: "OSM food",
        count: 3,
        examples: ["food_800m", "food_1500m", "nearest_food_km"],
      },
    ],
    correlationPolicy: "Not applied — too few features (8) to need pruning.",
    model: "2-layer GraphSAGE, 64 hidden units, mean aggregation, ward-blocked 5-fold spatial CV.",
    metrics: { macroF1: 0.292 },
    keyFindings: [
      "OSM food data is too sparse and noisy for reliable prediction.",
      "Model recognises road structure but can't distinguish food environments well.",
      "Beats majority-class baseline (~0.15) but limited by input data quality.",
    ],
  },
  {
    id: "03b",
    number: "03b",
    title: "Rich features from credible sources",
    file: "03b_graphsage_rich_raw_features.ipynb",
    tagline: "Replace sparse OSM with Zomato, Swiggy, Google grocery, menus.",
    what:
      "Replaces sparse OSM with richer data from Zomato, Swiggy, Google (grocery), and menu items. Introduces boundary uncertainty features for nodes near ward borders.",
    whyItMatters: "Tests whether better data, holding architecture fixed, raises the ceiling.",
    targetType: "ward-broadcast",
    nodes: 31645,
    edges: 113000,
    featureCount: 39,
    rawSources: [
      { name: "zomato_restaurants.csv", detail: "3,680 restaurants — rating, cost, cuisines" },
      { name: "swiggy_dineout.csv", detail: "798 restaurants" },
      { name: "supermarkets_enriched.csv", detail: "8,656 groceries — rating, basket cost, Instamart" },
      { name: "menu_items.csv", detail: "231,395 items — protein, fat, sugar" },
    ],
    featureGroups: [
      { group: "Road structure", count: 5, examples: ["road_degree", "inter_density_1km", "major_road_dist_km"] },
      { group: "OSM (comparison only)", count: 5, examples: ["osm_food_800m", "osm_nearest_food_km"] },
      { group: "Restaurants 1,500 m", count: 11, examples: ["restaurant_1500m", "restaurant_cost_median_1500m", "healthy_cuisine_share_1500m"] },
      { group: "Menu nutrition", count: 5, examples: ["healthy_menu_share_mean_1500m", "menu_entropy_mean_1500m"] },
      { group: "Grocery 1,500 m", count: 8, examples: ["grocery_basket_median_1500m", "instamart_ok_share_1500m"] },
      { group: "Boundary uncertainty", count: 3, examples: ["boundary_conflict_rate", "boundary_label_entropy", "nearest_diff_label_km"] },
    ],
    correlationPolicy: "Per-fold Random Forest importance + Pearson r > 0.9 pruning against the more important feature.",
    model: "2-layer GraphSAGE, focal loss (γ=2.0), per-node sample weights.",
    metrics: { macroF1: 0.458, accuracy: 0.535 },
    delta: "+0.166 macro-F1 over the OSM-only baseline.",
    keyFindings: [
      "Credible commercial data dramatically improves prediction.",
      "Largest single jump in the entire progression.",
      "Model now captures food quality and affordability signals.",
    ],
  },
  {
    id: "03c",
    number: "03c",
    title: "Weighted road edges",
    file: "03c_graphsage_weighted_edges.ipynb",
    tagline: "Should some roads count more than others?",
    what:
      "Keeps the same 36 rich features but tests four edge-weighting strategies: uniform, inverse road length, road rank, and combined.",
    whyItMatters: "Isolates whether the graph's message-passing benefits from physical road geometry.",
    targetType: "ward-broadcast",
    nodes: 31645,
    edges: 113000,
    featureCount: 36,
    rawSources: [{ name: "graphsage_rich_node_features.csv", detail: "Reused from 03b" }],
    featureGroups: [
      { group: "All 03b features", count: 36, examples: ["road_*", "restaurant_*", "menu_*", "grocery_*", "boundary_*"] },
    ],
    correlationPolicy: "Fixed feature set from 03b; no new pruning.",
    model:
      "2-layer WeightedFoodSAGE comparing uniform, road_distance_inv, road_rank, and road_rank_distance edge variants.",
    metrics: { macroF1: 0.506, accuracy: 0.556 },
    delta: "+0.048 macro-F1 from edge weighting (inverse distance wins).",
    keyFindings: [
      "Inverse road length (shorter roads = stronger link) is the best edge weight.",
      "Major-road weighting actually hurts — food access correlates with walkable local streets, not arterials.",
      "Remains the thesis headline model.",
    ],
    isHeadline: true,
  },
  {
    id: "03d",
    number: "03d",
    title: "Random Forest baseline — no graph",
    file: "03d_random_forest_baseline.ipynb",
    tagline: "How much does the graph actually buy us?",
    what:
      "Trains a Random Forest on the same 36 features with no graph, no neighbour aggregation. Each node is classified independently. Per-fold importance + correlation pruning retains ~18 features.",
    whyItMatters: "Measures the graph's contribution above strong tabular features.",
    targetType: "ward-broadcast",
    nodes: 31645,
    featureCount: 36,
    rawSources: [{ name: "graphsage_rich_node_features.csv", detail: "Reused from 03b" }],
    featureGroups: [
      { group: "All 03b features (pruned per fold)", count: 18, examples: ["inter_density_800m", "major_road_dist_km", "grocery_review_median", "restaurant_rating_mean", "menu_items_sum"] },
    ],
    correlationPolicy:
      "Explicit: train RF (500 trees), extract importances, drop any feature with r > 0.9 against a more important one. ~18 retained per fold.",
    model: "Random Forest, 500 trees, balanced class weights, max_features = √n.",
    metrics: { macroF1: 0.427, accuracy: 0.536 },
    delta: "GraphSAGE 03b adds +0.031 macro-F1 over this tabular baseline.",
    keyFindings: [
      "Most signal comes from the features themselves.",
      "The graph adds about 3 F1 points — useful but not dominant.",
      "Training accuracy 0.998 confirms the forest is memorising (expected).",
    ],
  },
  {
    id: "03e",
    number: "03e",
    title: "Local 800 m — walkable radius",
    file: "03e_graphsage_local_800m.ipynb",
    tagline: "Can a 10-minute walk explain food environment?",
    what:
      "Recomputes features within 800 m only (≈10-min walk) using credible sources. Drops OSM and boundary features. Average of 22 restaurants per node.",
    whyItMatters: "Real-world applicability — can prediction work at a walkable scale?",
    targetType: "ward-broadcast",
    nodes: 31645,
    edges: 113586,
    featureCount: 28,
    rawSources: [
      { name: "zomato_restaurants.csv", detail: "3,680" },
      { name: "swiggy_dineout.csv", detail: "798" },
      { name: "supermarkets_enriched.csv", detail: "9,043" },
      { name: "menu_items.csv", detail: "231,395" },
    ],
    featureGroups: [
      { group: "Road", count: 5, examples: ["inter_density_800m"] },
      { group: "Restaurants 800 m", count: 15, examples: ["restaurant_800m", "healthy_cuisine_share_800m"] },
      { group: "Grocery 800 m", count: 7, examples: ["grocery_basket_median_800m"] },
      { group: "Combined", count: 1, examples: ["all_food_800m"] },
    ],
    correlationPolicy: "Per-fold RF importance + r > 0.9 pruning. ~18 features selected.",
    model: "2-layer GraphSAGE, same training setup as 03c.",
    metrics: { macroF1: 0.464, accuracy: 0.534 },
    delta: "Matches the 1,500 m result despite a much smaller radius.",
    keyFindings: [
      "Graph aggregation propagates neighbourhood context even from 800 m features.",
      "Food desert is a neighbourhood-scale concept — graph carries the signal.",
      "Only 2 isolated nodes (0.006 %) — excellent connectivity.",
    ],
  },
  {
    id: "03f",
    number: "03f",
    title: "Hyper-local 200 m features",
    file: "03f_graphsage_local_200m.ipynb",
    tagline: "The doorstep limit.",
    what:
      "Pushes radius to 200 m (≈2-min walk). 57.5 % of nodes see zero restaurants. Tests the lower bound of hyper-local prediction.",
    whyItMatters:
      "Defines where the feature signal collapses — useful to know what scale of decision a model can actually inform.",
    targetType: "ward-broadcast",
    nodes: 31645,
    edges: 107718,
    featureCount: 28,
    rawSources: [{ name: "same credible sources as 03e", detail: "200 m radius" }],
    featureGroups: [
      { group: "Same as 03e at 200 m", count: 28, examples: ["restaurant_200m", "grocery_200m"] },
    ],
    correlationPolicy: "Per-fold pruning; distance-to-nearest features dominate.",
    model: "2-layer GraphSAGE.",
    metrics: { macroF1: 0.379, accuracy: 0.461, perClassF1: { swamp: 0.12 } },
    keyFindings: [
      "200 m is too sparse — most nodes see no restaurants.",
      "Swamp F1 collapses to 0.12.",
      "Confirms the food-environment label is genuinely neighbourhood-scale, not doorstep-scale.",
    ],
  },
  {
    id: "03g",
    number: "03g",
    title: "Multiscale architecture audit",
    file: "03g_graphsage_multiscale_architecture.ipynb",
    tagline: "Does a fancier architecture beat the simple model?",
    what:
      "Combines 800 m local + 1,500 m context features (66 total) and tests Residual + Jumping Knowledge variants against the 03c control.",
    whyItMatters: "An honest architecture audit — a defensible negative result.",
    targetType: "ward-broadcast",
    nodes: 31645,
    edges: 113878,
    featureCount: 66,
    rawSources: [
      { name: "graphsage_rich_node_features.csv", detail: "1,500 m features" },
      { name: "rebuilt 800 m features", detail: "Zomato, Swiggy, Google grocery, menus" },
    ],
    featureGroups: [
      { group: "context1500 (38)", count: 38, examples: ["context1500__restaurant_1500m"] },
      { group: "local800 (28)", count: 28, examples: ["local800__restaurant_800m"] },
    ],
    correlationPolicy: "Fixed sets from prior notebooks; leakage fields excluded by name.",
    model:
      "Compared control_03c_uniform, residual_jk_1500, multiscale_800_1500, and multiscale_no_boundary. Multiscale saved for improved swamp F1.",
    metrics: { macroF1: 0.535, accuracy: 0.581, perClassF1: { desert: 0.47, swamp: 0.401 } },
    keyFindings: [
      "Simple 03c control re-run topped the leaderboard (0.535) — complex architecture didn't win.",
      "Multiscale helps swamp detection (+0.036 F1).",
      "Residual + Jumping Knowledge variants underperformed — well-tuned simple > complex.",
    ],
  },
  {
    id: "03h",
    number: "03h",
    title: "Feature engineering + Moran's I audit",
    file: "03h_graphsage_feature_engineered_moran_audit.ipynb",
    tagline: "Better engineered features, with explicit spatial-autocorrelation audit.",
    what:
      "Builds 109 engineered features grouped into multiscale access, affordability, quality/diversity, stability, and boundary uncertainty. Audits each with Global Moran's I + permutation p-values + FDR-adjusted q-values.",
    whyItMatters:
      "Defends the thesis on spatial-autocorrelation grounds; targets food-swamp improvements specifically.",
    targetType: "ward-broadcast",
    nodes: 31645,
    featureCount: 109,
    rawSources: [{ name: "same as 03c + Moran's I audit pipeline", detail: "" }],
    featureGroups: [
      { group: "Multiscale access", count: 22, examples: ["restaurant_log_400m_to_1500m_ratio"] },
      { group: "Affordability", count: 18, examples: ["budget_share_price_spread"] },
      { group: "Quality / diversity", count: 24, examples: ["cuisine_entropy_review_weighted"] },
      { group: "Stability / data quality", count: 22, examples: ["instamart_coverage_share", "opening_hours_completeness"] },
      { group: "Boundary uncertainty", count: 8, examples: ["boundary_conflict_rate", "boundary_label_entropy"] },
    ],
    correlationPolicy:
      "Combined correlation (|r| > 0.9) + spatial-autocorrelation pruning with RF importance tie-break. 27 dropped → 82 retained.",
    model: "Same 2-layer GraphSAGE backbone as 03c.",
    metrics: { macroF1: 0.509, accuracy: 0.549, perClassF1: { desert: 0.431, swamp: 0.398 } },
    delta: "+0.003 macro-F1 and +0.028 swamp F1 vs. published 03c.",
    keyFindings: [
      "Engineered features with boundary uncertainty beat 03c on macro-F1 and swamp F1.",
      "Removing boundary or aggressively pruning reduces performance — boundary uncertainty matters.",
      "Moran's I confirms spatial autocorrelation is real — treat as audit signal, not auto-drop.",
    ],
  },
  {
    id: "08",
    number: "08",
    title: "Adaptive hex target accuracy pipeline",
    file: "08_adaptive_hex_target_pipeline.ipynb",
    tagline: "What if the ward label was the ceiling all along?",
    what:
      "Redefines the target from ward-broadcast labels to local adaptive hex / catchment labels. 1,012 adaptive units from 1,496 source hexes. Tests RF, ExtraTrees, HGB, and GraphSAGE.",
    whyItMatters:
      "Tests whether the 03-series ceiling was an architecture problem or a label-geography problem. New target — reported separately.",
    targetType: "adaptive-local",
    nodes: 31645,
    featureCount: 48,
    rawSources: [
      { name: "bangalore_access_hex.geojson", detail: "1,496 food-access hexes + 2SFCA, desert flag" },
      { name: "food_access_grid.geojson", detail: "2,031 grid cells" },
      { name: "graphsage_rich_node_features.csv", detail: "31,645 road-node features" },
    ],
    featureGroups: [
      { group: "Non-leakage predictors", count: 48, examples: ["restaurant_count", "grocery_basket_median", "menu_entropy_mean"] },
    ],
    correlationPolicy:
      "Explicit leakage guard — labels, scores, confidence/severity, and ward-boundary fields all excluded.",
    model:
      "Random Forest, Extra Trees, Histogram Gradient Boosting, and 2-layer GraphSAGE. Gradient Boosting wins on the high-confidence split.",
    metrics: {
      macroF1: 0.783,
      accuracy: 0.939,
      perClassF1: { desert: 0.555, oasis: 0.988, mirage: 0.614, swamp: 0.755 },
    },
    delta: "New target — not directly comparable to 03-series.",
    keyFindings: [
      "Label geography matters: local catchment labels are easier than broadcast ward labels.",
      "Gradient Boosting beats GraphSAGE on local-aligned targets — smoothing hurts sharp local rules.",
      "GraphSAGE still useful as a spatial audit model.",
      "Report alongside 03c, not as its replacement.",
    ],
    isHeadline: true,
  },
];

export function getNotebook(id: string): NotebookRecord | undefined {
  return NOTEBOOKS.find((n) => n.id === id);
}
