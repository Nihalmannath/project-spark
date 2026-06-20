import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { buildAudit, useTransfer } from "../lib/transfer-context";

export const Route = createFileRoute("/run")({
  component: RunScreen,
});

const STAGES = [
  { key: "data", label: "Target city data", note: "Boundary · roads · POIs" },
  { key: "graph", label: "Road graph", note: "OSM drivable, simplified" },
  { key: "nodes", label: "Intersection nodes", note: "One node per intersection" },
  { key: "agg", label: "800m / 1500m aggregation", note: "Food, population, demand" },
  { key: "scaler", label: "Source-city scaler", note: "StandardScaler from training" },
  { key: "model", label: "Frozen source model", note: "Weights from source checkpoint" },
  { key: "out", label: "Target-city projection", note: "Per-node label + confidence" },
] as const;

export function RunScreen() {
  const { source, target } = useTransfer();
  const audit = buildAudit(source, target);
  const blocked = audit.verdict === "INSUFFICIENT" || audit.verdict === "LOCAL_TRAINING";
  const [stage, setStage] = useState<number>(-1);
  const [done, setDone] = useState(false);

  function start() {
    if (blocked || !target) return;
    setDone(false);
    setStage(0);
    let i = 0;
    const tick = () => {
      i += 1;
      if (i >= STAGES.length) {
        setStage(STAGES.length - 1);
        setDone(true);
        return;
      }
      setStage(i);
      setTimeout(tick, 600);
    };
    setTimeout(tick, 600);
  }

  const runId = `run_${target?.id ?? "none"}_${source.id}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-16">
      <header className="mb-6">
        <p className="smallcaps text-[10px] text-muted-foreground">Transfer workspace · step 04</p>
        <h1 className="mt-1 font-serif text-[28px] leading-tight tracking-tight text-foreground">
          Apply the source model to the target city.
        </h1>
        <p className="mt-2 max-w-[820px] text-sm italic text-[color:var(--color-ink-deep)]">
          The pipeline freezes the source checkpoint's weights and scaler, builds the target city's
          graph + features, then projects per-intersection labels.
        </p>
      </header>

      {/* Pipeline visualisation */}
      <section className="border border-border bg-[color:var(--color-paper)] p-6">
        <div className="grid grid-cols-7 gap-2">
          {STAGES.map((s, i) => {
            const active = stage >= i;
            const current = stage === i && !done;
            return (
              <div key={s.key} className="flex flex-col items-center text-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border text-[11px] font-mono ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground"
                  } ${current ? "animate-pulse" : ""}`}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="mt-2 text-[11px] font-serif text-foreground">{s.label}</p>
                <p className="font-mono text-[9px] text-muted-foreground">{s.note}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-muted)]">
          <div
            className="bg-foreground transition-[width] duration-500"
            style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
          />
        </div>
      </section>

      {/* Run record */}
      <div className="mt-6 grid grid-cols-[1.4fr_1fr] gap-6">
        <section className="hairline border border-border bg-[color:var(--color-paper)] p-6">
          <h2 className="font-serif text-base text-foreground">Per-node aggregation</h2>
          <p className="mt-1 text-[11px] italic text-muted-foreground">
            For every intersection node, the pipeline aggregates within 800m and 1500m catchments.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
            {[
              "Road connectivity",
              "Intersection density",
              "Food outlets",
              "Groceries",
              "Restaurants",
              "Nearest-food distance",
              "Affordability indicators",
              "Food quality / diversity",
              "Population / demand context",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 border-b border-border/60 pb-1">
                <span className="h-1.5 w-1.5 bg-foreground/70" />
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="hairline border border-border bg-[color:var(--color-paper)] p-6">
          <h2 className="font-serif text-base text-foreground">Transfer run record</h2>
          <dl className="mt-3 space-y-1.5 font-mono text-[11px]">
            <Row k="run_id" v={runId} />
            <Row k="source_checkpoint_id" v={source.id} />
            <Row k="target_city_id" v={target?.id ?? "—"} />
            <Row k="feature_schema_version" v={source.feature_schema_version.split(" ")[0]} />
            <Row
              k="input_dataset_versions"
              v={target?.id === "mysuru" ? "osm_2025-08, places_2025-09" : "—"}
            />
            <Row k="compatibility_audit" v={audit.verdict.toLowerCase()} />
            <Row k="status" v={done ? "succeeded" : stage >= 0 ? "running" : "idle"} />
            <Row k="run_timestamp" v={new Date().toISOString()} />
          </dl>
          {audit.verdict === "CAUTION" && (
            <p className="mt-3 rounded-sm border border-dashed border-[color:var(--color-desert)] bg-background/40 p-2 text-[10px] italic text-[color:var(--color-ink-deep)]">
              Mysuru affordability is unavailable. The promoted notebook model therefore reports
              learned projections with calibrated abstention, not observed local classes.
            </p>
          )}
        </section>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Link
          to="/audit"
          className="smallcaps text-[10px] text-muted-foreground hover:text-foreground"
        >
          ← Back to audit
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={start}
            disabled={blocked || stage >= 0}
            className="smallcaps text-[10px] rounded-sm border border-foreground bg-background px-4 py-2.5 text-foreground disabled:opacity-40"
          >
            {stage >= 0 ? (done ? "Run complete" : "Running…") : "Start transfer run"}
          </button>
          <Link
            to="/results"
            className={`smallcaps text-[10px] rounded-sm px-4 py-2.5 ${
              done
                ? "bg-foreground text-background hover:bg-foreground/85"
                : "bg-muted text-muted-foreground"
            }`}
          >
            View results →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate text-foreground">{v}</dd>
    </div>
  );
}
