// =====================================================================
// Platform fixtures — mirror the backend entity model.
// All metrics here are verified thesis outputs or marked as fixtures.
// Coming-soon cities deliberately carry NO predictions/metrics.
// =====================================================================

export type EvidenceState = "AVAILABLE" | "SCENARIO" | "COMING_SOON";
export type RunType = "LOCAL_MODEL" | "TRANSFER_PROJECTION" | "PLANNING_SCENARIO";

export interface City {
  id: string;
  display_name: string;
  osm_place_name: string;
  country: string;
  region: string;
  evidence_state: EvidenceState;
  data_readiness: number; // 0..1
  caveat: string;
  last_updated: string;
  center: [number, number]; // lon, lat
  zoom: number;
}

export const CITIES: City[] = [
  {
    id: "bengaluru",
    display_name: "Bengaluru",
    osm_place_name: "Bangalore, Karnataka, India",
    country: "India",
    region: "Karnataka",
    evidence_state: "AVAILABLE",
    data_readiness: 1.0,
    caveat: "Labels are proxy labels derived from adaptive catchments — not survey ground truth.",
    last_updated: "2026-05-12",
    center: [77.5946, 12.9716],
    zoom: 10.3,
  },
  {
    id: "mysuru",
    display_name: "Mysuru",
    osm_place_name: "Mysore, Karnataka, India",
    country: "India",
    region: "Karnataka",
    evidence_state: "SCENARIO",
    data_readiness: 0.62,
    caveat:
      "Projection using a frozen Bengaluru GraphSAGE checkpoint. No local ground-truth labels. Trust relative scenario change over absolute baseline class.",
    last_updated: "2026-06-04",
    center: [76.6394, 12.2958],
    zoom: 11.2,
  },
  {
    id: "pune",
    display_name: "Pune",
    osm_place_name: "Pune, Maharashtra, India",
    country: "India",
    region: "Maharashtra",
    evidence_state: "COMING_SOON",
    data_readiness: 0.18,
    caveat: "No verified model outputs. Predictions intentionally withheld.",
    last_updated: "—",
    center: [73.8567, 18.5204],
    zoom: 11,
  },
  {
    id: "coimbatore",
    display_name: "Coimbatore",
    osm_place_name: "Coimbatore, Tamil Nadu, India",
    country: "India",
    region: "Tamil Nadu",
    evidence_state: "COMING_SOON",
    data_readiness: 0.08,
    caveat: "No verified model outputs. Predictions intentionally withheld.",
    last_updated: "—",
    center: [76.9558, 11.0168],
    zoom: 11,
  },
];

// ---------------------------------------------------------------------
// Dataset readiness
// ---------------------------------------------------------------------
export type DatasetKey =
  | "boundary"
  | "roads"
  | "food_pois"
  | "groceries"
  | "restaurants"
  | "prices"
  | "ratings"
  | "menu_diversity"
  | "population"
  | "vulnerability"
  | "access_grid"
  | "adaptive_hex"
  | "local_labels";

export const DATASET_LABELS: Record<DatasetKey, string> = {
  boundary: "Administrative boundary",
  roads: "Road network (OSM)",
  food_pois: "Food POIs",
  groceries: "Groceries",
  restaurants: "Restaurants",
  prices: "Food prices",
  ratings: "Ratings",
  menu_diversity: "Menu / cuisine diversity",
  population: "Population",
  vulnerability: "Vulnerability context",
  access_grid: "Food-access grid",
  adaptive_hex: "Adaptive hex layer",
  local_labels: "Local validation labels",
};

export type DatasetStatus = "verified" | "partial" | "missing";

export interface DatasetRecord {
  city_id: string;
  type: DatasetKey;
  source: string;
  observation_date: string;
  row_count?: number;
  status: DatasetStatus;
  notes?: string;
}

const v = (
  city_id: string,
  type: DatasetKey,
  source: string,
  observation_date: string,
  row_count?: number,
  notes?: string,
): DatasetRecord => ({
  city_id,
  type,
  source,
  observation_date,
  row_count,
  status: "verified",
  notes,
});

const p = (
  city_id: string,
  type: DatasetKey,
  source: string,
  observation_date: string,
  notes?: string,
): DatasetRecord => ({ city_id, type, source, observation_date, status: "partial", notes });

const m = (city_id: string, type: DatasetKey): DatasetRecord => ({
  city_id,
  type,
  source: "—",
  observation_date: "—",
  status: "missing",
});

