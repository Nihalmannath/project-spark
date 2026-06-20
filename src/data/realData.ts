// Real exported road-intersection node data (see pipeline/export_nodes.py).
// Node GeoJSON lives in /public/data and is served at /data/<city>_nodes.geojson.
import type { LabelKey } from "./labels";

export interface NodeProps {
  id: number;
  label: LabelKey;
  ward: string;
  access: number; // 0..1 (Bengaluru: real ward score; Mysuru: access percentile/100)
  affordability: number | null;
  quality: number | null;
  evidence_level: "observed" | "model" | "proxy" | "unknown";
  risk_flags: string[];
  confidence: number; // 0..1
  food_800m: number;
  food_1500m: number;
  nearest_food_km: number;
  road_degree: number;
  inter_density_1km: number;
  access_pct: number; // 0..100 within-city access percentile
  quality_proxy: number | null;
  proxy_poi_count: number | null;
  proxy_category_diversity_pct: number | null;
  proxy_cuisine_diversity_pct: number | null;
  proxy_grocery_share_pct: number | null;
  proxy_fast_food_share_pct: number | null;
  proxy_category_coverage_pct: number | null;
  proxy_sufficient: boolean | null;
  proxy_label: LabelKey | null;
  model_label: LabelKey | null;
  model_top_label: Exclude<LabelKey, "unknown"> | null;
  model_probabilities: Record<Exclude<LabelKey, "unknown">, number> | null;
  model_confidence: number | null;
  model_entropy: number | null;
  model_version: string | null;
  model_promoted: boolean | null;
  model_ood_score: number | null;
  model_abstained: boolean | null;
}

export interface CityInfo {
  id: "bengaluru" | "mysuru";
  name: string;
  region: string;
  center: [number, number];
  zoom: number;
  /** evidence-backed (real ward labels) vs scenario projection (transfer, no local labels) */
  evidence: "AVAILABLE" | "SCENARIO";
  blurb: string;
}

export const CITY_INFO: Record<string, CityInfo> = {
  bengaluru: {
    id: "bengaluru",
    name: "Bengaluru",
    region: "Karnataka, India",
    center: [77.5875, 12.9771],
    zoom: 11,
    evidence: "AVAILABLE",
    blurb:
      "Evidence-backed: 34,200 road-intersection nodes labelled from the published BBMP ward food-environment labels.",
  },
  mysuru: {
    id: "mysuru",
    name: "Mysuru",
    region: "Karnataka, India",
    center: [76.6481, 12.3121],
    zoom: 12,
    evidence: "SCENARIO",
    blurb:
      "Matched OSM-only GraphSAGE evaluation with a conservative proxy fallback. No Mysuru ground truth or observed affordability is available.",
  },
};

// short label keys -> hex colors (thesis palette, matches labels.ts CSS vars)
export const LABEL_COLOR: Record<string, string> = {
  desert: "#d59e71",
  swamp: "#3d5a80",
  mirage: "#ffe09d",
  oasis: "#b9ca9d",
  unknown: "#c9d4e0",
};

export function labelColor(k: string): string {
  return LABEL_COLOR[k] ?? "#888";
}

export interface CityMeta {
  city: string;
  n_nodes: number;
  n_edges: number;
  center: [number, number];
  label_counts: Record<string, number>;
  feats: string[];
  source: string;
  unknown_count: number;
  label_methodology: string;
  proxy_version: string | null;
  osm_extraction_timestamp: string | null;
  poi_coverage: Record<string, string | number>;
  thresholds: {
    access_percentile_desert_below: number;
    quality_proxy_swamp_below: number;
    minimum_nearby_proxy_pois: number;
  };
  provenance: {
    pipeline: string;
    road_network: string;
    local_ground_truth: boolean;
  };
  model_schema_version: string;
  model_label_counts?: Record<string, number>;
  proxy_label_counts?: Record<string, number> | null;
  model_proxy_disagreement_count?: number;
  model: {
    status: "not_trained" | "promoted" | "evaluation_only";
    promotion_passed: boolean;
    model_version?: string;
    checkpoint_sha256?: string;
    target_city_ood_rate?: number;
    target_city_abstention_rate?: number;
    metrics?: {
      spatial_cv_macro_f1: number;
      spatial_cv_accuracy: number;
      calibrated_ece: number;
      selective_coverage: number;
      confidence_threshold: number;
      entropy_threshold: number;
      promotion_checks: Record<string, boolean>;
      per_class: Record<string, { precision: number; recall: number; f1: number; support: number }>;
    };
  };
}

export interface ScenarioChange {
  id: number;
  before: LabelKey;
  after: LabelKey;
  spillover: boolean;
  access_pct: number;
  affordability: number | null;
  quality: number | null;
  evidence_level: "observed" | "model" | "proxy" | "unknown";
  risk_flags: string[];
  before_probabilities?: Record<string, number>;
  after_probabilities?: Record<string, number>;
  model_confidence?: number;
  model_entropy?: number;
  model_ood_score?: number;
}

export interface ScenarioResult {
  affected: number;
  moved_out_of_desert: number;
  spillover: number;
  changed: ScenarioChange[];
  transitions: { from: LabelKey; to: LabelKey; count: number }[];
  hub: [number, number];
  radius_m: number;
  intervention_evidence:
    | "none"
    | "model"
    | "proxy_fallback_model_not_promoted"
    | "access_only"
    | "access_and_quality_proxy";
  model_version?: string | null;
  model_promotion_passed?: boolean;
  candidate_model_changed_count?: number;
  candidate_model_transitions?: { from: LabelKey; to: LabelKey; count: number }[];
  candidate_model_changes?: ScenarioChange[];
}
