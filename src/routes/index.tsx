import { createFileRoute, Link } from "@tanstack/react-router";
import { Legend } from "../components/Legend";
import { QuadrantDiagram } from "../components/QuadrantDiagram";
import { NotebookLeaderboard } from "../components/NotebookLeaderboard";
import { LabelDistribution } from "../components/LabelDistribution";
import { MapDashboard } from "../components/MapDashboard";

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

function OverviewPage() {
  return (
    <div>
      {/* HERO — split-screen, image-led */}
      <section className="hairline-bottom">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-20">
          <div>
            <p className="smallcaps text-muted-foreground">Spatial Decision Support · Prototype</p>
            <h1 className="mt-4 text-4xl font-light leading-[1.05] tracking-tight text-[color:var(--color-navy)] sm:text-5xl lg:text-[56px]">
              Food Spatial Intelligence Platform
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground">
              Graph-based diagnosis of urban food access, affordability, and
              food-environment risk — for planners reviewing model predictions
              across Bengaluru's road network and adaptive hex catchments.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                className="smallcaps inline-flex items-center bg-[color:var(--color-navy)] px-5 py-3 text-white transition-opacity hover:opacity-90"
              >
                Open map dashboard →
              </Link>
              <Link
                to="/comparison"
                className="smallcaps inline-flex items-center border border-[color:var(--color-navy)] px-5 py-3 text-[color:var(--color-navy)] transition-colors hover:bg-[color:var(--color-navy)]/5"
              >
                Compare notebooks
              </Link>
            </div>
            <p className="source-note mt-10">
              Source: GraphSAGE models 03–08 · BBMP open data · Zomato · Swiggy · Google Places · 2024–25
            </p>
          </div>
          <div className="relative aspect-square w-full max-w-[520px] justify-self-end">
            <QuadrantDiagram size={520} />
          </div>
        </div>
      </section>

      {/* VISUAL DECK — three-up: map snippet, legend, leaderboard */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-light tracking-tight text-[color:var(--color-navy)]">
            <span className="italic">A first look</span> — predictions, legend, leaderboard
          </h2>
          <Link to="/dashboard" className="smallcaps text-[color:var(--color-navy)] hover:underline">
            Explore dashboard →
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-[420px] overflow-hidden rounded-sm border border-border bg-card">
            <MapDashboard onSelect={() => {}} />
          </div>
          <div className="flex flex-col gap-5">
            <Legend />
            <div className="rounded-sm border border-border bg-card p-5">
              <p className="smallcaps text-muted-foreground">Prediction distribution · prototype hex set</p>
              <div className="mt-4">
                <LabelDistribution />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE PILLARS — diagrammatic cards with arrows */}
      <section className="hairline-top hairline-bottom bg-[color:var(--color-paper)]">
        <div className="mx-auto grid max-w-7xl gap-0 px-6 py-16 md:grid-cols-3">
          {[
            { num: "01", title: "Diagnose",
              body: "Detect spatial food-access gaps across the road network using a GraphSAGE model trained on retail catalogues, menu nutrition, and affordability signals." },
            { num: "02", title: "Compare",
              body: "Inspect model checkpoints and notebook experiments — from the OSM baseline through weighted-edge GraphSAGE to the adaptive hex target pipeline." },
            { num: "03", title: "Validate",
              body: "Review per-checkpoint confidence, confusion matrices, and the feature evidence behind every classification before acting on it." },
          ].map((c, i) => (
            <article
              key={c.num}
              className={`relative px-6 py-8 ${i > 0 ? "border-t md:border-l md:border-t-0 border-border" : ""}`}
            >
              <span className="font-mono text-[10px] tracking-widest text-[color:var(--color-amber)]">
                / {c.num}
              </span>
              <h3 className="mt-3 text-xl font-light italic text-[color:var(--color-navy)]">
                {c.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground">{c.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="smallcaps text-muted-foreground">Macro-F1 leaderboard</p>
            <h2 className="mt-2 text-2xl font-light tracking-tight text-[color:var(--color-navy)]">
              <span className="italic">Where each notebook lands</span>
            </h2>
          </div>
          <Link to="/comparison" className="smallcaps text-[color:var(--color-navy)] hover:underline">
            See all notebooks →
          </Link>
        </div>
        <div className="rounded-sm border border-border bg-card p-6">
          <NotebookLeaderboard height={320} />
          <p className="source-note mt-4">
            Amber = headline checkpoint · navy = supporting experiment · ward-blocked 5-fold spatial CV
          </p>
        </div>
      </section>

      {/* HEADLINE METRICS */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="hairline-top grid gap-10 pt-10 md:grid-cols-3">
          <Metric k="Headline macro-F1" v="0.506" sub="03c — weighted-edge GraphSAGE" />
          <Metric k="Adaptive-hex accuracy" v="0.939" sub="08 — local catchment target" />
          <Metric k="Road intersections labelled" v="31,645" sub="198 BBMP wards · Bengaluru" />
        </div>
      </section>
    </div>
  );
}

function Metric({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div>
      <p className="smallcaps text-muted-foreground">{k}</p>
      <p className="metric-num mt-3 text-5xl text-[color:var(--color-navy)]">{v}</p>
      <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
