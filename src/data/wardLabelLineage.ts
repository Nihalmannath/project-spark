import type { LabelKey } from "./labels";

export type LineagePolicy =
  | "target-and-local"
  | "target-only"
  | "predictor-only"
  | "adaptive-target";

export interface WardSourceLineage {
  id: string;
  source: string;
  files: string[];
  rawFields: string[];
  computedFields: string[];
  scoreDomains: string[];
  policy: LineagePolicy;
  policyDetail: string;
}

export interface ScoreTerm {
  label: string;
  weight: number;
  direction?: "higher" | "lower";
}

export interface WardScoreFormula {
  id: string;
  name: string;
  color: string;
  role: string;
  terms: ScoreTerm[];
  note?: string;
}

export interface WardLabelRule {
  order: number;
  labelKey: Exclude<LabelKey, "unknown">;
  condition: string;
  interpretation: string;
}

export interface FeaturePolicyGroup {
  title: string;
  reason: string;
  fields: string[];
}

export const WARD_LABEL_PIPELINE = [
  {
    number: "01",
    title: "Clean and locate",
    body: "Recover coordinates, remove duplicates, validate Bengaluru bounds, and standardise source fields.",
  },
  {
    number: "02",
    title: "Join to wards",
    body: "Spatially assign restaurants, groceries, canteens, menus, and social polygons to 198 BBMP wards.",
  },
  {
    number: "03",
    title: "Aggregate",
    body: "Create one auditable row per ward using estimated-population rates, medians, shares, distances, and entropy.",
  },
  {
    number: "04",
    title: "Normalise and score",
    body: "Convert indicators to city-relative 0–100 percentiles and combine them with fixed weights.",
  },
  {
    number: "05",
    title: "Label and audit",
    body: "Apply the ordered 40-point gates, then attach confidence, severity, failure, and missing-data metadata.",
  },
] as const;

