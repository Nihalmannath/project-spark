import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { NodeMap } from "../components/NodeMap";
import { NodeSidePanel } from "../components/NodeSidePanel";
import { Legend } from "../components/Legend";
import { Term } from "../components/Term";
import { fetchMeta } from "../lib/inference";
import { CITY_INFO, labelColor, type NodeProps } from "../data/realData";
import { LABELS, type LabelKey } from "../data/labels";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Evidence Map — Food Spatial Intelligence" }] }),
  component: EvidenceMap,
});

const CITY_KEYS = ["bengaluru", "mysuru"] as const;

function EvidenceMap() {
  const [city, setCity] = useState<(typeof CITY_KEYS)[number]>("bengaluru");
  const [sel, setSel] = useState<NodeProps | null>(null);
  const [filter, setFilter] = useState<LabelKey | null>(null);
  const info = CITY_INFO[city];
  const meta = useQuery({ queryKey: ["meta", city], queryFn: () => fetchMeta(city) });

  const counts = meta.data?.label_counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-16">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">
            Node-level food environment · {info.evidence === "AVAILABLE" ? "evidence-backed" : "transfer projection"}
          </p>
          <h1 className="mt-1 font-serif text-[28px] leading-tight tracking-tight text-foreground">
            {info.name} Food-Environment Map
          </h1>
          <p className="mt-2 max-w-[760px] text-sm text-[color:var(--color-ink-deep)]">
            {meta.data?.n_nodes?.toLocaleString() ?? "—"} road-intersection{" "}
            <Term explain="Each node is a road intersection from the OpenStreetMap drive network. The model classifies the food environment at every intersection.">nodes</Term>
            , each classified into one of four food-environment labels.{" "}
            {info.evidence === "AVAILABLE" ? (
              <>Labels inherit the published{" "}
                <Term explain="A rule-based proxy label per BBMP ward built from access, affordability, quality/diversity, stability and vulnerability signals — not a survey.">ward food-environment label</Term>.</>
            ) : (
              <>A transfer projection — no local ground truth, so read patterns, not absolutes.</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {CITY_KEYS.map((c) => (
            <button
              key={c}
              onClick={() => { setCity(c); setSel(null); setFilter(null); }}
              className={`smallcaps rounded-sm border px-3 py-2 text-[10px] transition-colors ${
                city === c ? "border-foreground bg-[color:var(--color-muted)] text-foreground" : "border-border text-muted-foreground hover:border-foreground/40"
              }`}
            >
              {CITY_INFO[c].name}
              <span className="ml-1.5" style={{ color: CITY_INFO[c].evidence === "AVAILABLE" ? "#7a9461" : "#d59e71" }}>●</span>
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_360px]">
        <aside className="space-y-4">
          <Legend active={filter} onToggle={(k) => setFilter((p) => (p === k ? null : k))} />
          <section className="border border-border bg-[color:var(--color-paper)] p-4">
            <p className="smallcaps text-[10px] text-muted-foreground">Label distribution</p>
            <ul className="mt-2 space-y-2 text-[11px]">
              {(["oasis", "mirage", "swamp", "desert", "unknown"] as LabelKey[])
                .filter((k) => counts[k])
                .map((k) => {
                  const n = counts[k] ?? 0;
                  const pct = total ? (n / total) * 100 : 0;
                  return (
                    <li key={k}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-foreground">
                          <span className="inline-block size-2.5 rounded-full" style={{ background: labelColor(k) }} />
                          {LABELS[k].name}
                        </span>
                        <span className="font-mono text-muted-foreground">{n.toLocaleString()}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[color:var(--color-muted)]">
                        <div className="h-full" style={{ width: `${pct}%`, background: labelColor(k) }} />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </section>
        </aside>

        <div className="h-[640px]">
          <NodeMap
            geojsonUrl={`/data/${city}_nodes.geojson`}
            center={info.center}
            zoom={info.zoom}
            filterLabel={filter}
            onSelect={setSel}
            selectedId={sel?.id ?? null}
            caption={`${info.name} · ${meta.data?.n_nodes?.toLocaleString() ?? ""} road nodes`}
          />
        </div>

        <aside className="h-[640px]">
          <NodeSidePanel node={sel} onClose={() => setSel(null)} />
        </aside>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="max-w-[640px] text-[11px] italic text-muted-foreground">{info.blurb}</p>
        <Link
          to="/scenario-lab"
          className="smallcaps shrink-0 rounded-sm bg-foreground px-4 py-2.5 text-[10px] text-background hover:bg-foreground/85"
        >
          Run a transfer scenario →
        </Link>
      </div>
    </div>
  );
}
