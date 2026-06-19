import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { CHECKPOINTS_V2, CITIES, type City, type ModelCheckpoint } from "../data/platform";

export interface TargetCity {
  id: string;
  display_name: string;
  country: string;
  region?: string;
  osm_place_name?: string;
  urban_population?: number;
  center: [number, number];
  zoom: number;
  notes?: string;
  /** "known" = wired up with data, "custom" = user-entered, no readiness yet */
  kind: "known" | "custom";
}

const KNOWN_TARGETS: TargetCity[] = CITIES.filter((c) => c.id !== "bengaluru").map((c: City) => ({
  id: c.id,
  display_name: c.display_name,
  country: c.country,
  region: c.region,
  osm_place_name: c.osm_place_name,
  center: c.center,
  zoom: c.zoom,
  kind: "known",
}));

interface TransferCtx {
  source: ModelCheckpoint;
  setSourceId: (id: string) => void;
  availableCheckpoints: ModelCheckpoint[];

  target: TargetCity | null;
  setTargetId: (id: string) => void;
  registerCustomTarget: (t: Omit<TargetCity, "kind">) => void;
  targets: TargetCity[];
}

const Ctx = createContext<TransferCtx | null>(null);

export function TransferProvider({ children }: { children: ReactNode }) {
  const [sourceId, setSourceId] = useState<string>("ckpt_blr_08");
  const [targetId, setTargetId] = useState<string>("mysuru");
  const [customTargets, setCustomTargets] = useState<TargetCity[]>([]);

  const value = useMemo<TransferCtx>(() => {
    const targets = [...KNOWN_TARGETS, ...customTargets];
    const target = targets.find((t) => t.id === targetId) ?? null;
    const source =
      CHECKPOINTS_V2.find((c) => c.id === sourceId) ?? CHECKPOINTS_V2[0];
    return {
      source,
      setSourceId,
      availableCheckpoints: CHECKPOINTS_V2,
      target,
      setTargetId,
      registerCustomTarget: (t) =>
        setCustomTargets((prev) => [...prev, { ...t, kind: "custom" }]),
      targets,
    };
  }, [sourceId, targetId, customTargets]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTransfer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTransfer must be used inside TransferProvider");
  return v;
}

// ---------------------------------------------------------------------
// Audit logic — pure function, deterministic per (source, target).
// ---------------------------------------------------------------------
export type AuditVerdict =
  | "READY"
  | "CAUTION"
  | "INSUFFICIENT"
  | "LOCAL_TRAINING";

export interface AuditCheck {
  label: string;
  status: "pass" | "warn" | "fail";
  note?: string;
}

export interface AuditReport {
  verdict: AuditVerdict;
  readiness: AuditCheck[];
  feature_compat: AuditCheck[];
  context_compat: AuditCheck[];
  summary: string;
}

export function buildAudit(
  source: ModelCheckpoint,
  target: TargetCity | null,
): AuditReport {
  if (!target) {
    return {
      verdict: "INSUFFICIENT",
      readiness: [],
      feature_compat: [],
      context_compat: [],
      summary: "Select a target city to run the transfer audit.",
    };
  }

  // Hard-coded per-target audit (only mysuru has verified data). Custom or
  // unknown targets get INSUFFICIENT until datasets are wired in.
  if (target.id === "mysuru") {
    return {
      verdict: "CAUTION",
      summary:
        "Bengaluru → Mysuru transfer is feasible. Affordability and quality features are imputed from source priors; no local validation labels exist.",
      readiness: [
        { label: "Administrative boundary", status: "pass" },
        { label: "Road graph (OSM)", status: "pass", note: "8,204 edges" },
        { label: "Food POIs", status: "pass", note: "2,841 nodes" },
        { label: "Sufficient food-POI coverage", status: "warn", note: "Lower density than source" },
        { label: "Feature schema reproducible", status: "pass", note: source.feature_schema_version },
        { label: "Population / demand data", status: "pass", note: "WorldPop 100m" },
        { label: "Affordability data", status: "warn", note: "Imputed from Bengaluru priors" },
        { label: "Quality / diversity data", status: "fail", note: "No Zomato menu coverage" },
      ],
      feature_compat: [
        { label: "Road intersection density", status: "pass" },
        { label: "Road hierarchy mix", status: "pass" },
        { label: "Food outlet density", status: "warn", note: "Mysuru ~0.42× source" },
        { label: "Nearest-food distance", status: "pass" },
        { label: "Grocery density", status: "warn" },
        { label: "Restaurant density", status: "warn", note: "OSM-only count is incomplete" },
        { label: "Urban density", status: "pass" },
        { label: "Feature missingness", status: "warn", note: "26% of features imputed" },
      ],
      context_compat: [
        { label: "Urban scale (Tier-2)", status: "pass", note: "Both within Karnataka" },
        { label: "Street-network morphology", status: "pass" },
        { label: "Food-retail structure", status: "warn", note: "Fewer aggregator listings in target" },
        { label: "Mapping completeness", status: "warn" },
        { label: "Cultural / market differences", status: "pass" },
        { label: "Source–target geographic distance", status: "pass", note: "~150 km" },
      ],
    };
  }

  // Custom target — assume nothing.
  return {
    verdict: "INSUFFICIENT",
    summary:
      "No verified datasets for this target. Upload a boundary, build the road graph, and ingest food POIs before re-running the audit.",
    readiness: [
      { label: "Administrative boundary", status: "fail" },
      { label: "Road graph (OSM)", status: "fail" },
      { label: "Food POIs", status: "fail" },
      { label: "Sufficient food-POI coverage", status: "fail" },
      { label: "Feature schema reproducible", status: "fail" },
      { label: "Population / demand data", status: "fail" },
      { label: "Affordability data", status: "fail" },
      { label: "Quality / diversity data", status: "fail" },
    ],
    feature_compat: [],
    context_compat: [],
  };
}

export function verdictTone(v: AuditVerdict) {
  switch (v) {
    case "READY": return { dot: "#7a9461", label: "Ready for transfer" };
    case "CAUTION": return { dot: "#d59e71", label: "Transfer with caution" };
    case "INSUFFICIENT": return { dot: "#aab3bf", label: "Insufficient data" };
    case "LOCAL_TRAINING": return { dot: "#b85c4a", label: "Local training recommended" };
  }
}
