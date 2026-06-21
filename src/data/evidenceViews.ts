export type EvidenceCity = "bengaluru" | "mysuru";
export type EvidenceViewId = "road" | "03" | "03b" | "03c" | "03d" | "08";

export interface EvidenceView {
  id: EvidenceViewId;
  label: string;
  notebook: string;
  targetType: "Road-node evidence" | "Ward-broadcast target" | "Adaptive local target";
  featureCount: number;
  description: string;
  limitation: string;
  mapPath: string | null;
  availableIn: EvidenceCity[];
}

export const EVIDENCE_VIEWS: EvidenceView[] = [
  {
    id: "road",
    label: "Road nodes",
    notebook: "Current evidence export",
    targetType: "Road-node evidence",
    featureCount: 8,
    description: "Inspect individual road intersections and the evidence attached to each node.",
    limitation:
      "Bengaluru labels inherit ward evidence; Mysuru labels are calibrated transfer projections.",
    mapPath: null,
    availableIn: ["bengaluru", "mysuru"],
  },
  {
    id: "03",
    label: "03 · OSM baseline",
    notebook: "03_graphsage_road_nodes.ipynb",
    targetType: "Ward-broadcast target",
    featureCount: 8,
    description:
      "The free-data baseline using road structure and sparse OpenStreetMap food features.",
    limitation:
      "Predicted-versus-true Bengaluru map; ward labels are proxies, not node-level survey truth.",
    mapPath: "/maps/03_pred_vs_true_map.html",
    availableIn: ["bengaluru"],
  },
  {
    id: "03b",
    label: "03b · Rich data",
    notebook: "03b_graphsage_rich_raw_features.ipynb",
    targetType: "Ward-broadcast target",
    featureCount: 39,
    description: "Adds Zomato, Swiggy, grocery, menu, and ward-boundary uncertainty signals.",
    limitation: "Uses richer Bengaluru-only sources and is not a transferable OSM-only model.",
    mapPath: "/maps/03b_pred_vs_true_map.html",
    availableIn: ["bengaluru"],
  },
  {
    id: "03c",
    label: "03c · Weighted roads",
    notebook: "03c_graphsage_weighted_edges.ipynb",
    targetType: "Ward-broadcast target",
    featureCount: 36,
    description:
      "Tests whether shorter road connections should carry more influence during message passing.",
    limitation:
      "The strong ward-target benchmark; metrics must not be compared directly with Notebook 08.",
    mapPath: "/maps/03c_pred_vs_true_map.html",
    availableIn: ["bengaluru"],
  },
  {
    id: "03d",
    label: "03d · No graph",
    notebook: "03d_random_forest_baseline.ipynb",
    targetType: "Ward-broadcast target",
    featureCount: 36,
    description:
      "A Random Forest control that measures how much the road graph contributes beyond features.",
    limitation: "This is a tabular comparison model and does not use road-network message passing.",
    mapPath: "/maps/03d_pred_vs_true_map.html",
    availableIn: ["bengaluru"],
  },
  {
    id: "08",
    label: "08 · Adaptive hex",
    notebook: "08_adaptive_hex_target_pipeline.ipynb",
    targetType: "Adaptive local target",
    featureCount: 48,
    description:
      "Adaptive catchments — base hexes merged by population & data coverage — labelled by a deterministic four-score rule (access, affordability, quality/diversity, stability).",
    limitation:
      "This changes the prediction target; the original predicted-vs-true artifact remains available as an audit view.",
    mapPath: "/maps/adaptive_hex_pred_vs_true_map.html",
    availableIn: ["bengaluru"],
  },
];

export function getEvidenceView(id: EvidenceViewId): EvidenceView {
  return EVIDENCE_VIEWS.find((view) => view.id === id) ?? EVIDENCE_VIEWS[0];
}

export function isEvidenceCity(value: unknown): value is EvidenceCity {
  return value === "bengaluru" || value === "mysuru";
}

export function isEvidenceView(value: unknown): value is EvidenceViewId {
  return EVIDENCE_VIEWS.some((view) => view.id === value);
}