export const WARD_SOURCE_LINEAGE: WardSourceLineage[] = [
  {
    id: "wards",
    source: "BBMP enriched ward geometry",
    files: ["bangalore_wards_enriched.geojson"],
    rawFields: [
      "WARD_NO / WARD_NAME / geometry",
      "POP_CENSUS_2011 / POP_EST_2026",
      "density_est_2026 / sc_st_share",
      "good_pct / capacity / ward_type / ward_dist_km",
      "base grocery and food-price fields",
    ],
    computedFields: [
      "ward_no, ward_name and polygon",
      "2011 census population, proportional estimated 2026 population and population_used_for_rates",
      "restaurant_per_10k and grocery_per_10k_final denominators",
      "density, SC/ST share, housing quality and service-capacity vulnerability components",
      "ward type, ward distance, public_market_flag and nearest_food_distance_km",
    ],
    scoreDomains: ["Access", "Affordability", "Vulnerability"],
    policy: "target-only",
    policyDetail:
      "Defines the administrative target unit and ward-scale denominators. Final ward fields are not copied into model predictors.",
  },
  {
    id: "zomato",
    source: "Zomato restaurants",
    files: ["zomato_restaurants.csv"],
    rawFields: [
      "Google Maps coordinate link",
      "cost_for_two / rating / review_count",
      "cuisines / menu reference",
      "delivery-only and closure signals",
    ],
    computedFields: [
      "restaurant_count and restaurant_per_10k",
      "median_cost_for_two and budget_restaurant_share",
      "restaurant_rating_mean and review_volume_median",
      "cuisine_entropy and healthy/unhealthy cuisine shares",
      "delivery_coverage_ratio",
    ],
    scoreDomains: ["Access", "Affordability", "Quality", "Stability"],
    policy: "target-and-local",
    policyDetail:
      "Ward aggregates help construct the target. Independently recomputed 800 m and 1,500 m node summaries may be predictors.",
  },
  {
    id: "reviews",
    source: "Zomato review dates",
    files: ["zomato_review_dates.csv"],
    rawFields: [
      "opening_hours",
      "permanently_closed",
      "earliest_review_date / latest_review_date",
      "review_date_count",
    ],
    computedFields: [
      "active_outlet_ratio",
      "opening_hours_completeness",
      "review_volume_median",
      "review_recency_days and review_span_days",
      "review_date_count_median",
    ],
    scoreDomains: ["Access", "Stability", "Confidence"],
    policy: "target-and-local",
    policyDetail:
      "Ward stability and completeness outputs are excluded; raw-derived local opening/review summaries can be used where available.",
  },
  {
    id: "swiggy",
    source: "Swiggy Dineout",
    files: ["swiggy_dineout.csv"],
    rawFields: ["latitude / longitude", "cost_for_two", "rating", "timings"],
    computedFields: [
      "additional restaurant coverage",
      "combined restaurant cost and rating summaries",
      "opening-hours completeness",
    ],
    scoreDomains: ["Access", "Affordability", "Quality", "Stability"],
    policy: "target-and-local",
    policyDetail:
      "Merged with Zomato for target construction; local radius-based restaurant features remain eligible predictors.",
  },
  {
    id: "grocery",
    source: "Google grocery and Instamart",
    files: ["supermarkets_enriched.csv"],
    rawFields: [
      "lat / lng / category",
      "rating / review_count / opening_hours",
      "area_basket_total / area_price_index",
      "Instamart coverage",
    ],
    computedFields: [
      "grocery_count_final and grocery_per_10k_final",
      "area_basket_total_median and area_price_index_median",
      "grocery rating/review/opening summaries",
      "fresh_grocery_category_share and instamart coverage",
    ],
    scoreDomains: ["Access", "Affordability", "Quality", "Stability"],
    policy: "target-and-local",
    policyDetail:
      "Ward counts/rates and final scores are excluded. Local grocery counts, prices, ratings, distance, and coverage can be predictors.",
  },
  {
    id: "menus",
    source: "Restaurant menu items",
    files: ["menu_items.csv"],
    rawFields: [
      "restaurant_url",
      "category / section / price",
      "protein_g / total_fat_g / added_sugar_g",
    ],
    computedFields: [
      "menu_category_entropy",
      "healthy_menu_share",
      "unhealthy_menu_share",
      "menu item counts",
    ],
    scoreDomains: ["Quality", "Data completeness"],
    policy: "target-and-local",
    policyDetail:
      "Ward quality outputs are excluded. Local menu entropy, item counts, and healthy/unhealthy shares can be predictors.",
  },
  {
    id: "indira",
    source: "Indira Canteens",
    files: ["00_indira-canteen-locations-2022.kml", "01_indira-canteens-list-2023.csv"],
    rawFields: ["canteen point geometry", "canteen name", "CSV citation/row-count backup"],
    computedFields: [
      "indira_canteen_count",
      "indira_canteen_per_10k",
      "nearest_indira_canteen_km",
      "subsidized_food_access_score",
    ],
    scoreDomains: ["Audit only"],
    policy: "target-only",
    policyDetail:
      "Mitigation context only. It does not make a ward an oasis, does not enter the label gates, and is not a model predictor.",
  },
  {
    id: "slums",
    source: "BBMP/Bengaluru slum polygons",
    files: ["03_bbmp-bengaluru-slums-map.geojson"],
    rawFields: ["Slum_Name / Slum_Type", "polygon geometry"],
    computedFields: [
      "slum_polygon_count",
      "slum_area_m2 and slum_area_share",
      "slum_presence_flag",
      "slum_exposure_score",
    ],
    scoreDomains: ["Vulnerability"],
    policy: "target-only",
    policyDetail:
      "Contributes only through the label-side vulnerability index; excluded from transferable predictors without a comparable target-city layer.",
  },
  {
    id: "osm",
    source: "OpenStreetMap roads and sparse food POIs",
    files: ["bangalore_road_rank.geojson", "osm_food_retail.csv"],
    rawFields: ["road geometry / road rank", "OSM food and retail points"],
    computedFields: [
      "road degree, rank and intersection density",
      "road-segment edges and distances",
      "food counts within 800 m / 1,500 m",
      "nearest-food distance",
    ],
    scoreDomains: ["Model inputs"],
    policy: "predictor-only",
    policyDetail:
      "Builds the graph and transferable node predictors. These fields do not construct the published ward label.",
  },
  {
    id: "adaptive",
    source: "Food-access hex and grid layers",
    files: ["bangalore_access_hex.geojson", "food_access_grid.geojson"],
    rawFields: [
      "population / nearest-food distance / 2SFCA",
      "food count / rating / mean cost / diversity",
      "grid food-access score",
    ],
    computedFields: [
      "1,012 adaptive units from 1,496 source hexes",
      "adaptive access, affordability, quality and stability scores",
      "adaptive label, confidence, margin and severity",
    ],
    scoreDomains: ["Notebook 08 target"],
    policy: "adaptive-target",
    policyDetail:
      "Constructs the separate local target. Its label, final scores, confidence, identifiers, and ward-boundary context are blocked from predictors.",
  },
];

