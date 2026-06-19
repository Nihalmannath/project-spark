import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ConfusionMatrixCard } from "../components/ConfusionMatrixCard";
import { CONFUSION_MATRICES, CHECKPOINT_METRICS, CHECKPOINTS } from "../data/mockData";

export const Route = createFileRoute("/validation")({
  head: () => ({
    meta: [
      { title: "Validation — Food Spatial Intelligence" },
      { name: "description", content: "Confusion matrix and validation metrics per checkpoint." },
    ],
  }),
  component: ValidationPage,
});

const CKPT_OPTIONS = [
  ...CHECKPOINTS.map((c) => ({ id: c.id, label: c.name })),
  { id: "03b_rich_features", label: "03b — Rich features (additional)" },
];

function ValidationPage() {
  const [ckpt, setCkpt] = useState(CKPT_OPTIONS[0].id);
  const matrix = CONFUSION_MATRICES[ckpt];
  const metrics = CHECKPOINT_METRICS[ckpt];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Confusion Matrix · Validation</p>
          <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-foreground">
            Per-checkpoint validation
          </h1>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Checkpoint
          <select
            value={ckpt}
            onChange={(e) => setCkpt(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CKPT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ConfusionMatrixCard matrix={matrix} />
        <div className="space-y-3">
          <MetricRow label="Accuracy" value={metrics.accuracy} />
          <MetricRow label="Macro-F1" value={metrics.macroF1} />
          <MetricRow label="Precision (macro)" value={metrics.precision} />
          <MetricRow label="Recall (macro)" value={metrics.recall} />
          <p className="rounded-md border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
            Placeholder metrics. Drop real per-checkpoint evaluation JSONs into the repo and they'll
            populate these cards automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between rounded-md border border-border bg-card px-4 py-3 shadow-sm">
      <span className="smallcaps text-[10px] text-muted-foreground">{label}</span>
      <span className="metric-num text-2xl text-foreground">{value.toFixed(3)}</span>
    </div>
  );
}
