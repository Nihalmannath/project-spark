import { createFileRoute } from "@tanstack/react-router";
import { api, CHECKPOINTS_V2, RUNS } from "../data/platform";
import { useCity } from "../lib/city-context";

export const Route = createFileRoute("/runs")({
  head: () => ({ meta: [{ title: "Model Runs — Food Spatial Intelligence Platform" }] }),
  component: Runs,
});

function Runs() {
  const { city } = useCity();
  const runs = RUNS.filter((r) => r.city_id === city.id);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="flex items-end justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Model runs · {city.display_name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Metric comparisons across different target definitions are flagged with a warning.
          </p>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{runs.length} runs</span>
      </header>

      {runs.length === 0 ? (
        <div className="mt-6 rounded-sm border border-dashed border-border bg-background p-8 text-center">
          <p className="smallcaps text-[10px] text-muted-foreground">No runs</p>
          <p className="mt-2 font-serif text-base text-foreground">
            {city.display_name} has no model runs — required datasets are not yet in place.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {runs.map((r) => {
            const ckpt = api.getCheckpoint(r.checkpoint_id);
            const runType = { LOCAL_MODEL: "Local model", TRANSFER_PROJECTION: "Transfer projection", PLANNING_SCENARIO: "Planning scenario" }[r.run_type];
            return (
              <div key={r.id} className="rounded-sm border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <p className="font-mono text-[11px] text-muted-foreground">{r.id}</p>
                    <p className="mt-0.5 font-serif text-base text-foreground">{runType}</p>
                  </div>
                  <div className="text-right">
                    <p className="smallcaps text-[9px] text-muted-foreground">Output</p>
                    <p className="mt-0.5 font-mono text-[11px] text-foreground">{r.output_version}</p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs md:grid-cols-4">
                  <Field label="Source checkpoint" value={ckpt?.id || "—"} />
                  <Field label="Trained in" value={ckpt?.training_city || "—"} />
                  <Field label="Target definition" value={ckpt?.target_definition || "—"} />
                  <Field label="Feature schema" value={ckpt?.feature_schema_version || "—"} />
                  <Field label="Validation policy" value={ckpt?.validation_policy || "—"} />
                  <Field label="Feature coverage" value={`${Math.round(r.feature_coverage * 100)}%`} />
                  <Field label="Status" value={r.status} />
                  <Field label="Completed" value={r.completed_at?.slice(0, 16).replace("T", " ") || "—"} />
                </dl>
                {r.warnings.length > 0 && (
                  <div className="mt-3 rounded-sm border border-[#d59e71]/40 bg-[#fbeede]/50 p-2.5">
                    <p className="smallcaps text-[9px] text-[#7a4a1f]">Warnings</p>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-[#7a4a1f]">
                      {r.warnings.map((w, i) => <li key={i}>— {w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-lg text-foreground">All checkpoints</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Metrics from different target definitions are not comparable. Read the
          interpretation note before citing any number.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {CHECKPOINTS_V2.map((c) => (
            <div key={c.id} className="rounded-sm border border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] text-muted-foreground">{c.id}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{c.training_date}</p>
              </div>
              <p className="mt-1 font-serif text-base text-foreground">{c.model_type}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{c.target_definition}</p>
              <div className="mt-3 grid grid-cols-4 gap-2 border-y border-border py-3 text-center text-xs">
                <Metric label="Acc" v={c.metrics.accuracy} />
                <Metric label="F1" v={c.metrics.macroF1} />
                <Metric label="P" v={c.metrics.precision} />
                <Metric label="R" v={c.metrics.recall} />
              </div>
              <p className="mt-2 text-[11px] italic text-muted-foreground">{c.interpretation_note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </>
  );
}
function Metric({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <p className="smallcaps text-[9px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-foreground">{v.toFixed(3)}</p>
    </div>
  );
}
