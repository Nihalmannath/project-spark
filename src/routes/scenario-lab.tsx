import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { NodeMap } from "../components/NodeMap";
import { NodeSidePanel } from "../components/NodeSidePanel";
import { AnywhereScenario } from "../components/AnywhereScenario";
import { Term } from "../components/Term";
import { fetchMeta, inferenceHealthy, runScenario, type ScenarioParams } from "../lib/inference";
import { CITY_INFO, labelColor, type NodeProps, type ScenarioResult } from "../data/realData";
import { LABELS, type LabelKey } from "../data/labels";

export const Route = createFileRoute("/scenario-lab")({
  validateSearch: (search: Record<string, unknown>) => ({
    city: search.city === "bengaluru" ? "bengaluru" : "mysuru",
  }),
  head: () => ({ meta: [{ title: "Transfer & Scenario — Food Spatial Intelligence" }] }),
  component: TransferScenario,
});

const SCENARIO_CITIES = ["bengaluru", "mysuru"] as const;
type ScenarioCity = (typeof SCENARIO_CITIES)[number];
const DEFAULTS: Required<Omit<ScenarioParams, "hub">> = {
  radius_m: 2000,
  d_food_800: 12,
  d_food_1500: 25,
  near_floor: 0.15,
  dens_mult: 1,
  grocery_outlets: 6,
  restaurant_outlets: 6,
  outlet_categories: [],
  cuisine_categories: [],
};

