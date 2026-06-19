import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCity } from "../lib/city-context";
import { MapDashboard } from "../components/MapDashboard";
import { MYSURU_HEXES, MYSURU_HUB } from "../data/mysuru";
import { type HexPrediction } from "../data/mockData";
import { LABELS, LABEL_ORDER, type LabelKey } from "../data/labels";

export const Route = createFileRoute("/scenario-lab")({
  head: () => ({ meta: [{ title: "Scenario Lab — Food Spatial Intelligence Platform" }] }),
  component: ScenarioLab,
});

interface ScState {
  interventionType: "grocery_hub" | "weekly_market" | "subsidised_outlet";
  hubCol: number;
  hubRow: number;
  radius: number; // grid cells
  addedOutlets: number;
  nearestFoodShift: number; // km reduction
}

const INITIAL: ScState = {
  interventionType: "grocery_hub",
  hubCol: MYSURU_HUB.col,
  hubRow: MYSURU_HUB.row,
  radius: 2,
  addedOutlets: 6,
  nearestFoodShift: 0.6,
};

function ScenarioLab() {
  const { city, setCityId } = useCity();

  if (city.id !== "mysuru") {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <header className="border-b border-border pb-4">
          <h1 className="font-serif text-2xl text-foreground">Scenario Lab</h1>
        </header>
        <div className="mt-6 rounded-sm border border-dashed border-border bg-background p-8 text-center">
          <p className="smallcaps text-[10px] text-muted-foreground">Not enabled</p>
          <p className="mt-2 max-w-xl mx-auto font-serif text-base text-foreground">
            Scenario Lab is currently enabled only for Mysuru — the transfer projection city
            where a frozen Bengaluru checkpoint can be perturbed and rerun.
          </p>
          <button
            onClick={() => setCityId("mysuru")}
            className="mt-4 rounded-sm border border-foreground bg-foreground px-3 py-1.5 text-xs text-background hover:opacity-90"
          >
            Switch to Mysuru
          </button>
        </div>
      </div>
    );
  }

  const [s, setS] = useState<ScState>(INITIAL);

  const shift = useMemo(() => {
    return (h: HexPrediction): LabelKey => {
      const d = Math.hypot(h.col - s.hubCol, h.row - s.hubRow);
      if (d > s.radius) return h.predicted;
      // Within radius: improve label by intensity
      const intensity = (1 - d / (s.radius + 0.5)) * (s.addedOutlets / 6) * (s.nearestFoodShift / 0.6);
      const order: LabelKey[] = ["desert", "swamp", "mirage", "oasis"];
      if (h.predicted === "unknown") return h.predicted;
      const idx = order.indexOf(h.predicted);
      if (idx === -1) return h.predicted;
      const shifted = Math.min(order.length - 1, idx + Math.round(intensity * 2));
      return order[shifted];
    };
  }, [s]);

  const transitions = useMemo(() => {
    const t: { from: LabelKey; to: LabelKey; count: number }[] = [];
    const map = new Map<string, number>();
    MYSURU_HEXES.forEach((h) => {
      const to = shift(h);
      if (to === h.predicted) return;
      const k = `${h.predicted}>${to}`;
      map.set(k, (map.get(k) || 0) + 1);
    });
    for (const [k, count] of map) {
      const [from, to] = k.split(">") as [LabelKey, LabelKey];
      t.push({ from, to, count });
    }
    return t.sort((a, b) => b.count - a.count);
  }, [shift]);

  const changedNodes = transitions.reduce((a, b) => a + b.count, 0);
  const outOfDesert = transitions
    .filter((t) => t.from === "desert" && t.to !== "desert")
    .reduce((a, b) => a + b.count, 0);

  const affected = useMemo(
    () => MYSURU_HEXES.filter((h) => Math.hypot(h.col - s.hubCol, h.row - s.hubRow) <= s.radius).length,
    [s.hubCol, s.hubRow, s.radius],
  );

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="flex items-end justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Scenario Lab · Mysuru</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Frozen Bengaluru checkpoint <span className="font-mono">ckpt_blr_08</span> rerun on
            perturbed Mysuru features.
          </p>
        </div>
        <Link to="/results" className="text-xs text-muted-foreground hover:text-foreground">
          ← back to results
        </Link>
      </header>

      {/* Loud projection warning */}
      <div className="mt-4 rounded-sm border-l-4 border-[#d59e71] bg-[#fbeede]/60 px-4 py-3 text-xs text-[#7a4a1f]">
        <span className="smallcaps text-[9px]">Projection · not certainty</span> — relative change
        between baseline and scenario is the signal. Absolute baseline classes carry no local
        validation.
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr_1fr_280px]">
        {/* Controls */}
        <aside className="rounded-sm border border-border bg-background p-4">
          <p className="smallcaps text-[9px] text-muted-foreground">Intervention</p>
          <select
            value={s.interventionType}
            onChange={(e) => setS({ ...s, interventionType: e.target.value as ScState["interventionType"] })}
            className="mt-2 w-full rounded-sm border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value="grocery_hub">Grocery hub</option>
            <option value="weekly_market">Weekly market</option>
            <option value="subsidised_outlet">Subsidised outlet</option>
          </select>

          <Slider label="Intervention radius (cells)" value={s.radius} min={1} max={5} step={1}
            onChange={(v) => setS({ ...s, radius: v })} />
          <Slider label="Added food outlets" value={s.addedOutlets} min={0} max={12} step={1}
            onChange={(v) => setS({ ...s, addedOutlets: v })} />
          <Slider label="Nearest-food distance reduction (km)" value={s.nearestFoodShift} min={0} max={1.5} step={0.1}
            onChange={(v) => setS({ ...s, nearestFoodShift: v })} />

          <p className="smallcaps mt-4 text-[9px] text-muted-foreground">Hub location (grid)</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <NumInput label="col" v={s.hubCol} onChange={(v) => setS({ ...s, hubCol: v })} />
            <NumInput label="row" v={s.hubRow} onChange={(v) => setS({ ...s, hubRow: v })} />
          </div>

          <button
            onClick={() => setS(INITIAL)}
            className="mt-4 w-full rounded-sm border border-border px-2 py-1.5 text-xs hover:bg-muted/40"
          >
            Reset scenario
          </button>
        </aside>

        {/* Before */}
        <div>
          <p className="smallcaps mb-1 text-[9px] text-muted-foreground">Baseline projection</p>
          <div className="h-[480px]">
            <MapDashboard
              hexes={MYSURU_HEXES}
              center={city.center}
              zoom={city.zoom}
              scale={0.7}
              onSelect={() => {}}
              caption="Baseline · transfer projection"
            />
          </div>
        </div>

        {/* After */}
        <div>
          <p className="smallcaps mb-1 text-[9px] text-muted-foreground">Scenario projection</p>
          <div className="h-[480px]">
            <MapDashboard
              hexes={MYSURU_HEXES}
              center={city.center}
              zoom={city.zoom}
              scale={0.7}
              scenarioShift={shift}
              onSelect={() => {}}
              caption={`Scenario · ${s.interventionType.replace("_", " ")}`}
            />
          </div>
        </div>

        {/* Summary */}
        <aside className="space-y-3">
          <div className="rounded-sm border border-border bg-background p-3">
            <p className="smallcaps text-[9px] text-muted-foreground">Scenario summary</p>
            <dl className="mt-2 grid grid-cols-2 gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">Affected nodes</dt>
              <dd className="font-mono text-foreground">{affected}</dd>
              <dt className="text-muted-foreground">Changed labels</dt>
              <dd className="font-mono text-foreground">{changedNodes}</dd>
              <dt className="text-muted-foreground">Out of food desert</dt>
              <dd className="font-mono text-foreground">{outOfDesert}</dd>
            </dl>
          </div>

          <div className="rounded-sm border border-border bg-background p-3">
            <p className="smallcaps text-[9px] text-muted-foreground">Label transitions</p>
            {transitions.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">No changes — adjust controls.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-[11px]">
                {transitions.map((t, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Swatch k={t.from} /> {LABELS[t.from].name.split(" ")[1]}
                      <span className="text-muted-foreground">→</span>
                      <Swatch k={t.to} /> {LABELS[t.to].name.split(" ")[1]}
                    </span>
                    <span className="font-mono text-foreground">{t.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-sm border border-border bg-background p-3 text-[11px] text-muted-foreground">
            <p className="smallcaps text-[9px]">Assumptions</p>
            <ul className="mt-1.5 space-y-1">
              <li>— Perturbation applied to <span className="font-mono">nearest_food_km</span> and outlet counts.</li>
              <li>— No change to road graph or population.</li>
              <li>— Confidence not recomputed; treat as comparable to baseline only.</li>
            </ul>
          </div>
          <div>
            <p className="smallcaps text-[9px] text-muted-foreground mb-1">Legend</p>
            <div className="grid grid-cols-5 gap-1">
              {LABEL_ORDER.map((k) => (
                <div key={k} className="rounded-sm p-1.5 text-center" style={{ background: LABELS[k].color }}>
                  <span className="font-mono text-[8px] text-[#1a1a1a]">{k}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px] text-foreground">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-[#3d5a80]"
      />
    </div>
  );
}
function NumInput({ label, v, onChange }: { label: string; v: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {label}
      <input
        type="number" value={v} onChange={(e) => onChange(parseInt(e.target.value || "0", 10))}
        className="w-full rounded-sm border border-border bg-background px-1.5 py-1 font-mono text-foreground"
      />
    </label>
  );
}
function Swatch({ k }: { k: LabelKey }) {
  return <span className="inline-block size-2.5 rounded-sm" style={{ background: LABELS[k].color }} />;
}
