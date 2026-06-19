import { createFileRoute, Link } from "@tanstack/react-router";
import { Legend } from "../components/Legend";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Food Spatial Intelligence Platform" },
      {
        name: "description",
        content:
          "Graph-based diagnosis of urban food access, affordability, and food-environment risk.",
      },
    ],
  }),
  component: OverviewPage,
});

const CARDS = [
  {
    title: "Diagnose",
    body: "Detect spatial food-access gaps using a GraphSAGE model trained on road intersections, retail catalogues, menu nutrition, and affordability signals.",
  },
  {
    title: "Compare",
    body: "Inspect model checkpoints and notebook experiments — from the OSM baseline through weighted-edge GraphSAGE to the adaptive hex target pipeline.",
  },
  {
    title: "Validate",
    body: "Review per-checkpoint confidence, confusion matrices, and the feature evidence behind each classification before acting on it.",
  },
];

function OverviewPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      {/* Hero */}
      <section className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">
            Spatial Decision Support · Prototype
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">
            Food Spatial Intelligence Platform
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Graph-based diagnosis of urban food access, affordability, and food-environment risk.
            A planner-facing prototype for exploring model predictions across Bengaluru's road
            network and adaptive hex catchments.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="smallcaps inline-flex items-center rounded-md bg-foreground px-5 py-3 text-[11px] text-background transition-opacity hover:opacity-90"
            >
              Open map dashboard →
            </Link>
            <Link
              to="/comparison"
              className="smallcaps inline-flex items-center rounded-md border border-border px-5 py-3 text-[11px] text-foreground transition-colors hover:bg-secondary"
            >
              Compare notebooks
            </Link>
          </div>
        </div>
        <Legend />
      </section>

      {/* Cards */}
      <section className="mt-20 grid gap-6 md:grid-cols-3">
        {CARDS.map((c, i) => (
          <article key={c.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <p className="smallcaps text-[10px] text-muted-foreground">0{i + 1}</p>
            <h2 className="mt-2 font-serif text-xl font-medium text-foreground">{c.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
          </article>
        ))}
      </section>

      {/* Headline metrics strip */}
      <section className="hairline-top mt-20 grid gap-6 pt-10 md:grid-cols-3">
        <Metric k="Headline macro-F1" v="0.506" sub="03c — weighted-edge GraphSAGE" />
        <Metric k="Adaptive-hex accuracy" v="0.939" sub="08 — local catchment target" />
        <Metric k="Road intersections labelled" v="31,645" sub="198 BBMP wards · Bengaluru" />
      </section>
    </div>
  );
}

function Metric({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div>
      <p className="smallcaps text-[10px] text-muted-foreground">{k}</p>
      <p className="metric-num mt-2 text-4xl text-foreground">{v}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
