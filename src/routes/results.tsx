import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapDashboard } from "../components/MapDashboard";
import { PredictionSidePanel } from "../components/PredictionSidePanel";
import { Legend } from "../components/Legend";
import { HEXES, type HexPrediction } from "../data/mockData";
import { MYSURU_HEXES } from "../data/mysuru";
import type { LabelKey } from "../data/labels";
import { buildAudit, useTransfer, verdictTone } from "../lib/transfer-context";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Cross-city projection — Results" }] }),
  component: Results,
});

function Results() {
  const { source, target } = useTransfer();
  const audit = buildAudit(source, target);
  const tone = verdictTone(audit.verdict);
  const [sel, setSel] = useState<HexPrediction | null>(null);
  const [filter, setFilter] = useState<LabelKey | null>(null);

  // Only Mysuru has projected hexes wired in. Source-city (Bengaluru) is shown
  // only for reference; everything else is "no projection available".
  const projection: HexPrediction[] | null = target?.id === "mysuru" ? MYSURU_HEXES : null;

  const labelCounts = (projection ?? []).reduce<Record<string, number>>((acc, h) => {
    acc[h.predicted] = (acc[h.predicted] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-8 pb-16">
      {/* Always-on transfer header */}
      <section className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 border border-border bg-[color:var(--color-paper)] p-5">
        <Pair k="Source model" v={`${source.training_city} GraphSAGE checkpoint`} sub={source.id} />
        <Arrow />
        <Pair k="Transferred to" v={target ? `${target.display_name}, ${target.country}` : "—"} sub={target?.osm_place_name ?? ""} />
        <div className="h-10 w-px bg-border" />
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Result type</p>
          <p className="mt-0.5 font-serif text-base text-foreground">Cross-city projection</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.dot }} />
            <span className="smallcaps text-[9px] text-muted-foreground">Validation: no local target labels</span>
          </div>
        </div>
      </section>

      {!projection ? (
        <section className="mt-8 border border-dashed border-border bg-[color:var(--color-paper)] p-10 text-center">
          <h2 className="font-serif text-xl text-foreground">No projection available for this target</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm italic text-[color:var(--color-ink-deep)]">
            {target
              ? `${target.display_name} has no completed transfer run. Return to the audit and run the pipeline.`
              : "Select a target city first."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link to="/" className="smallcaps text-[10px] text-muted-foreground hover:text-foreground">← Source workspace</Link>
            <Link to="/run" className="smallcaps text-[10px] rounded-sm bg-foreground px-4 py-2 text-background">Run transfer</Link>
          </div>
          <p className="mt-6 text-[10px] italic text-muted-foreground">
            Available demonstration: Bengaluru checkpoint → Mysuru target.
          </p>
          {/* Source-side reference (Bengaluru) so the page isn't empty. */}
          <div className="mx-auto mt-8 max-w-3xl text-left">
            <p className="smallcaps text-[10px] text-muted-foreground">Source-city reference (not a projection)</p>
            <div className="mt-2 h-[360px]">
              <MapDashboard
                hexes={HEXES}
                center={[77.5946, 12.9716]}
                zoom={10.1}
                onSelect={() => {}}
                caption="Bengaluru · source-city training labels"
              />
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr_360px]">
            <aside className="space-y-4">
              <Legend active={filter} onToggle={(k) => setFilter((p) => (p === k ? null : k))} />
              <section className="border border-border bg-[color:var(--color-paper)] p-4">
                <p className="smallcaps text-[10px] text-muted-foreground">Projected label distribution</p>
                <ul className="mt-2 space-y-1.5 text-[11px]">
                  {Object.entries(labelCounts).map(([k, n]) => (
                    <li key={k} className="flex items-center justify-between">
                      <span className="capitalize text-foreground">{k}</span>
                      <span className="font-mono text-muted-foreground">{n}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="border border-dashed border-[color:var(--color-desert)] bg-background/40 p-4">
                <p className="smallcaps text-[10px]" style={{ color: "#b85c4a" }}>Transfer warnings</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] italic text-[color:var(--color-ink-deep)]">
                  <li>Affordability & quality imputed from Bengaluru priors.</li>
                  <li>No local labels — accuracy cannot be quantified.</li>
                  <li>Treat projection as a planning prior, never ground truth.</li>
                </ul>
              </section>
            </aside>
            <div className="h-[640px]">
              <MapDashboard
                hexes={projection}
                center={target!.center}
                zoom={target!.zoom}
                scale={0.7}
                filterLabel={filter}
                onSelect={setSel}
                selectedId={sel?.id ?? null}
                caption={`${target!.display_name} · cross-city projection (${source.id})`}
              />
            </div>
            <aside className="h-[640px]">
              <PredictionSidePanel hex={sel} onClose={() => setSel(null)} />
            </aside>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Link to="/run" className="smallcaps text-[10px] text-muted-foreground hover:text-foreground">← Back to run</Link>
            <Link to="/scenario-lab" className="smallcaps text-[10px] rounded-sm bg-foreground px-4 py-2.5 text-background hover:bg-foreground/85">
              Open scenario lab →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function Pair({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div>
      <p className="smallcaps text-[10px] text-muted-foreground">{k}</p>
      <p className="mt-0.5 font-serif text-base text-foreground">{v}</p>
      {sub && <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="60" height="14" viewBox="0 0 60 14" className="text-foreground/60">
      <line x1="2" y1="7" x2="54" y2="7" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
      <path d="M54 3 L58 7 L54 11 Z" fill="currentColor" />
    </svg>
  );
}
