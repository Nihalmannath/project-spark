import { Link } from "@tanstack/react-router";
import type { NotebookRecord } from "../data/notebooks";

export function NotebookCard({ nb }: { nb: NotebookRecord }) {
  const inputs = nb.featureGroups.map((g) => g.group).join(" · ");
  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Notebook {nb.number}</p>
          <h3 className="mt-1 font-serif text-base font-medium leading-snug text-foreground">
            {nb.title}
          </h3>
        </div>
        {nb.isHeadline && (
          <span className="smallcaps shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[9px] text-accent">
            Headline
          </span>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{nb.tagline}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="smallcaps text-[9px] text-muted-foreground">Method</dt>
          <dd className="mt-0.5 text-foreground">{nb.model.split(",")[0]}</dd>
        </div>
        <div>
          <dt className="smallcaps text-[9px] text-muted-foreground">Target</dt>
          <dd className="mt-0.5 text-foreground">{nb.targetType}</dd>
        </div>
        <div className="col-span-2">
          <dt className="smallcaps text-[9px] text-muted-foreground">Inputs</dt>
          <dd className="mt-0.5 line-clamp-2 text-foreground">{inputs}</dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-secondary/40 p-3">
        <div>
          <p className="smallcaps text-[9px] text-muted-foreground">Macro-F1</p>
          <p className="metric-num text-lg text-foreground">{nb.metrics.macroF1.toFixed(3)}</p>
        </div>
        <div>
          <p className="smallcaps text-[9px] text-muted-foreground">Accuracy</p>
          <p className="metric-num text-lg text-foreground">
            {nb.metrics.accuracy ? nb.metrics.accuracy.toFixed(3) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <Link
          to="/notebooks/$id"
          params={{ id: nb.id }}
          className="smallcaps inline-flex items-center gap-1 text-[10px] text-foreground underline-offset-4 hover:underline"
        >
          View output →
        </Link>
      </div>
    </article>
  );
}
