import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { NOTEBOOKS } from "@/data/notebooks";
import { PageHero } from "@/components/primitives";

export const Route = createFileRoute("/notebooks/")({
  head: () => ({
    meta: [
      { title: "Notebooks — GraphSAGE Food Desert Identification" },
      {
        name: "description",
        content:
          "Each notebook in the thesis progression: from sparse OSM baseline (macro-F1 0.292) through architecture audits to adaptive-hex targets (accuracy 0.939).",
      },
    ],
  }),
  component: NotebooksIndex,
});

function NotebooksIndex() {
  return (
    <div>
      <PageHero
        eyebrow="Notebooks"
        title="Nine experiments, one progression."
        lede="Each notebook isolates one design decision — better data, edge weights, smaller radius, deeper architecture, or a different target — and reports the honest delta against the previous best."
      />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="hairline-top">
          {NOTEBOOKS.map((nb) => (
            <Link
              key={nb.id}
              to="/notebooks/$id"
              params={{ id: nb.id }}
              className="group hairline-bottom grid grid-cols-12 items-baseline gap-4 py-7 transition-colors hover:bg-muted/40"
            >
              <div className="col-span-12 md:col-span-1">
                <p className="metric-num text-3xl text-accent">{nb.number}</p>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="flex items-center gap-3">
                  <h3 className="font-serif text-xl text-foreground">{nb.title}</h3>
                  {nb.isHeadline && (
                    <span className="smallcaps rounded-sm border border-accent px-1.5 py-0.5 text-[9px] text-accent">
                      Headline
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{nb.tagline}</p>
              </div>
              <div className="col-span-6 md:col-span-2">
                <p className="smallcaps text-[10px] text-muted-foreground">Macro-F1</p>
                <p className="metric-num mt-0.5 text-xl text-foreground">
                  {nb.metrics.macroF1.toFixed(3)}
                </p>
              </div>
              <div className="col-span-6 md:col-span-2">
                <p className="smallcaps text-[10px] text-muted-foreground">Features</p>
                <p className="metric-num mt-0.5 text-xl text-foreground">
                  {nb.featureCount}
                </p>
              </div>
              <div className="col-span-12 flex justify-end md:col-span-1">
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
