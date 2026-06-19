import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getNotebook, NOTEBOOKS } from "@/data/notebooks";
import { LABELS, LABEL_ORDER } from "@/data/labels";
import {
  MetricCard,
  Mono,
  KeyValueRow,
} from "@/components/primitives";

export const Route = createFileRoute("/notebooks/$id")({
  loader: ({ params }) => {
    const nb = getNotebook(params.id);
    if (!nb) throw notFound();
    return { nb };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.nb.number} — ${loaderData.nb.title}` },
          { name: "description", content: loaderData.nb.tagline },
        ]
      : [{ title: "Notebook" }],
  }),
  component: NotebookDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="smallcaps text-[10px] text-muted-foreground">404</p>
      <h1 className="mt-2 font-serif text-3xl text-foreground">Notebook not found</h1>
      <Link to="/notebooks" className="mt-6 inline-block text-sm text-accent underline">
        Back to notebooks
      </Link>
    </div>
  ),
});

function NotebookDetail() {
  const { nb } = Route.useLoaderData();
  const idx = NOTEBOOKS.findIndex((n) => n.id === nb.id);
  const prev = idx > 0 ? NOTEBOOKS[idx - 1] : null;
  const next = idx < NOTEBOOKS.length - 1 ? NOTEBOOKS[idx + 1] : null;

  return (
    <div>
      {/* Hero */}
      <section className="hairline-bottom">
        <div className="mx-auto max-w-6xl px-6 pb-12 pt-14">
          <Link
            to="/notebooks"
            className="smallcaps inline-flex items-center gap-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> All notebooks
          </Link>
          <div className="mt-6 flex items-baseline gap-6">
            <p className="metric-num text-5xl text-accent">{nb.number}</p>
            <h1 className="font-serif text-4xl font-medium leading-tight text-foreground md:text-5xl">
              {nb.title}
            </h1>
          </div>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            {nb.tagline}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="smallcaps rounded-sm border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {nb.targetType === "ward-broadcast" ? "Ward-broadcast target" : "Adaptive local target"}
            </span>
            <Mono>{nb.file}</Mono>
            {nb.isHeadline && (
              <span className="smallcaps rounded-sm border border-accent px-2 py-0.5 text-[10px] text-accent">
                Thesis headline
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Macro-F1"
            value={nb.metrics.macroF1.toFixed(3)}
            emphasis
          />
          {nb.metrics.accuracy != null && (
            <MetricCard label="Accuracy" value={nb.metrics.accuracy.toFixed(3)} />
          )}
          <MetricCard label="Features" value={nb.featureCount} hint="After pruning" />
          <MetricCard
            label="Nodes"
            value={nb.nodes.toLocaleString()}
            hint={nb.edges ? `${nb.edges.toLocaleString()} edges` : undefined}
          />
        </div>
        {nb.delta && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="smallcaps text-[10px] text-accent">Delta · </span>
            {nb.delta}
          </p>
        )}

        {/* What & Why */}
        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <section>
            <p className="smallcaps text-[11px] text-accent">What it does</p>
            <p className="mt-3 text-base leading-relaxed text-foreground">{nb.what}</p>
          </section>
          <section>
            <p className="smallcaps text-[11px] text-accent">Why it matters</p>
            <p className="mt-3 text-base leading-relaxed text-foreground">
              {nb.whyItMatters}
            </p>
          </section>
        </div>

        {/* Raw sources */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl text-foreground">Raw input data</h2>
          <dl className="mt-4 rounded-md border bg-card p-6">
            {nb.rawSources.map((s: { name: string; detail: string }) => (
              <KeyValueRow key={s.name} label={s.name}>
                {s.detail}
              </KeyValueRow>
            ))}
          </dl>
        </section>

        {/* Features */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl text-foreground">Computed features</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {nb.featureCount} features across {nb.featureGroups.length} families.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {nb.featureGroups.map((g) => (
              <div key={g.group} className="rounded-md border bg-card p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-base text-foreground">{g.group}</h3>
                  <span className="metric-num text-sm text-accent">{g.count}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.examples.map((e) => (
                    <Mono key={e}>{e}</Mono>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Correlation policy + model */}
        <section className="mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <p className="smallcaps text-[11px] text-accent">Correlation policy</p>
            <p className="mt-3 text-base leading-relaxed text-foreground">
              {nb.correlationPolicy}
            </p>
          </div>
          <div>
            <p className="smallcaps text-[11px] text-accent">Model</p>
            <p className="mt-3 text-base leading-relaxed text-foreground">{nb.model}</p>
          </div>
        </section>

        {/* Per-class F1 */}
        {nb.metrics.perClassF1 && (
          <section className="mt-16">
            <h2 className="font-serif text-2xl text-foreground">Per-class F1</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {LABEL_ORDER.map((k) => {
                const v = nb.metrics.perClassF1?.[k];
                if (v == null) return null;
                return (
                  <div
                    key={k}
                    className="rounded-md border bg-card p-5"
                    style={{ borderColor: `${LABELS[k].color}40` }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: LABELS[k].color }}
                      />
                      <p className="smallcaps text-[10px] text-muted-foreground">
                        {LABELS[k].name}
                      </p>
                    </div>
                    <p className="metric-num mt-2 text-2xl text-foreground">
                      {v.toFixed(3)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Key findings */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl text-foreground">Key findings</h2>
          <ul className="mt-5 space-y-3">
            {nb.keyFindings.map((f, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-md border bg-card p-5"
              >
                <span className="metric-num shrink-0 text-lg text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm leading-relaxed text-foreground">{f}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Prev / next */}
        <nav className="hairline-top mt-20 grid grid-cols-2 gap-6 pt-10">
          {prev ? (
            <Link
              to="/notebooks/$id"
              params={{ id: prev.id }}
              className="group flex flex-col items-start gap-1 text-left"
            >
              <span className="smallcaps text-[10px] text-muted-foreground">
                ← Previous · {prev.number}
              </span>
              <span className="font-serif text-base text-foreground group-hover:text-accent">
                {prev.title}
              </span>
            </Link>
          ) : <div />}
          {next ? (
            <Link
              to="/notebooks/$id"
              params={{ id: next.id }}
              className="group flex flex-col items-end gap-1 text-right"
            >
              <span className="smallcaps text-[10px] text-muted-foreground">
                Next · {next.number} →
              </span>
              <span className="font-serif text-base text-foreground group-hover:text-accent">
                {next.title}
              </span>
            </Link>
          ) : <div />}
        </nav>
        <div className="mt-6 text-right">
          <Link
            to="/comparison"
            className="smallcaps inline-flex items-center gap-2 text-[11px] text-accent hover:underline"
          >
            See all comparisons <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
