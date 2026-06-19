import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCity } from "../lib/city-context";
import { api, evidenceTone } from "../data/platform";
import { EvidenceBadge } from "../components/EvidenceBadge";
import { ProvenanceCard } from "../components/ProvenanceCard";
import { MapDashboard } from "../components/MapDashboard";
import { ComingSoonView } from "../components/ComingSoonView";
import { HEXES, type HexPrediction } from "../data/mockData";
import { MYSURU_HEXES } from "../data/mysuru";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Food Spatial Intelligence Platform" },
      { name: "description", content: "Operational overview of urban food-environment classification by road intersection." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { city } = useCity();
  const datasets = api.getReadiness(city.id);
  const run = api.latestRun(city.id);
  const tone = evidenceTone(city.evidence_state);
  const [sel, setSel] = useState<HexPrediction | null>(null);

  const hexes = city.id === "bengaluru" ? HEXES : city.id === "mysuru" ? MYSURU_HEXES : [];

  const labelCounts = useMemo(() => {
    const out: Record<string, number> = { desert: 0, swamp: 0, mirage: 0, oasis: 0, unknown: 0 };
    hexes.forEach((h) => out[h.predicted]++);
    return out;
  }, [hexes]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      {/* City header strip */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl text-foreground">{city.display_name}</h1>
            <EvidenceBadge state={city.evidence_state} size="md" />
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {city.osm_place_name} · last updated {city.last_updated}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Metric label="Run type" value={run ? runTypeLabel(run.run_type) : "—"} />
          <Metric label="Data readiness" value={`${Math.round(city.data_readiness * 100)}%`} />
          <Metric label="Evidence" value={tone.text} />
        </div>
      </div>

      {/* Caveat */}
      <div
        className="mt-4 rounded-sm border-l-4 px-4 py-3 text-xs"
        style={{ borderColor: tone.dot, background: "#faf8f4" }}
      >
        <span className="smallcaps text-[9px] text-muted-foreground">Active caveat · </span>
        <span className="text-foreground">{city.caveat}</span>
      </div>

      {city.evidence_state === "COMING_SOON" ? (
        <div className="mt-6">
          <ComingSoonView city={city} datasets={datasets} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="h-[560px]">
            <MapDashboard
              hexes={hexes}
              center={city.center}
              zoom={city.zoom}
              scale={city.id === "mysuru" ? 0.7 : 1}
              onSelect={setSel}
              selectedId={sel?.id ?? null}
              caption={`${city.display_name} · ${hexes.length} adaptive catchments · ${city.evidence_state}`}
            />
          </div>
          <div className="space-y-4">
            {run && <ProvenanceCard run={run} />}
            <div className="rounded-sm border border-border bg-background p-4">
              <p className="smallcaps text-[9px] text-muted-foreground">
                Predicted label distribution
              </p>
              <div className="mt-3 space-y-1.5">
                {(["desert", "swamp", "mirage", "oasis", "unknown"] as const).map((k) => {
                  const n = labelCounts[k] || 0;
                  const total = hexes.length || 1;
                  const color = { desert: "#d59e71", swamp: "#3d5a80", mirage: "#ffe09d", oasis: "#b9ca9d", unknown: "#c9d4e0" }[k];
                  return (
                    <div key={k} className="flex items-center gap-2">
                      <span className="w-16 text-[11px] capitalize text-foreground">{k}</span>
                      <div className="relative h-3 flex-1 rounded-sm bg-muted/40">
                        <div
                          className="h-3 rounded-sm"
                          style={{ width: `${(n / total) * 100}%`, background: color }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-[11px] text-muted-foreground">
                        {n}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {city.id === "mysuru" && (
              <Link
                to="/scenario-lab"
                className="block rounded-sm border border-border bg-[#fbeede]/60 p-4 transition-colors hover:bg-[#fbeede]"
              >
                <p className="smallcaps text-[9px] text-[#7a4a1f]">Scenario Lab enabled</p>
                <p className="mt-1 font-serif text-sm text-foreground">
                  Run the Mysuru tech-park intervention →
                </p>
              </Link>
            )}
            <Link
              to="/runs"
              className="block rounded-sm border border-border bg-background p-3 text-xs text-foreground hover:bg-muted/40"
            >
              View all model runs for {city.display_name} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="smallcaps text-[9px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}

function runTypeLabel(t: string) {
  return { LOCAL_MODEL: "Local model", TRANSFER_PROJECTION: "Transfer projection", PLANNING_SCENARIO: "Planning scenario" }[t] || t;
}
