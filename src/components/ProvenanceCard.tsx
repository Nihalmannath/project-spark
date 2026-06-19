import { api, type ModelRun } from "../data/platform";

export function ProvenanceCard({ run }: { run: ModelRun }) {
  const ckpt = api.getCheckpoint(run.checkpoint_id);
  const runTypeLabel = {
    LOCAL_MODEL: "Local model",
    TRANSFER_PROJECTION: "Transfer projection",
    PLANNING_SCENARIO: "Planning scenario",
  }[run.run_type];

  return (
    <div className="rounded-sm border border-border bg-background p-4">
      <p className="smallcaps text-[9px] text-muted-foreground">Model provenance</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <dt className="text-muted-foreground">Run type</dt>
        <dd className="font-mono text-foreground">{runTypeLabel}</dd>
        <dt className="text-muted-foreground">Source checkpoint</dt>
        <dd className="font-mono text-foreground">{ckpt?.id}</dd>
        <dt className="text-muted-foreground">Trained in</dt>
        <dd className="font-mono text-foreground">{ckpt?.training_city}</dd>
        <dt className="text-muted-foreground">Target definition</dt>
        <dd className="font-mono text-foreground">{ckpt?.target_definition}</dd>
        <dt className="text-muted-foreground">Feature schema</dt>
        <dd className="font-mono text-foreground">{ckpt?.feature_schema_version}</dd>
        <dt className="text-muted-foreground">Validation policy</dt>
        <dd className="font-mono text-foreground">{ckpt?.validation_policy}</dd>
        <dt className="text-muted-foreground">Feature coverage</dt>
        <dd className="font-mono text-foreground">{(run.feature_coverage * 100).toFixed(0)}%</dd>
        <dt className="text-muted-foreground">Output version</dt>
        <dd className="font-mono text-foreground">{run.output_version}</dd>
      </dl>
      {run.warnings.length > 0 && (
        <div className="mt-3 rounded-sm border border-[#d59e71]/40 bg-[#fbeede]/60 p-2.5">
          <p className="smallcaps text-[9px] text-[#7a4a1f]">Warnings</p>
          <ul className="mt-1 space-y-1 text-[11px] text-[#7a4a1f]">
            {run.warnings.map((w, i) => (
              <li key={i}>— {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
