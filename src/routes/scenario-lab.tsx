import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { NodeMap } from "../components/NodeMap";
import { NodeSidePanel } from "../components/NodeSidePanel";
import { Term } from "../components/Term";
import { fetchMeta, inferenceHealthy, runScenario, type ScenarioParams } from "../lib/inference";
import { CITY_INFO, labelColor, type NodeProps, type ScenarioResult } from "../data/realData";
import { LABELS, type LabelKey } from "../data/labels";

export const Route = createFileRoute("/scenario-lab")({
  head: () => ({ meta: [{ title: "Transfer & Scenario — Food Spatial Intelligence" }] }),
  component: TransferScenario,
});

const CITY = "mysuru";
const DEFAULTS: Required<Omit<ScenarioParams, "hub">> = {
  radius_m: 2000,
  d_food_800: 12,
  d_food_1500: 25,
  near_floor: 0.15,
  dens_mult: 1.4,
};

function TransferScenario() {
  const info = CITY_INFO[CITY];
  const meta = useQuery({ queryKey: ["meta", CITY], queryFn: () => fetchMeta(CITY) });
  const health = useQuery({ queryKey: ["health"], queryFn: inferenceHealthy, staleTime: 10_000 });

  const [hub, setHub] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(DEFAULTS.radius_m);
  const [dFood, setDFood] = useState(DEFAULTS.d_food_800);
  const [pickMode, setPickMode] = useState(true);
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
      const r = await runScenario(CITY, {
        hub,
        radius_m: radius,
        d_food_800: dFood,
        d_food_1500: dFood * 2,
        near_floor: DEFAULTS.near_floor,
        dens_mult: DEFAULTS.dens_mult,
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

  const serviceDown = health.isFetched && !health.data;

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-16">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">
            Transfer · frozen Bengaluru model → Mysuru · jobs-hub intervention
          </p>
          <h1 className="mt-1 font-serif text-[28px] leading-tight tracking-tight text-foreground">
            What changes if we add food access here?
          </h1>
          <p className="mt-2 max-w-[820px] text-sm text-[color:var(--color-ink-deep)]">
            Place a jobs hub on Mysuru's {meta.data?.n_nodes?.toLocaleString() ?? ""} road{" "}
            <Term explain="Road-intersection nodes from OpenStreetMap. The transferable OSM features (food counts, nearest-food distance, road structure) are rebuilt with the exact same code as Bengaluru — a fair transfer.">nodes</Term>
            , then re-score the intervened zone against the{" "}
            <Term explain="Fixed baseline ECDF: each node's access is ranked against the city's original distribution, so only the intervened area (and its graph neighbours) move — not the whole city.">fixed baseline percentile</Term>{" "}
            with{" "}
            <Term explain="The improvement propagates one hop along the road graph, mimicking how GraphSAGE averages each node's neighbourhood.">graph spillover</Term>. Watch intersections move out of food&nbsp;desert.
          </p>
        </div>
      </header>

      {serviceDown && (
        <div className="mb-4 rounded-sm border-l-4 border-[#d59e71] bg-[#fffaf0] px-4 py-3 text-[12px] text-[#7a4a1f]">
          <span className="font-semibold">Inference service offline.</span> The baseline map still loads, but
          running a scenario needs the Python service. Start it with{" "}
          <code className="rounded bg-black/5 px-1 font-mono">uvicorn serve:app --port 8000</code> in{" "}
          <code className="rounded bg-black/5 px-1 font-mono">pipeline/</code>.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
        {/* Controls */}
        <aside className="space-y-4">
          <section className="rounded-sm border border-border bg-[color:var(--color-paper)] p-4">
            <p className="smallcaps text-[10px] text-muted-foreground">01 · Place the intervention</p>
            <p className="mt-2 text-[12px] text-[color:var(--color-ink-deep)]">
              {hub ? (
                <>Hub at <span className="font-mono">{hub[1].toFixed(4)}, {hub[0].toFixed(4)}</span></>
              ) : (
                "Click the map to drop a jobs hub."
              )}
            </p>
            <button
              onClick={() => setPickMode((p) => !p)}
              className={`mt-3 w-full rounded-sm border px-3 py-2 text-[11px] transition-colors ${
                pickMode ? "border-foreground bg-[color:var(--color-muted)]" : "border-border hover:border-foreground/40"
              }`}
            >
              {pickMode ? "Click map to place…" : "Re-place hub"}
            </button>

            <Slider label={<>Intervention radius <Term explain="The catchment around the hub that receives new food infrastructure (notebook 04 uses 2 km).">(metres)</Term></>}
              value={radius} min={500} max={4000} step={250} onChange={setRadius} fmt={(v) => `${(v / 1000).toFixed(2)} km`} />
            <Slider label={<>New food outlets <Term explain="Outlets added within 800 m of the hub; the ≤1500 m count rises proportionally. This is the notebook-04 perturbation.">(≤800 m)</Term></>}
              value={dFood} min={0} max={30} step={1} onChange={setDFood} fmt={(v) => `+${v}`} />

            <div className="mt-4 flex gap-2">
              <button
                onClick={run}
                disabled={!hub || running || serviceDown}
                className="flex-1 rounded-sm bg-foreground px-3 py-2.5 smallcaps text-[10px] text-background hover:bg-foreground/85 disabled:opacity-40"
              >
                {running ? "Running transfer…" : "Run transfer →"}
              </button>
              <button onClick={reset} className="rounded-sm border border-border px-3 py-2.5 smallcaps text-[10px] hover:bg-muted/40">
                Reset
              </button>
            </div>
            {err && <p className="mt-2 text-[11px] text-[color:var(--color-desert)]">{err}</p>}
          </section>

          {result && (
            <section className="rounded-sm border border-border bg-[color:var(--color-paper)] p-4">
              <p className="smallcaps text-[10px] text-muted-foreground">02 · Scenario readout</p>
              <dl className="mt-2 space-y-2 text-[12px]">
                <Stat k="Intersections in zone" v={result.affected.toLocaleString()} />
                <Stat k="Moved out of food desert" v={result.moved_out_of_desert.toLocaleString()} accent />
                <Stat k="Graph spillover nodes" v={result.spillover.toLocaleString()} />
              </dl>
              {result.transitions.length > 0 && (
                <>
                  <p className="smallcaps mt-3 text-[9px] text-muted-foreground">Label transitions</p>
                  <ul className="mt-1.5 space-y-1 text-[11px]">
                    {result.transitions.slice(0, 6).map((t, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          <Sw k={t.from} /> {LABELS[t.from].name.split(" ")[1]}
                          <span className="text-muted-foreground">→</span>
                          <Sw k={t.to} /> {LABELS[t.to].name.split(" ")[1]}
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
            Projection — no Mysuru ground truth. The defensible claim is the <em>relative</em> movement out of
            food desert, not the absolute baseline class.
          </p>
        </aside>

        {/* Map */}
        <div className="h-[640px]">
          <NodeMap
            geojsonUrl={`/data/${CITY}_nodes.geojson`}
            center={info.center}
            zoom={info.zoom}
            hub={hub}
            radiusM={radius}
            pickHub={pickMode}
            onPickHub={(ll) => { setHub(ll); }}
            scenarioChanges={result?.changed ?? null}
            onSelect={setSel}
            selectedId={sel?.id ?? null}
            caption={result ? "After transfer · green ring = moved out of desert" : "Mysuru baseline projection"}
          />
        </div>

        {/* Inspect */}
        <aside className="h-[640px]">
          <NodeSidePanel node={sel} change={sel ? changeById.get(sel.id) ?? null : null} onClose={() => setSel(null)} />
        </aside>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link to="/results" className="smallcaps text-[10px] text-muted-foreground hover:text-foreground">
          ← Back to evidence map
        </Link>
        <span className="text-[11px] text-muted-foreground">
          Bengaluru-trained features · frozen transfer · deterministic re-score with 1-hop spillover
        </span>
      </div>
    </div>
  );
}

function Slider({
  label, value, min, max, step, onChange, fmt,
}: {
  label: ReactNode; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt: (v: number) => string;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px] text-foreground">{fmt(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
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
      <dd className={`font-mono text-base ${accent ? "text-[color:var(--color-oasis-deep,#3f6b46)] font-semibold" : "text-foreground"}`}>{v}</dd>
    </div>
  );
}

function Sw({ k }: { k: LabelKey }) {
  return <span className="inline-block size-2.5 rounded-full" style={{ background: labelColor(k) }} />;
}
