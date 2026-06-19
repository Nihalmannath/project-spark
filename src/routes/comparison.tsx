import { createFileRoute } from "@tanstack/react-router";
import { NotebookCard } from "../components/NotebookCard";
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
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-10 max-w-3xl">
        <p className="smallcaps text-[10px] text-muted-foreground">Notebook / Model Comparison</p>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-foreground">
          Model checkpoints across the experiment progression
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Each card summarises one notebook: purpose, input features, model method, output type, and
          headline metrics. Placeholder metrics will be auto-replaced once real evaluation artifacts
          are wired in from the repo.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {NOTEBOOKS.map((nb) => (
          <NotebookCard key={nb.id} nb={nb} />
        ))}
      </div>
    </div>
  );
}
