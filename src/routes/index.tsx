import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GitGraph, Map as MapIcon, Workflow } from "lucide-react";
import { LABEL_ORDER, LABELS } from "@/data/labels";
import { NOTEBOOKS } from "@/data/notebooks";
import { MetricCard } from "@/components/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — GraphSAGE Food Desert Identification, Bengaluru" },
      {
        name: "description",
        content:
          "Identifying food deserts, oases, mirages, and swamps across 31,645 road intersections in Bengaluru using GraphSAGE on credible commercial food data.",
      },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const headlineWard = NOTEBOOKS.find((n) => n.id === "03c")!;
  const headlineAdaptive = NOTEBOOKS.find((n) => n.id === "08")!;

  return (
    <div>
      {/* Hero */}
      <section className="hairline-bottom relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-20 md:grid-cols-12 md:pt-28">
          <div className="md:col-span-7">
            <p className="smallcaps text-[11px] text-accent">
              MSc Thesis · Geospatial Machine Learning · Bengaluru
            </p>
            <h1 className="mt-4 font-serif text-5xl font-medium leading-[1.05] tracking-tight text-foreground md:text-6xl">
              Identifying food deserts, oases, mirages and swamps from the
              street network.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              A graph neural network — GraphSAGE — assigns each of Bengaluru's{" "}
              <span className="metric-num text-foreground">31,645</span> road
              intersections to one of four food-environment classes, using only
              what can be observed on the ground.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/notebooks"
                className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                Explore notebooks <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/comparison"
                className="inline-flex items-center gap-2 rounded-md border border-foreground/20 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/40"
              >
                Compare models
              </Link>
            </div>
          </div>

          <aside className="md:col-span-5">
            <div className="hairline-top md:hairline-top grid grid-cols-2 gap-px bg-border">
              {LABEL_ORDER.map((key) => {
                const l = LABELS[key];
                return (
                  <div key={key} className="bg-background p-5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      <p className="smallcaps text-[10px] text-muted-foreground">
                        {l.name}
                      </p>
                    </div>
                    <p className="mt-3 font-serif text-base leading-snug text-foreground">
                      {l.shortDef}.
                    </p>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      {/* Headline metrics */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="smallcaps text-[11px] text-accent">Headline results</p>
        <h2 className="mt-2 max-w-2xl font-serif text-3xl font-medium text-foreground">
          Two thesis-level findings, reported separately.
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <ResultCard
            title="03c · Ward-broadcast labels"
            badge="Headline GNN"
            macroF1={headlineWard.metrics.macroF1}
            accuracy={headlineWard.metrics.accuracy!}
            caption="2-layer weighted GraphSAGE on 36 features. Inverse road-length edge weighting — the simple architecture that won the architecture audit."
            to="/notebooks/03c"
          />
          <ResultCard
            title="08 · Adaptive hex targets"
            badge="New target design"
            macroF1={headlineAdaptive.metrics.macroF1}
            accuracy={headlineAdaptive.metrics.accuracy!}
            caption="Gradient Boosting on 48 features against locally-aligned catchment labels. Demonstrates that label geography — not architecture — was the ceiling."
            to="/notebooks/08"
          />
        </div>
        <p className="mt-6 max-w-3xl text-sm text-muted-foreground">
          The two are not directly comparable. <span className="text-foreground">03c</span> predicts a
          ward label broadcast to every intersection inside the ward; <span className="text-foreground">08</span>{" "}
          predicts a local adaptive catchment label. The contrast is the point.
        </p>
      </section>

      {/* The problem */}
      <section className="hairline-top bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="smallcaps text-[11px] text-accent">The problem</p>
              <h2 className="mt-2 font-serif text-3xl font-medium text-foreground md:text-4xl">
                Not all food access is equal.
              </h2>
            </div>
            <div className="space-y-5 text-base leading-relaxed text-muted-foreground md:col-span-7">
              <p>
                A neighbourhood is not a "food desert" simply because it lacks
                grocery stores. It can be saturated with fast food (a{" "}
                <span className="text-foreground">swamp</span>), full of expensive
                outlets out of reach for residents (a{" "}
                <span className="text-foreground">mirage</span>), or genuinely
                cut off from any food (a <span className="text-foreground">desert</span>).
              </p>
              <p>
                The model classifies each road intersection into one of these four classes
                using only features observable at that location — restaurant
                density and price, grocery basket cost, menu nutrition,
                cuisine diversity, road structure — and the graph of streets
                that connects them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Approach */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="smallcaps text-[11px] text-accent">Approach</p>
        <h2 className="mt-2 max-w-2xl font-serif text-3xl font-medium text-foreground md:text-4xl">
          Three pillars of the methodology.
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <Pillar
            icon={<GitGraph className="h-5 w-5" />}
            title="Graph-native learning"
            body="GraphSAGE aggregates each node's features with its road-network neighbours, so a quiet residential lane gets context from the nearby arterial it connects to."
          />
          <Pillar
            icon={<Workflow className="h-5 w-5" />}
            title="Spatial cross-validation"
            body="The city is split into 5 ward-blocked spatial zones. Train-on-three, validate-on-one, test-on-one — preventing geographic leakage during model evaluation."
          />
          <Pillar
            icon={<MapIcon className="h-5 w-5" />}
            title="Credible commercial data"
            body="Zomato, Swiggy, Google grocery, and menu nutrition replace sparse OSM crowd-sourced food data — the single largest jump in model quality (+0.166 macro-F1)."
          />
        </div>
      </section>

      {/* Snapshot metrics */}
      <section className="hairline-top">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="smallcaps text-[11px] text-accent">By the numbers</p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <MetricCard label="Road intersections" value="31,645" hint="Labelled inside BBMP boundary" />
            <MetricCard label="Road segments" value="61,908" hint="Median segment 37 m" />
            <MetricCard label="Restaurants" value="4,478" hint="Zomato + Swiggy combined" />
            <MetricCard label="Menu items audited" value="231,395" hint="Protein, fat, sugar" />
          </div>
        </div>
      </section>
    </div>
  );
}

function ResultCard({
  title,
  badge,
  macroF1,
  accuracy,
  caption,
  to,
}: {
  title: string;
  badge: string;
  macroF1: number;
  accuracy: number;
  caption: string;
  to: string;
}) {
  return (
    <Link
      to="/notebooks/$id"
      params={{ id: to.split("/").pop()! }}
      className="group relative block rounded-md border bg-card p-7 transition-all hover:border-foreground/40"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="smallcaps text-[10px] text-accent">{badge}</p>
          <h3 className="mt-2 font-serif text-xl text-foreground">{title}</h3>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
      </div>
      <div className="mt-6 flex items-end gap-8">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Macro-F1</p>
          <p className="metric-num mt-1 text-4xl text-foreground">
            {macroF1.toFixed(3)}
          </p>
        </div>
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">Accuracy</p>
          <p className="metric-num mt-1 text-4xl text-foreground">
            {accuracy.toFixed(3)}
          </p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{caption}</p>
    </Link>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/20 text-foreground">
        {icon}
      </div>
      <h3 className="mt-5 font-serif text-xl text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
