import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapDashboard } from "../components/MapDashboard";
import { PredictionSidePanel } from "../components/PredictionSidePanel";
import { Legend } from "../components/Legend";
import type { HexPrediction } from "../data/mockData";
import type { LabelKey } from "../data/labels";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Map Dashboard — Food Spatial Intelligence" },
      { name: "description", content: "Interactive food-environment hex map for Bengaluru." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [selected, setSelected] = useState<HexPrediction | null>(null);
  const [filter, setFilter] = useState<LabelKey | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">City Map Dashboard</p>
          <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-foreground">
            Bengaluru food environments
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Click any hex to inspect predicted label, confidence, contributing features, and the
            checkpoint that produced it. Toggle the legend to focus on a single class.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr_360px]">
        <aside>
          <Legend
            active={filter}
            onToggle={(k) => setFilter((prev) => (prev === k ? null : k))}
          />
        </aside>
        <div className="h-[640px]">
          <MapDashboard
            filterLabel={filter}
            onSelect={setSelected}
            selectedId={selected?.id ?? null}
          />
        </div>
        <aside className="h-[640px]">
          <PredictionSidePanel hex={selected} onClose={() => setSelected(null)} />
        </aside>
      </div>
    </div>
  );
}
