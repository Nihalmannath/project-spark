import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapDashboard } from "../components/MapDashboard";
import { PredictionSidePanel } from "../components/PredictionSidePanel";
import { Legend } from "../components/Legend";
import { HEXES, type HexPrediction } from "../data/mockData";
import { MYSURU_HEXES } from "../data/mysuru";
import type { LabelKey } from "../data/labels";
import { useTransfer } from "../lib/transfer-context";
import { CITIES } from "../data/platform";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Food Access Map" }] }),
  component: Results,
});

function Results() {
  const { target } = useTransfer();
  const [sel, setSel] = useState<HexPrediction | null>(null);
  const [filter, setFilter] = useState<LabelKey | null>(null);

  const isMysuru = target?.id === "mysuru";
  const hexes = isMysuru ? MYSURU_HEXES : HEXES;
  const cityData = isMysuru
    ? { name: "Mysuru", center: target!.center, zoom: target!.zoom }
    : CITIES.find((c) => c.id === "bengaluru")
      ? {
          name: "Bengaluru",
          center: [77.5946, 12.9716] as [number, number],
          zoom: 10.1,
        }
      : null;

  const labelCounts = hexes.reduce<Record<string, number>>((acc, h) => {
    acc[h.predicted] = (acc[h.predicted] ?? 0) + 1;
    return acc;
  }, {});

  if (!cityData) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 pt-16 pb-16 text-center">
        <h1 className="font-serif text-2xl text-foreground">No city selected</h1>
        <Link to="/" className="mt-4 inline-block smallcaps text-[10px] text-muted-foreground hover:text-foreground">
          ← Choose a city
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-16">
      <header className="mb-6">
        <h1 className="font-serif text-[28px] leading-tight tracking-tight text-foreground">
          {cityData.name} Food Access Map
        </h1>
        <p className="mt-1 max-w-[680px] text-sm italic text-[color:var(--color-ink-deep)]">
          This map shows estimated food access patterns and is intended to support planning
          decisions, not replace local research.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_360px]">
        <aside className="space-y-4">
          <section className="border border-border bg-[color:var(--color-paper)] p-4">
            <p className="smallcaps text-[10px] text-muted-foreground mb-3">Neighbourhood types</p>
            <Legend active={filter} onToggle={(k) => setFilter((p) => (p === k ? null : k))} />
          </section>
          <section className="border border-border bg-[color:var(--color-paper)] p-4">
            <p className="smallcaps text-[10px] text-muted-foreground">Neighbourhood breakdown</p>
            <ul className="mt-2 space-y-1.5 text-[11px]">
              {Object.entries(labelCounts).map(([k, n]) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="capitalize text-foreground">{k}</span>
                  <span className="font-mono text-muted-foreground">{n}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <div className="h-[640px]">
          <MapDashboard
            hexes={hexes}
            center={cityData.center}
            zoom={cityData.zoom}
            scale={0.7}
            filterLabel={filter}
            onSelect={setSel}
            selectedId={sel?.id ?? null}
            caption={`${cityData.name} · food access map`}
          />
        </div>

        <aside className="h-[640px]">
          <PredictionSidePanel hex={sel} onClose={() => setSel(null)} />
        </aside>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link to="/" className="smallcaps text-[10px] text-muted-foreground hover:text-foreground">
          ← Choose different city
        </Link>
        <Link
          to="/scenario-lab"
          className="smallcaps text-[10px] rounded-sm bg-foreground px-4 py-2.5 text-background hover:bg-foreground/85"
        >
          What if we made changes here? →
        </Link>
      </div>
    </div>
  );
}
