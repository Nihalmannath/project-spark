// Real exported road-intersection node data (see pipeline/export_nodes.py).
// Node GeoJSON lives in /public/data and is served at /data/<city>_nodes.geojson.
import type { LabelKey } from "./labels";

export interface NodeProps {
  id: number;
  label: LabelKey;
  ward: string;
  access: number;          // 0..1 (Bengaluru: real ward score; Mysuru: access percentile/100)
  affordability: number;   // 0..1 (Mysuru imputed 0.5)
  quality: number;         // 0..1 (Mysuru imputed 0.5)
  confidence: number;      // 0..1
  food_800m: number;
  food_1500m: number;
  nearest_food_km: number;
  road_degree: number;
  inter_density_1km: number;
  access_pct: number;      // 0..100 within-city access percentile
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
      "Transfer projection: 19,116 Mysuru road nodes scored by the same OSM features. No local ground-truth — read the relative before→after change.",
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
}

export interface ScenarioChange {
  id: number;
  before: LabelKey;
  after: LabelKey;
  spillover: boolean;
}

export interface ScenarioResult {
  affected: number;
  moved_out_of_desert: number;
  spillover: number;
  changed: ScenarioChange[];
  transitions: { from: LabelKey; to: LabelKey; count: number }[];
  hub: [number, number];
  radius_m: number;
}
