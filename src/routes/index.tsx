import { createFileRoute, Link } from "@tanstack/react-router";
import { Term } from "../components/Term";
import { LABELS, LABEL_ORDER, type LabelKey } from "../data/labels";
import { labelColor } from "../data/realData";

export const Route = createFileRoute("/")({
  component: Overview,
});

const METRICS = [
  ["Best accuracy", "93.9%", "high-confidence adaptive target"],
  ["Macro-F1", "0.783", "gradient-boosting leaderboard"],
  ["Spatial-CV macro-F1", "0.51", "leave-one-zone-out, GraphSAGE"],
  ["Road nodes", "34,200", "Bengaluru intersections"],
] as const;

const STEPS = [
  ["01 · Extract", "Real road graph + OSM features", "Build the city's road-intersection graph and compute eight transferable features (food counts at 800 m / 1500 m, nearest-food distance, road structure) — OSM-only, so they transfer."],
  ["02 · Weight", "Within-city percentiles", "Rank every feature against the city's own distribution, so “well-served relative to this city” means the same in Bengaluru and Mysuru despite sparser OSM coverage."],
  ["03 · Transfer", "Frozen model → new city + scenario", "Apply the Bengaluru-trained model unchanged to Mysuru, then simulate a jobs hub and re-predict which intersections move out of food desert."],
] as const;

function Overview() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-16">
      <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="smallcaps text-[10px] tracking-[0.14em] text-muted-foreground">
            Urban food-environment graph learning · MSc thesis
          </p>
          <h1 className="mt-2 font-serif text-[34px] leading-[1.1] tracking-tight text-foreground">
            Mapping food deserts at road-intersection scale — and transferring the model to a new city.
          </h1>
          <p className="mt-4 max-w-[760px] text-sm leading-relaxed text-[color:var(--color-ink-deep)]">
            A <Term explain="GraphSAGE: a graph neural network that classifies each node by aggregating features from its road-connected neighbours.">GraphSAGE</Term> model
            labels every road intersection in Bengaluru as one of four food environments, evaluated with{" "}
            <Term explain="Leave-one-zone-out spatial cross-validation: whole city zones are held out, so the score reflects real spatial generalisation, not memorised neighbours.">leave-one-zone-out spatial CV</Term>.
            The trained model is then <Term explain="The model weights and feature scaler are frozen — not retrained — and applied to a new city's features. This tests true transfer.">frozen and transferred</Term> to
            Mysuru, where you can run interventions and watch the projection respond.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/results" className="smallcaps rounded-sm bg-foreground px-4 py-2.5 text-[10px] text-background hover:bg-foreground/85">
              Open the evidence map →
            </Link>
            <Link to="/scenario-lab" className="smallcaps rounded-sm border border-foreground px-4 py-2.5 text-[10px] text-foreground hover:bg-muted/40">
              Run a transfer scenario →
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 self-start border border-border bg-[color:var(--color-paper)]">
          {METRICS.map(([label, value, sub], i) => (
            <div key={label} className={`p-5 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""} border-border`}>
              <p className="smallcaps text-[9px] text-muted-foreground">{label}</p>
              <p className="mt-1 font-serif text-2xl text-foreground">{value}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Four labels */}
      <section className="mt-10">
        <p className="smallcaps text-[10px] text-muted-foreground">The four food environments</p>
        <h2 className="mt-1 font-serif text-xl text-foreground">A deterministic label rule on five score dimensions</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {(LABEL_ORDER.filter((k) => k !== "unknown") as LabelKey[]).map((k) => (
            <div key={k} className="overflow-hidden rounded-sm border border-border">
              <div className="px-4 py-3" style={{ background: labelColor(k) }}>
                <span className="font-serif text-sm font-medium italic" style={{ color: k === "swamp" ? "#fff" : "#1a1a1a" }}>
                  {LABELS[k].name}
                </span>
              </div>
              <p className="bg-[color:var(--color-paper)] px-4 py-3 text-[12px] leading-snug text-[color:var(--color-ink-deep)]">
                {LABELS[k].longDef}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] italic text-muted-foreground">
          Rule: <span className="font-mono not-italic">access &lt; 40 → desert</span>;{" "}
          <span className="font-mono not-italic">affordability &lt; 40 → mirage</span>;{" "}
          <span className="font-mono not-italic">quality/diversity &lt; 40 → swamp</span>; all three ≥ 40 → oasis. Proxy labels, not survey ground truth.
        </p>
      </section>

      {/* Three-verb pipeline */}
      <section className="mt-10">
        <p className="smallcaps text-[10px] text-muted-foreground">How the transfer works</p>
        <div className="mt-3 grid border border-border md:grid-cols-3">
          {STEPS.map(([num, title, body], i) => (
            <div key={num} className={`p-6 ${i < 2 ? "border-b md:border-b-0 md:border-r" : ""} border-border`}>
              <p className="smallcaps text-[10px] text-muted-foreground">{num}</p>
              <h3 className="mt-2 font-serif text-base text-foreground">{title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 text-[10px] text-muted-foreground">
        Bengaluru is the evidence-backed build (real BBMP ward labels). Mysuru is a transfer projection with no
        local ground truth — read relative scenario change, not absolute class.
      </p>
    </div>
  );
}
