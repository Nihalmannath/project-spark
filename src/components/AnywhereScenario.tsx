import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NodeMap } from "./NodeMap";
import { NodeSidePanel } from "./NodeSidePanel";
import { LocationPicker } from "./LocationPicker";
import { extractLocation, runScenarioAt, type ExtractedLocation } from "../lib/inference";
import { labelColor, type NodeProps, type ScenarioResult } from "../data/realData";
import { LABELS, type LabelKey } from "../data/labels";

const STAGES = [
  "Downloading the OSM road network",
  "Rebuilding the transferable features",
  "Running the frozen Bengaluru model",
];

export function AnywhereScenario() {
  // location pick
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [extracted, setExtracted] = useState<ExtractedLocation | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  // scenario
  const [hub, setHub] = useState<[number, number] | null>(null);
  const [hubRadius, setHubRadius] = useState(2000);
  const [groceryOutlets, setGroceryOutlets] = useState(6);
  const [restaurantOutlets, setRestaurantOutlets] = useState(6);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [running, setRunning] = useState(false);
  const [sel, setSel] = useState<NodeProps | null>(null);

  const nodesUrl = useMemo(
    () =>
      extracted
        ? URL.createObjectURL(
            new Blob([JSON.stringify(extracted.nodes)], { type: "application/json" }),
          )
        : null,
    [extracted],
  );
  useEffect(
    () => () => {
      if (nodesUrl) URL.revokeObjectURL(nodesUrl);
    },
    [nodesUrl],
  );

  const changeById = useMemo(() => {
    const m = new Map<number, ScenarioResult["changed"][number]>();
    result?.changed.forEach((c) => m.set(c.id, c));
    return m;
  }, [result]);

  async function download() {
    if (!center) return;
    setBusy(true);
    setErr(null);
    setStage(0);
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4500);
    try {
      const ex = await extractLocation({
        lat: center[1],
        lon: center[0],
        radius_m: radiusKm * 1000,
      });
      setExtracted(ex);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "extraction failed");
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  }

  async function run() {
    if (!extracted || !hub) return;
    setRunning(true);
    setErr(null);
    try {
      const r = await runScenarioAt(extracted.city_id, {
        hub,
        radius_m: hubRadius,
        grocery_outlets: groceryOutlets,
        restaurant_outlets: restaurantOutlets,
      });
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "scenario failed");
    } finally {
      setRunning(false);
    }
  }

  function resetLocation() {
    setExtracted(null);
    setHub(null);
    setResult(null);
    setSel(null);
    setErr(null);
  }

  // ---------------------------------------------------------------- PICK PHASE
  if (!extracted) {
    const areaKm2 = Math.round(Math.PI * radiusKm * radiusKm);
    return (
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-sm border border-border bg-[color:var(--color-paper)] p-4">
            <p className="smallcaps text-[10px] text-muted-foreground">Pick any location</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--color-ink-deep)]">
              Search or click the map to choose an area centre. We download that patch of
              OpenStreetMap, rebuild the transferable features, and run the frozen Bengaluru model
              on it — a live transfer to anywhere.
            </p>
            <Slider
              label="Area radius"
              value={radiusKm}
              min={1}
              max={10}
              step={0.5}
              onChange={setRadiusKm}
              fmt={(v) => `${v.toFixed(1)} km`}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              ≈ {areaKm2} km² · larger areas take longer to download.
            </p>
            <button
              onClick={download}
              disabled={!center || busy}
              className="mt-4 w-full rounded-sm bg-foreground px-3 py-2.5 smallcaps text-[10px] text-background hover:bg-foreground/85 disabled:opacity-40"
            >
              {busy ? "Working…" : "Download this area →"}
            </button>
            {center && (
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                centre {center[1].toFixed(4)}, {center[0].toFixed(4)}
              </p>
            )}
            {err && <p className="mt-2 text-[11px] text-[color:var(--color-desert)]">{err}</p>}
          </section>

          <AnimatePresence>{busy && <LoadingCard stage={stage} />}</AnimatePresence>

          <p className="text-[11px] italic leading-relaxed text-muted-foreground">
            Anywhere outside Bengaluru is a transfer projection: labels are the model's best guess
            from OSM signal, and out-of-distribution areas abstain as <em>unknown</em>.
          </p>
        </aside>

        <div className="h-[640px]">
          <LocationPicker center={center} radiusM={radiusKm * 1000} onPick={setCenter} />
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ SCENARIO PHASE
  const unknown = extracted.meta.label_counts?.unknown ?? 0;
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
      <aside className="space-y-4">
        <section className="rounded-sm border border-border bg-[color:var(--color-paper)] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="smallcaps text-[10px] text-muted-foreground">Your location</p>
              <p className="mt-1 font-mono text-[11px] text-foreground">
                {extracted.center[1].toFixed(3)}, {extracted.center[0].toFixed(3)}
              </p>
            </div>
            <button
              onClick={resetLocation}
              className="smallcaps shrink-0 rounded-sm border border-border px-2 py-1 text-[9px] text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            >
              ← change
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {extracted.meta.n_nodes.toLocaleString()} road nodes · {unknown.toLocaleString()}{" "}
            abstained (out of distribution)
          </p>
        </section>

        <section className="rounded-sm border border-border bg-[color:var(--color-paper)] p-4">
          <p className="smallcaps text-[10px] text-muted-foreground">Place the intervention</p>
          <p className="mt-2 text-[12px] text-[color:var(--color-ink-deep)]">
            {hub ? (
              <>
                Hub at{" "}
                <span className="font-mono">
                  {hub[1].toFixed(4)}, {hub[0].toFixed(4)}
                </span>
              </>
            ) : (
              "Click the map to drop a jobs hub."
            )}
          </p>
          <Slider
            label="Intervention service radius"
            value={hubRadius}
            min={500}
            max={4000}
            step={250}
            onChange={setHubRadius}
            fmt={(v) => `${(v / 1000).toFixed(2)} km`}
          />
          <Slider
            label="New grocery outlets at hub"
            value={groceryOutlets}
            min={0}
            max={30 - restaurantOutlets}
            step={1}
            onChange={setGroceryOutlets}
            fmt={(v) => `+${v}`}
          />
          <Slider
            label="New restaurant outlets at hub"
            value={restaurantOutlets}
            min={0}
            max={30 - groceryOutlets}
            step={1}
            onChange={setRestaurantOutlets}
            fmt={(v) => `+${v}`}
          />
          <p className="mt-3 font-mono text-[10px] text-foreground">
            {groceryOutlets + restaurantOutlets}/30 outlets · one hub location
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            GraphSAGE uses the combined access total. Grocery share and category diversity are
            reported separately as supporting OSM proxy evidence.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={run}
              disabled={!hub || running}
              className="flex-1 rounded-sm bg-foreground px-3 py-2.5 smallcaps text-[10px] text-background hover:bg-foreground/85 disabled:opacity-40"
            >
              {running ? "Recalculating…" : "Run projection →"}
            </button>
            <button
              onClick={() => {
                setResult(null);
                setHub(null);
                setSel(null);
              }}
              className="rounded-sm border border-border px-3 py-2.5 smallcaps text-[10px] hover:bg-muted/40"
            >
              Reset
            </button>
          </div>
          {err && <p className="mt-2 text-[11px] text-[color:var(--color-desert)]">{err}</p>}
        </section>

        {result && (
          <section className="rounded-sm border border-border bg-[color:var(--color-paper)] p-4">
            <p className="smallcaps text-[10px] text-muted-foreground">Scenario readout</p>
            <dl className="mt-2 space-y-2 text-[12px]">
              <Stat k="Nodes with changed access" v={result.affected.toLocaleString()} />
              {result.outlet_intervention && (
                <>
                  <Stat k="Groceries placed" v={`+${result.outlet_intervention.grocery_outlets}`} />
                  <Stat
                    k="Restaurants placed"
                    v={`+${result.outlet_intervention.restaurant_outlets}`}
                  />
                  <Stat
                    k="Service radius"
                    v={`${(result.outlet_intervention.intervention_radius_m / 1000).toFixed(2)} km`}
                  />
                  <Stat
                    k="Nodes in service area"
                    v={result.outlet_intervention.nodes_within_intervention.toLocaleString()}
                  />
                  <Stat
                    k="Nodes within 800 m"
                    v={result.outlet_intervention.nodes_within_800m.toLocaleString()}
                  />
                  <Stat
                    k="Nodes within 1,500 m"
                    v={result.outlet_intervention.nodes_within_1500m.toLocaleString()}
                  />
                </>
              )}
              <Stat
                k="Moved out of food desert"
                v={result.moved_out_of_desert.toLocaleString()}
                accent
              />
              <Stat k="Graph spillover nodes" v={result.spillover.toLocaleString()} />
            </dl>
            {result.proxy_summary && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="smallcaps text-[9px] text-muted-foreground">
                  Composition proxy · median
                </p>
                <dl className="mt-2 space-y-1.5 text-[10px]">
                  <MetricDelta
                    label="Grocery share"
                    metric={result.proxy_summary.grocery_share_pct}
                    suffix="%"
                  />
                  <MetricDelta
                    label="Category diversity"
                    metric={result.proxy_summary.category_diversity_pct}
                    suffix="%"
                  />
                  <MetricDelta
                    label="Category coverage"
                    metric={result.proxy_summary.category_coverage_pct}
                    suffix="%"
                  />
                  <MetricDelta label="Quality proxy" metric={result.proxy_summary.quality_proxy} />
                </dl>
              </div>
            )}
            {result.transitions.length > 0 && (
              <>
                <p className="smallcaps mt-3 text-[9px] text-muted-foreground">Label transitions</p>
                <ul className="mt-1.5 space-y-1 text-[11px]">
                  {result.transitions.slice(0, 6).map((t, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <Sw k={t.from} /> {shortLabel(t.from)}
                        <span className="text-muted-foreground">→</span>
                        <Sw k={t.to} /> {shortLabel(t.to)}
                      </span>
                      <span className="font-mono text-foreground">{t.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <p className="text-[11px] italic text-muted-foreground">
          Transfer projection — no local ground truth. Read the relative movement out of food
          desert, not the absolute class.
        </p>
      </aside>

      <div className="h-[640px]">
        {nodesUrl && (
          <NodeMap
            geojsonUrl={nodesUrl}
            center={extracted.center}
            zoom={11.5}
            hub={hub}
            radiusM={hubRadius}
            pickHub
            onPickHub={setHub}
            scenarioChanges={result?.changed ?? null}
            onSelect={setSel}
            selectedId={sel?.id ?? null}
            caption={
              result ? "After scenario · transfer projection" : "Baseline · frozen Bengaluru model"
            }
            labelProperty="model_label"
          />
        )}
      </div>

      <aside className="h-[640px]">
        <NodeSidePanel
          node={sel}
          change={sel ? (changeById.get(sel.id) ?? null) : null}
          onClose={() => setSel(null)}
        />
      </aside>
    </div>
  );
}

function LoadingCard({ stage }: { stage: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-sm border border-border bg-card p-4"
    >
      <p className="smallcaps text-[10px] text-accent">Downloading & analysing</p>
      <ul className="mt-3 space-y-2">
        {STAGES.map((label, i) => (
          <li key={label} className="flex items-center gap-2.5 text-[12px]">
            <span
              className="grid size-4 place-items-center rounded-full text-[8px] font-bold text-white"
              style={{ background: i < stage ? "#7a9461" : i === stage ? "#ffc000" : "#c9d4e0" }}
            >
              {i < stage ? "✓" : ""}
            </span>
            <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>
              {label}
              {i === stage && <span className="animate-pulse"> …</span>}
            </span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px] text-foreground">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 w-full accent-[#3d5a80]"
      />
    </div>
  );
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd
        className={`font-mono text-base ${accent ? "font-semibold text-[#3f6b46]" : "text-foreground"}`}
      >
        {v}
      </dd>
    </div>
  );
}

function MetricDelta({
  label,
  metric,
  suffix = "",
}: {
  label: string;
  metric: { before_median: number | null; after_median: number | null };
  suffix?: string;
}) {
  const value = (number: number | null) => (number == null ? "—" : `${number.toFixed(1)}${suffix}`);
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-foreground">
        {value(metric.before_median)} → {value(metric.after_median)}
      </dd>
    </div>
  );
}

function shortLabel(key: LabelKey) {
  return key === "unknown" ? "Unknown" : LABELS[key].name.replace("Food ", "");
}

function Sw({ k }: { k: LabelKey }) {
  return (
    <span className="inline-block size-2.5 rounded-full" style={{ background: labelColor(k) }} />
  );
}