export const DATASETS: DatasetRecord[] = [
  // Bengaluru — full evidence
  v("bengaluru", "boundary", "BBMP ward GeoJSON", "2023-11", 198),
  v("bengaluru", "roads", "OSM (osmnx)", "2025-08", 31645, "Drivable graph, simplified"),
  v("bengaluru", "food_pois", "OSM + Google Places", "2025-09", 18421),
  v("bengaluru", "groceries", "Instamart + Blinkit + Zepto crawl", "2025-09", 4112),
  v("bengaluru", "restaurants", "Zomato + Swiggy", "2025-09", 14309),
  v("bengaluru", "prices", "Grocery basket crawl (10 SKUs)", "2025-09", 4112),
  v("bengaluru", "ratings", "Zomato rating snapshot", "2025-09", 14309),
  v("bengaluru", "menu_diversity", "Menu entropy (Zomato menus)", "2025-09"),
  v("bengaluru", "population", "WorldPop 100m", "2024"),
  v("bengaluru", "vulnerability", "Composite SDI", "2024"),
  v("bengaluru", "access_grid", "2SFCA 800m / 1500m", "2025-10"),
  v("bengaluru", "adaptive_hex", "Notebook 08 catchments", "2025-11", 877),
  v(
    "bengaluru",
    "local_labels",
    "Adaptive catchment proxy labels",
    "2025-11",
    877,
    "Proxy, not survey",
  ),

  // Mysuru — partial, scenario-grade
  v("mysuru", "boundary", "MCC ward GeoJSON", "2023-09", 65),
  v("mysuru", "roads", "OSM (osmnx)", "2025-08", 8204),
  v("mysuru", "food_pois", "OSM", "2025-09", 2841),
  v("mysuru", "groceries", "OSM groceries", "2025-09", 612),
  p(
    "mysuru",
    "restaurants",
    "OSM only — no Zomato crawl",
    "2025-09",
    "Affordability/quality fields imputed from Bengaluru priors",
  ),
  p("mysuru", "prices", "Imputed (Bengaluru priors)", "—"),
  p("mysuru", "ratings", "Imputed", "—"),
  m("mysuru", "menu_diversity"),
  v("mysuru", "population", "WorldPop 100m", "2024"),
  p("mysuru", "vulnerability", "Partial SDI", "2024"),
  m("mysuru", "access_grid"),
  m("mysuru", "adaptive_hex"),
  m("mysuru", "local_labels"),

  // Pune — coming soon
  v("pune", "boundary", "PMC boundary", "2024", 41),
  p("pune", "roads", "OSM (queued)", "—"),
  m("pune", "food_pois"),
  m("pune", "groceries"),
  m("pune", "restaurants"),
  m("pune", "prices"),
  m("pune", "ratings"),
  m("pune", "menu_diversity"),
  m("pune", "population"),
  m("pune", "vulnerability"),
  m("pune", "access_grid"),
  m("pune", "adaptive_hex"),
  m("pune", "local_labels"),

  // Coimbatore — coming soon
  p("coimbatore", "boundary", "CCMC boundary (draft)", "—"),
  m("coimbatore", "roads"),
  m("coimbatore", "food_pois"),
  m("coimbatore", "groceries"),
  m("coimbatore", "restaurants"),
  m("coimbatore", "prices"),
  m("coimbatore", "ratings"),
  m("coimbatore", "menu_diversity"),
  m("coimbatore", "population"),
  m("coimbatore", "vulnerability"),
  m("coimbatore", "access_grid"),
  m("coimbatore", "adaptive_hex"),
  m("coimbatore", "local_labels"),
];

// ---------------------------------------------------------------------
// Checkpoints & runs
// ---------------------------------------------------------------------
export interface ModelCheckpoint {
  id: string;
  training_city: string;
  training_country: string;
  training_region: string;
  urban_context_tags: string[];
  checkpoint_status: "AVAILABLE" | "TRAINING" | "ARCHIVED";
  model_type: string;
  feature_schema_version: string;
  scaler: string;
  target_definition: string;
  training_date: string;
  validation_policy: string;
  metrics: { accuracy: number; macroF1: number; precision: number; recall: number };
  interpretation_note: string;
}

