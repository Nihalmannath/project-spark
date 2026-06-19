import { createFileRoute } from "@tanstack/react-router";
import { NotebookCard } from "../components/NotebookCard";
import { NotebookLeaderboard } from "../components/NotebookLeaderboard";
import { NOTEBOOKS } from "../data/notebooks";

export const Route = createFileRoute("/comparison")({
  head: () => ({
    meta: [
      { title: "Notebook & Model Comparison — Food Spatial Intelligence" },
      { name: "description", content: "Compare modelling notebooks and checkpoints side by side." },
    ],
  }),
  component: ComparisonPage,
});

function ComparisonPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-14">
      <header className="mb-10 max-w-3xl">
        <p className="smallcaps text-muted-foreground">Notebook / Model Comparison</p>
        <h1 className="mt-3 text-4xl font-light leading-tight tracking-tight text-[color:var(--color-navy)]">
          <span className="italic">Each experiment</span>, side by side.
        </h1>
      </header>

      <section className="rounded-sm border border-border bg-card p-6">
        <p className="smallcaps text-muted-foreground">Macro-F1 across notebooks</p>
        <div className="mt-4">
          <NotebookLeaderboard height={340} />
        </div>
        <p className="source-note mt-4">
          Source: spatial 5-fold cross-validation · per-notebook seeds · 2026
        </p>
      </section>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {NOTEBOOKS.map((nb) => (
          <NotebookCard key={nb.id} nb={nb} />
        ))}
      </div>
    </div>
  );
}
