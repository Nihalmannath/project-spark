import { Link } from "@tanstack/react-router";
import type { NotebookRecord } from "../data/notebooks";
import { LABELS } from "../data/labels";

export function NotebookCard({ nb }: { nb: NotebookRecord }) {
  // Visual barometer of the macro-F1 score relative to 0.8.
  const pct = Math.min(1, nb.metrics.macroF1 / 0.8) * 100;
  return (
    <article className="group flex h-full flex-col rounded-sm border border-border bg-card transition-shadow hover:shadow-[0_6px_30px_-12px_rgba(61,90,128,0.25)]">
      <header className="border-b border-border px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[10px] tracking-widest text-[color:var(--color-amber)]">
            / NB · {nb.number.toUpperCase()}
          </span>
          {nb.isHeadline && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--color-navy)]">
              Headline
            </span>
          )}
        </div>
        <h3 className="mt-2 text-base font-light italic leading-snug text-[color:var(--color-navy)]">
          {nb.title}
        </h3>
      </header>

      <div className="flex flex-1 flex-col px-5 py-4">
        <p className="text-xs leading-relaxed text-foreground">{nb.tagline}</p>

        {/* Macro-F1 bar */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <span className="smallcaps text-muted-foreground">Macro-F1</span>
            <span className="metric-num text-xl text-[color:var(--color-navy)]">
              {nb.metrics.macroF1.toFixed(3)}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--color-paper)]">
            <div
              className="h-full"
              style={{
                width: `${pct}%`,
                backgroundColor: nb.isHeadline ? "var(--color-amber)" : "var(--color-navy)",
              }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground">
            <span>0.00</span><span>0.80</span>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="smallcaps text-muted-foreground">Accuracy</dt>
            <dd className="metric-num mt-1 text-base text-foreground">
              {nb.metrics.accuracy ? nb.metrics.accuracy.toFixed(3) : "—"}
            </dd>
          </div>
          <div>
            <dt className="smallcaps text-muted-foreground">Target</dt>
            <dd className="mt-1 text-[11px] text-foreground">{nb.targetType}</dd>
          </div>
        </dl>

        {/* Per-class F1 chips when present */}
        {nb.metrics.perClassF1 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Object.entries(nb.metrics.perClassF1).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px]"
                style={{
                  backgroundColor: LABELS[k as keyof typeof LABELS].color,
                  color: k === "swamp" ? "#fff" : "#1a1a1a",
                }}
              >
                {k} · {v!.toFixed(2)}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-5">
          <Link
            to="/notebooks/$id"
            params={{ id: nb.id }}
            className="smallcaps inline-flex items-center gap-2 text-[color:var(--color-navy)] hover:text-[color:var(--color-amber)]"
          >
            View output <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