export const CHECKPOINTS_V2: ModelCheckpoint[] = [
  {
    id: "ckpt_blr_03c",
    training_city: "Bengaluru",
    training_country: "India",
    training_region: "South Asia",
    urban_context_tags: ["large metro", "South Asian", "mixed road hierarchy"],
    checkpoint_status: "AVAILABLE",
    model_type: "GraphSAGE (weighted edges)",
    feature_schema_version: "v3c (36 features, no leakage)",
    scaler: "StandardScaler v3c",
    target_definition: "Ward-broadcast label",
    training_date: "2025-11-02",
    validation_policy: "Stratified spatial 5-fold (ward-grouped)",
    metrics: { accuracy: 0.556, macroF1: 0.506, precision: 0.512, recall: 0.504 },
    interpretation_note:
      "Useful for ward-level policy. Do NOT compare metrics directly with adaptive-target checkpoints.",
  },
  {
    id: "ckpt_blr_08",
    training_city: "Bengaluru",
    training_country: "India",
    training_region: "South Asia",
    urban_context_tags: ["large metro", "South Asian", "mixed road hierarchy"],
    checkpoint_status: "AVAILABLE",
    model_type: "GraphSAGE + GBM ensemble",
    feature_schema_version: "v8 (48 features, leakage-excluded)",
    scaler: "StandardScaler v8",
    target_definition: "Adaptive catchment label",
    training_date: "2025-12-14",
    validation_policy: "Catchment-grouped 5-fold + held-out NE quadrant",
    metrics: { accuracy: 0.939, macroF1: 0.783, precision: 0.789, recall: 0.778 },
    interpretation_note:
      "Operational checkpoint for hex-level decisions. Same checkpoint frozen for Mysuru projection.",
  },
];

export interface ModelRun {
  id: string;
  city_id: string;
  checkpoint_id: string;
  run_type: RunType;
  status: "succeeded" | "running" | "failed";
  started_at: string;
  completed_at?: string;
  feature_coverage: number; // 0..1
  warnings: string[];
  output_version: string;
}

export const RUNS: ModelRun[] = [
  {
    id: "run_blr_001",
    city_id: "bengaluru",
    checkpoint_id: "ckpt_blr_08",
    run_type: "LOCAL_MODEL",
    status: "succeeded",
    started_at: "2026-05-12T08:14:00Z",
    completed_at: "2026-05-12T08:21:42Z",
    feature_coverage: 1.0,
    warnings: [],
    output_version: "blr_adaptive_v8.3",
  },
  {
    id: "run_blr_002",
    city_id: "bengaluru",
    checkpoint_id: "ckpt_blr_03c",
    run_type: "LOCAL_MODEL",
    status: "succeeded",
    started_at: "2026-05-10T11:02:00Z",
    completed_at: "2026-05-10T11:06:11Z",
    feature_coverage: 1.0,
    warnings: ["Ward-broadcast target — interpret at ward level only."],
    output_version: "blr_ward_v3c.2",
  },
  {
    id: "run_mys_001",
    city_id: "mysuru",
    checkpoint_id: "ckpt_blr_08",
    run_type: "TRANSFER_PROJECTION",
    status: "succeeded",
    started_at: "2026-06-04T09:30:00Z",
    completed_at: "2026-06-04T09:34:22Z",
    feature_coverage: 0.74,
    warnings: [
      "Affordability & quality features imputed from Bengaluru priors.",
      "No local labels — transfer accuracy cannot be quantified.",
    ],
    output_version: "mys_projection_v0.4",
  },
  {
    id: "run_mys_002",
    city_id: "mysuru",
    checkpoint_id: "ckpt_blr_08",
    run_type: "PLANNING_SCENARIO",
    status: "succeeded",
    started_at: "2026-06-15T14:10:00Z",
    completed_at: "2026-06-15T14:13:55Z",
    feature_coverage: 0.74,
    warnings: ["Projection, not certainty. Relative change is the signal."],
    output_version: "mys_scenario_techpark_v0.2",
  },
];

// ---------------------------------------------------------------------
// API/service layer (mock)
// ---------------------------------------------------------------------
export const api = {
  listCities: () => CITIES,
  getCity: (id: string) => CITIES.find((c) => c.id === id),
  getReadiness: (cityId: string) => DATASETS.filter((d) => d.city_id === cityId),
  listRuns: (cityId?: string) => (cityId ? RUNS.filter((r) => r.city_id === cityId) : RUNS),
  getRun: (id: string) => RUNS.find((r) => r.id === id),
  getCheckpoint: (id: string) => CHECKPOINTS_V2.find((c) => c.id === id),
  latestRun: (cityId: string) =>
    RUNS.filter((r) => r.city_id === cityId).sort((a, b) =>
      (b.completed_at || "").localeCompare(a.completed_at || ""),
    )[0],
};

export function evidenceTone(state: EvidenceState) {
  if (state === "AVAILABLE") return { dot: "#7a9461", text: "Evidence-backed" };
  if (state === "SCENARIO") return { dot: "#d59e71", text: "Transfer projection" };
  return { dot: "#aab3bf", text: "No model outputs" };
}
