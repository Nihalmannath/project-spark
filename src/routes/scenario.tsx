import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapDashboard } from "../components/MapDashboard";
import { Legend } from "../components/Legend";
import { ScenarioControls, type ScenarioState } from "../components/ScenarioControls";
import { HEXES, type HexPrediction } from "../data/mockData";
import { LABELS, LABEL_ORDER, type LabelKey } from "../data/labels";

export const Route = createFileRoute("/scenario")({
  head: () => ({
    meta: [
      { title: "Scenario Prototype — Food Spatial Intelligence" },
      { name: "description", content: "Test what-if scenarios for food-environment interventions." },
    ],
  }),
  component: ScenarioPage,
});

const INITIAL: ScenarioState = {
  density: 0, grocery: 0, newOutlet: 0, affordability: 0, hideLowConf: false,
};

function ScenarioPage() {
  const [state, setState] = useState<ScenarioState>(INITIAL);

  // TODO(integration): replace this mock heuristic with a server call that
  // runs the trained model on the perturbed features.
  const shift = useMemo(() => {
    const pressure =
      -state.grocery - state.newOutlet - state.affordability + state.density * 0.5;
    return (h: HexPrediction): LabelKey => {
      if (h.predicted === "unknown") return "unknown";
      const order: LabelKey[] = ["oasis", "mirage", "swamp", "desert"];
      const idx = order.indexOf(h.predicted);
      if (idx === -1) return h.predicted;
      const newIdx = Math.max(0, Math.min(order.length - 1, idx + Math.round(pressure / 2)));
      return order[newIdx];
    };
  }, [state]);

  const before = useMemo(() => countLabels(HEXES.map((h) => h.predicted)), []);
  const after = useMemo(() => countLabels(HEXES.map(shift)), [shift]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-6 max-w-3xl">
        <p className="smallcaps text-[10px] text-muted-foreground">Scenario Prototype</p>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-foreground">
          What-if scenario testing
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Adjust local pressures and see how the predicted food environment would shift. This is a
          UI prototype — final simulation logic depends on backend model integration.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr_300px]">
        <ScenarioControls state={state} onChange={setState} onReset={() => setState(INITIAL)} />
        <div className="h-[560px]">
          <MapDashboard
            onSelect={() => {}}
            scenarioShift={shift}
            hideLowConfidence={state.hideLowConf}
          />
        </div>
        <div className="space-y-5">
          <Legend compact />
          <BeforeAfter before={before} after={after} />
        </div>
      </div>
    </div>
  );
}

function countLabels(labels: LabelKey[]): Record<LabelKey, number> {
  const out = { desert: 0, swamp: 0, mirage: 0, oasis: 0, unknown: 0 } as Record<LabelKey, number>;
  labels.forEach((l) => out[l]++);
  return out;
}

function BeforeAfter({
  before, after,
}: { before: Record<LabelKey, number>; after: Record<LabelKey, number> }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="smallcaps text-[10px] text-muted-foreground">Before / after</p>
      <ul className="mt-3 space-y-2">
        {LABEL_ORDER.map((k) => {
          const delta = after[k] - before[k];
          return (
            <li key={k} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-foreground">
                <span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: LABELS[k].color }} />
                {LABELS[k].name}
              </span>
              <span className="metric-num text-foreground">
                {before[k]} → {after[k]}{" "}
                <span className={delta === 0 ? "text-muted-foreground" : delta > 0 ? "text-[var(--color-swamp)]" : "text-[var(--color-oasis)]"}>
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