export const WARD_SCORE_FORMULAS: WardScoreFormula[] = [
  {
    id: "access",
    name: "Access score",
    color: "var(--color-desert)",
    role: "Hard label gate 1",
    terms: [
      { label: "Groceries per 10k", weight: 30, direction: "higher" },
      { label: "Restaurants per 10k", weight: 25, direction: "higher" },
      { label: "Opening completeness", weight: 15, direction: "higher" },
      { label: "Nearest-food distance", weight: 15, direction: "lower" },
      { label: "Delivery coverage", weight: 5, direction: "higher" },
      { label: "Public-market flag", weight: 10, direction: "higher" },
    ],
  },
  {
    id: "affordability",
    name: "Affordability score",
    color: "var(--color-mirage)",
    role: "Hard label gate 2",
    terms: [
      { label: "Restaurant price", weight: 35, direction: "lower" },
      { label: "Grocery basket", weight: 30, direction: "lower" },
      { label: "Budget restaurant share", weight: 15, direction: "higher" },
      { label: "Income proxy (100 − vulnerability)", weight: 20, direction: "higher" },
    ],
  },
  {
    id: "quality",
    name: "Quality / diversity",
    color: "var(--color-swamp)",
    role: "Hard label gate 3",
    terms: [
      { label: "Cuisine entropy", weight: 25, direction: "higher" },
      { label: "Menu entropy", weight: 20, direction: "higher" },
      { label: "Healthy share", weight: 20, direction: "higher" },
      { label: "Fresh-grocery share", weight: 15, direction: "higher" },
      { label: "Rating", weight: 10, direction: "higher" },
      { label: "Unhealthy share", weight: 10, direction: "lower" },
    ],
  },
  {
    id: "stability",
    name: "Stability score",
    color: "var(--color-oasis)",
    role: "Confidence, not a hard gate",
    terms: [
      { label: "Active outlets", weight: 25, direction: "higher" },
      { label: "Opening completeness", weight: 20, direction: "higher" },
      { label: "Review volume", weight: 20, direction: "higher" },
      { label: "Review recency", weight: 15, direction: "lower" },
      { label: "Review span", weight: 10, direction: "higher" },
      { label: "Review-date count", weight: 10, direction: "higher" },
    ],
  },
  {
    id: "vulnerability",
    name: "Vulnerability index",
    color: "var(--color-slate)",
    role: "Affordability modifier",
    terms: [
      { label: "SC/ST share", weight: 20, direction: "higher" },
      { label: "Housing deprivation", weight: 20, direction: "higher" },
      { label: "Density / crowding", weight: 15, direction: "higher" },
      { label: "Service-capacity deprivation", weight: 25, direction: "higher" },
      { label: "Slum exposure", weight: 20, direction: "higher" },
    ],
    note: "This index runs in the opposite semantic direction: 100 means more vulnerable.",
  },
];

export const WARD_LABEL_RULES: WardLabelRule[] = [
  {
    order: 1,
    labelKey: "desert",
    condition: "access_score < 40",
    interpretation: "Physical access fails first; later gates are not evaluated.",
  },
  {
    order: 2,
    labelKey: "mirage",
    condition: "else affordability_score < 40",
    interpretation: "Food exists, but local prices fail the affordability threshold.",
  },
  {
    order: 3,
    labelKey: "swamp",
    condition: "else quality_diversity_score < 40",
    interpretation: "Access and affordability pass, but composition or diversity fails.",
  },
  {
    order: 4,
    labelKey: "oasis",
    condition: "else all three core scores ≥ 40",
    interpretation: "Access, affordability, and quality/diversity all pass.",
  },
];