function TransferScenario() {
  const { city } = Route.useSearch();
  const navigate = Route.useNavigate();
  const info = CITY_INFO[city];
  const meta = useQuery({ queryKey: ["meta", city], queryFn: () => fetchMeta(city) });
  const health = useQuery({
    queryKey: ["health"],
    queryFn: inferenceHealthy,
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

  const [hub, setHub] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(DEFAULTS.radius_m);
  const [groceryOutlets, setGroceryOutlets] = useState(DEFAULTS.grocery_outlets);
  const [restaurantOutlets, setRestaurantOutlets] = useState(DEFAULTS.restaurant_outlets);
  const [pickMode, setPickMode] = useState(true);
  const [anywhere, setAnywhere] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<NodeProps | null>(null);

  const changeById = useMemo(() => {
    const m = new Map<number, ScenarioResult["changed"][number]>();
    result?.changed.forEach((c) => m.set(c.id, c));
    return m;
  }, [result]);

  async function run() {
    if (!hub) return;
    setRunning(true);
    setErr(null);
    try {
      const r = await runScenario(city, {
        hub,
        radius_m: radius,
        grocery_outlets: groceryOutlets,
        restaurant_outlets: restaurantOutlets,
      });
      setResult(r);
      setPickMode(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "scenario failed");
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setResult(null);
    setHub(null);
    setSel(null);
    setPickMode(true);
    setErr(null);
  }

  function selectCity(nextCity: ScenarioCity) {
    if (nextCity === city) return;
    reset();
    void navigate({ search: { city: nextCity }, replace: true });
  }

  const serviceDown = health.isFetched && !health.data;
  const modelPromoted = meta.data?.model.status === "promoted";

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-16">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">
            {info.name} · {city === "bengaluru" ? "local model scenario" : "transfer projection"} ·{" "}
            {city === "bengaluru" ? "ward-target evidence" : "no local ground truth"}
          </p>
          <h1 className="mt-1 font-serif text-[28px] leading-tight tracking-tight text-foreground">
            What changes if we add food access here?
          </h1>
          <p className="mt-2 max-w-[820px] text-sm text-[color:var(--color-ink-deep)]">
            Place a jobs hub on {info.name}'s {meta.data?.n_nodes?.toLocaleString() ?? ""} road{" "}
            <Term
              explain={`Road-intersection nodes from OpenStreetMap. Food counts and nearest-outlet distance are calculated on the real ${info.name} road network.`}
            >
              nodes
            </Term>
            , then rebuild affected OSM features against the{" "}
            <Term
              explain={`Each changed feature is scored against ${info.name}'s fixed original empirical distribution, avoiding a whole-city re-rank after a local intervention.`}
            >
              fixed baseline feature distribution
            </Term>{" "}
            and rerun the calibrated model with{" "}
            <Term explain="A promoted GraphSAGE model can change connected neighbours through message passing even when their own POI counts are unchanged.">
              graph-aware inference
            </Term>
            .
          </p>
        </div>
        <div
          className="flex rounded-sm border border-border bg-card p-1"
          aria-label="Scenario city"
        >
          {SCENARIO_CITIES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              onClick={() => selectCity(candidate)}
              aria-pressed={city === candidate}
              className={`rounded-sm px-3 py-2 text-[11px] transition-colors ${
                city === candidate
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {CITY_INFO[candidate].name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAnywhere((v) => !v)}
            aria-pressed={anywhere}
            className={`rounded-sm px-3 py-2 text-[11px] transition-colors ${
              anywhere
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Anywhere
          </button>
        </div>
      </header>

      {serviceDown && (
        <div className="mb-4 rounded-sm border border-[#d59e71] bg-[#fffaf0] px-4 py-3 text-[12px] text-[#7a4a1f]">
          <span className="font-semibold">Inference service offline.</span> The baseline map still
          loads, but running a scenario needs the Python service. From the project folder, use{" "}
          <code className="rounded bg-black/5 px-1 font-mono">npm run dev</code> to start both the UI
          and inference service.
        </div>
      )}

      {anywhere ? (
        <AnywhereScenario />
      ) : (
      <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
        {/* Controls */}
        <aside className="space-y-4">
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
            <button
              onClick={() => setPickMode((p) => !p)}
              className={`mt-3 w-full rounded-sm border px-3 py-2 text-[11px] transition-colors ${
                pickMode
                  ? "border-foreground bg-[color:var(--color-muted)]"
                  : "border-border hover:border-foreground/40"
              }`}
            >
              {pickMode ? "Click map to place…" : "Re-place hub"}
            </button>

            <Slider
              label={
                <>
                  Intervention service radius{" "}
                  <Term explain="Limits direct count and nearest-distance changes. The model can still propagate effects to connected neighbours outside this boundary.">
                    (metres)
                  </Term>
                </>
              }
              value={radius}
              min={500}
              max={4000}
              step={250}
              onChange={setRadius}
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
              The solid terracotta map boundary is the selected service area. Inside it, counts and
              nearest distances use fixed 800 m and 1,500 m catchments. GraphSAGE sees the combined
              total; grocery share and category diversity remain a separate OSM composition proxy.
              No price, cuisine, nutrition, or affordability change is assumed.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={run}
                disabled={!hub || running || serviceDown}
                className="flex-1 rounded-sm bg-foreground px-3 py-2.5 smallcaps text-[10px] text-background hover:bg-foreground/85 disabled:opacity-40"
              >
                {running ? "Recalculating…" : "Run projection →"}
              </button>
              <button
                onClick={reset}
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
                    <Stat k="Restaurants placed" v={`+${result.outlet_intervention.restaurant_outlets}`} />
                    <Stat k="Service radius" v={`${(result.outlet_intervention.intervention_radius_m / 1000).toFixed(2)} km`} />
                    <Stat k="Nodes in service area" v={result.outlet_intervention.nodes_within_intervention.toLocaleString()} />
                    <Stat k="Nodes within 800 m" v={result.outlet_intervention.nodes_within_800m.toLocaleString()} />
                    <Stat k="Nodes within 1,500 m" v={result.outlet_intervention.nodes_within_1500m.toLocaleString()} />
                  </>
                )}
                <Stat
                  k="Moved out of food desert"
                  v={result.moved_out_of_desert.toLocaleString()}
                  accent
                />
                <Stat k="Graph spillover nodes" v={result.spillover.toLocaleString()} />
                <Stat
                  k="Inference method"
                  v={result.intervention_evidence === "model" ? "Notebook GraphSAGE" : "Fallback"}
                />
                {!result.model_promotion_passed && (
                  <Stat
                    k="Candidate model changes"
                    v={(result.candidate_model_changed_count ?? 0).toLocaleString()}
                  />
                )}
              </dl>
              {result.proxy_summary && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="smallcaps text-[9px] text-muted-foreground">
                    Composition proxy · affected catchment median
                  </p>
                  <dl className="mt-2 space-y-1.5 text-[10px]">
                    <MetricDelta label="Grocery share" metric={result.proxy_summary.grocery_share_pct} suffix="%" />
                    <MetricDelta label="Category diversity" metric={result.proxy_summary.category_diversity_pct} suffix="%" />
                    <MetricDelta label="Category coverage" metric={result.proxy_summary.category_coverage_pct} suffix="%" />
                    <MetricDelta label="Quality proxy" metric={result.proxy_summary.quality_proxy} />
                  </dl>
                  <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
                    Supporting OSM proxy only; it does not override the GraphSAGE class.
                  </p>
                </div>
              )}
              {result.transitions.length > 0 && (
                <>
                  <p className="smallcaps mt-3 text-[9px] text-muted-foreground">
                    Label transitions
                  </p>
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
            {city === "bengaluru"
              ? "Bengaluru scenario labels are model projections trained on published ward targets; the observed evidence map remains unchanged."
              : modelPromoted
                ? "Model projection — no Mysuru ground truth. Mirage and oasis are learned patterns; affordability remains unavailable."
                : "The notebook reconstruction did not meet its release gate, so the conservative proxy remains visible."}
          </p>
        </aside>

        {/* Map */}
        <div className="h-[640px]">
          <NodeMap
            geojsonUrl={`/data/${city}_nodes.geojson`}
            center={info.center}
            zoom={info.zoom}
            hub={hub}
            radiusM={radius}
            pickHub={pickMode}
            onPickHub={(ll) => {
              setHub(ll);
            }}
            scenarioChanges={result?.changed ?? null}
            onSelect={setSel}
            selectedId={sel?.id ?? null}
            caption={
              result
                ? `After scenario · ${result.intervention_evidence === "model" ? "GraphSAGE" : "proxy fallback"}`
                : `${info.name} · model scenario baseline`
            }
            labelProperty="model_label"
          />
        </div>

        {/* Inspect */}
        <aside className="h-[640px]">
          <NodeSidePanel
            node={sel}
            change={sel ? (changeById.get(sel.id) ?? null) : null}
            onClose={() => setSel(null)}
          />
        </aside>
      </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Link
          to="/results"
          search={{ city: city as "bengaluru" | "mysuru", view: "road" }}
          className="smallcaps text-[10px] text-muted-foreground hover:text-foreground"
        >
          ← Back to evidence map
        </Link>
        <span className="text-[11px] text-muted-foreground">
          {city === "bengaluru" ? "Bengaluru local scenario" : "Notebook 04 transfer"} · eight
          transferable OSM features · calibrated probabilities · uncertainty abstention
        </span>
      </div>
    </div>
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
        className={`font-mono text-base ${accent ? "text-[color:var(--color-oasis-deep,#3f6b46)] font-semibold" : "text-foreground"}`}
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
