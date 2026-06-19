import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useCity } from "../lib/city-context";
import { MapDashboard } from "../components/MapDashboard";
import { PredictionSidePanel } from "../components/PredictionSidePanel";
import { Legend } from "../components/Legend";
import { ComingSoonView } from "../components/ComingSoonView";
import { api } from "../data/platform";
import { HEXES, type HexPrediction } from "../data/mockData";
import { MYSURU_HEXES } from "../data/mysuru";
import type { LabelKey } from "../data/labels";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Results — Food Spatial Intelligence Platform" }] }),
  component: Results,
});

function Results() {
  const { city } = useCity();
  const datasets = api.getReadiness(city.id);
  const [sel, setSel] = useState<HexPrediction | null>(null);
  const [filter, setFilter] = useState<LabelKey | null>(null);

  if (city.evidence_state === "COMING_SOON") {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <ComingSoonView city={city} datasets={datasets} />
      </div>
    );
  }

  const hexes = city.id === "bengaluru" ? HEXES : MYSURU_HEXES;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="flex items-end justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Results · {city.display_name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Click any node to inspect its features and provenance.
            {city.evidence_state === "SCENARIO" && " Projection — no local ground truth."}
          </p>
        </div>
      </header>
      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr_360px]">
        <aside>
          <Legend active={filter} onToggle={(k) => setFilter((p) => (p === k ? null : k))} />
        </aside>
        <div className="h-[640px]">
          <MapDashboard
            hexes={hexes}
            center={city.center}
            zoom={city.zoom}
            scale={city.id === "mysuru" ? 0.7 : 1}
            filterLabel={filter}
            onSelect={setSel}
            selectedId={sel?.id ?? null}
            caption={`${city.display_name} · ${city.evidence_state}`}
          />
        </div>
        <aside className="h-[640px]">
          <PredictionSidePanel hex={sel} onClose={() => setSel(null)} />
        </aside>
      </div>
    </div>
  );
}