export const EXCLUDED_FEATURE_GROUPS: FeaturePolicyGroup[] = [
  {
    title: "Target identity",
    reason: "These are the supervised answer, not evidence available to the model.",
    fields: ["label_*", "target_label_*", "ward_label_*"],
  },
  {
    title: "Final target scores",
    reason: "The hard class is deterministically computed from these fields.",
    fields: [
      "access_score",
      "affordability_score",
      "quality_diversity_score",
      "stability_score",
      "vulnerability_index",
    ],
  },
  {
    title: "Ward-scale label ingredients",
    reason: "Copied ward aggregates sit too close to the label-generation rule.",
    fields: ["restaurant_per_10k", "grocery_per_10k_final"],
  },
  {
    title: "Confidence and audit outputs",
    reason:
      "These fields are derived after the label and would encode target certainty or failure mode.",
    fields: [
      "label_confidence_score",
      "label_train_weight",
      "label_severity",
      "failure_count / failure_profile",
      "boundary_margin / is_borderline",
      "primary_reason / secondary_failure",
      "grey_zone_flags / missing_flags",
    ],
  },
  {
    title: "Adaptive-target structure",
    reason: "Notebook 08 blocks identifiers and context that reveal the local target assignment.",
    fields: [
      "adaptive_hex_id / adaptive_join_status",
      "adaptive score and label fields",
      "boundary_conflict_rate",
      "boundary_label_entropy",
      "nearest_diff_label_km",
    ],
  },
];

export const ALLOWED_FEATURE_GROUPS: FeaturePolicyGroup[] = [
  {
    title: "Road structure",
    reason: "Computed from the OSM graph independently of the ward target.",
    fields: ["road_degree", "road_rank_*", "inter_density_*", "major_road_dist_km"],
  },
  {
    title: "Local access",
    reason: "Recomputed around each road node instead of copying the ward aggregate.",
    fields: ["restaurant_*m", "grocery_*m", "nearest_restaurant_km", "nearest_grocery_km"],
  },
  {
    title: "Local affordability and quality",
    reason: "Radius-based summaries retain local evidence without exposing the final score.",
    fields: [
      "restaurant_cost_median_*m",
      "grocery_basket_median_*m",
      "restaurant_rating_mean_*m",
      "menu_entropy_mean_*m",
      "healthy_menu_share_mean_*m",
    ],
  },
  {
    title: "Boundary context — ward-target only",
    reason:
      "Intentionally included and ablated in 03b/03c/03h; explicitly removed for Notebook 08.",
    fields: ["boundary_conflict_rate", "boundary_label_entropy", "nearest_diff_label_km"],
  },
];

export const NORMALISATION_NOTES = [
  "Most indicators are ranked against the Bengaluru ward distribution: higher-is-better fields use the percentile directly; lower-is-better fields reverse it.",
  "Every score is clipped to 0–100. Missing score ingredients contribute a neutral 50 and create an auditable missing-data flag.",
  "Per-capita rates use the proportional 2026 population estimate derived from the 2011 census baseline; it is explicitly marked as estimated, not an official census count.",
  "Indira Canteens remain a separate mitigation/audit signal and never upgrade a ward through the four hard label gates.",
] as const;

export const CONFIDENCE_FIELDS = [
  {
    field: "boundary_margin",
    definition: "Minimum absolute distance of the three core scores from the 40 threshold.",
  },
  {
    field: "is_borderline",
    definition: "True when boundary_margin < 5; a small data change could flip the class.",
  },
  {
    field: "label_confidence_score",
    definition: "45% margin + 25% stability + 15% completeness + 15% grey-zone component.",
  },
  {
    field: "label_train_weight",
    definition: "0.25 + 0.75 × confidence; used only as a loss/sample weight, never as X.",
  },
  {
    field: "missing_flags / grey_zone_flags",
    definition:
      "Names unavailable ingredients and weak-evidence conditions so uncertainty remains auditable.",
  },
  {
    field: "severity / failure profile",
    definition: "Records depth below the deciding gate and every core domain below 40.",
  },
] as const;
