import { createFileRoute } from "@tanstack/react-router";
import { PageHero, SectionHeader, Mono, KeyValueRow } from "@/components/primitives";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology — GraphSAGE Food Desert Identification" },
      {
        name: "description",
        content:
          "Concepts behind the thesis: graphs, GraphSAGE, features, percentile-rank normalisation, spatial cross-validation, Moran's I, and correlation pruning.",
      },
    ],
  }),
  component: MethodologyPage,
});

function MethodologyPage() {
  return (
    <div>
      <PageHero
        eyebrow="Methodology"
        title="From street corners to a four-class food-environment map."
        lede="Every concept the thesis depends on — explained plainly, with the exact decisions each notebook makes."
      />

      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* Graph */}
        <SectionHeader
          eyebrow="1 · Graph"
          title="Each street corner is a node. Each road segment is an edge."
        />
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>
              The model operates on a graph of <span className="text-foreground">31,645</span>{" "}
              labelled road intersections inside the BBMP city boundary,
              connected by <span className="text-foreground">61,908</span> road segments
              (≈113,000 directed edges once each undirected segment is split).
            </p>
            <p>
              <strong className="text-foreground">GraphSAGE</strong> is a graph neural
              network that learns a representation for each node by aggregating
              features from its road neighbours — and from their neighbours
              again, two hops deep. A small residential intersection inherits
              context from the high street it spills into.
            </p>
          </div>
          <dl className="rounded-md border bg-card p-6">
            <KeyValueRow label="Nodes">Road intersections (street corners)</KeyValueRow>
            <KeyValueRow label="Edges">Road segments connecting two intersections</KeyValueRow>
            <KeyValueRow label="Edge attrs">Length (m), road rank (2–6)</KeyValueRow>
            <KeyValueRow label="Best weighting">
              <Mono>1 / max(length_m, 25)</Mono> — inverse distance
            </KeyValueRow>
          </dl>
        </div>

        {/* Features */}
        <div className="mt-24">
          <SectionHeader
            eyebrow="2 · Features"
            title="Raw signals, computed at multiple radii, then normalised within the city."
          />
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                Features fall into five families: <span className="text-foreground">road
                structure</span>, <span className="text-foreground">restaurants</span>,{" "}
                <span className="text-foreground">menu nutrition</span>,{" "}
                <span className="text-foreground">grocery</span>, and{" "}
                <span className="text-foreground">boundary uncertainty</span>. Each is
                computed within a buffer (200 m, 800 m, or 1,500 m) of the
                intersection.
              </p>
              <p>
                Before training, every feature is converted to a within-city{" "}
                <span className="text-foreground">percentile rank</span> (0–100) and then
                z-score normalised. This makes the trained model transferable
                to other cities: the meaning of "50" is always "the median for
                this city".
              </p>
            </div>
            <ol className="space-y-4 rounded-md border bg-card p-6 text-sm">
              <Step n="1" title="Impute missing values">
                Fill NaN with the median computed on training nodes only.
              </Step>
              <Step n="2" title="Percentile-rank transform">
                Convert each value to its rank within training nodes (0–100).
              </Step>
              <Step n="3" title="Z-score normalise">
                Subtract mean, divide by std — done strictly inside each fold.
              </Step>
            </ol>
          </div>
        </div>

        {/* Spatial CV */}
        <div className="mt-24">
          <SectionHeader
            eyebrow="3 · Spatial cross-validation"
            title="Random splits leak geography. So the city is split into 5 spatial zones."
            description="Train on three zones, validate on one, test on the remaining one. Edges crossing fold boundaries are removed per fold so neighbour aggregation cannot leak the test target into the training signal."
          />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-md border bg-card p-5 text-center"
              >
                <p className="smallcaps text-[10px] text-muted-foreground">Fold {i + 1}</p>
                <div className="mt-3 flex justify-center gap-1">
                  {[0, 1, 2, 3, 4].map((j) => (
                    <span
                      key={j}
                      className="h-6 w-3 rounded-sm"
                      style={{
                        backgroundColor:
                          j === i
                            ? "var(--color-accent)"
                            : j === (i + 1) % 5
                              ? "var(--color-foreground)"
                              : "var(--color-border)",
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            <span
              className="mr-3 inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: "var(--color-accent)" }}
            />
            Test zone
            <span
              className="ml-5 mr-3 inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: "var(--color-foreground)" }}
            />
            Validation zone
            <span
              className="ml-5 mr-3 inline-block h-2 w-2 rounded-sm bg-border"
            />
            Training zones
          </p>
        </div>

        {/* Correlation / Moran */}
        <div className="mt-24 grid gap-12 md:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="4 · Correlation pruning"
              title="Drop the duplicate features, keep the informative ones."
            />
            <p className="text-base leading-relaxed text-muted-foreground">
              For each fold, a Random Forest ranks features by importance.
              The Pearson correlation matrix is then walked: any feature with{" "}
              <Mono>|r| &gt; 0.9</Mono> against a more-important feature is
              dropped. Notebook 03d retains ~18 features per fold from the 36
              available; 03h retains 82 of 109 engineered features.
            </p>
          </div>
          <div>
            <SectionHeader
              eyebrow="5 · Moran's I audit"
              title="Spatial autocorrelation is the phenomenon, not the bug."
            />
            <p className="text-base leading-relaxed text-muted-foreground">
              Notebook 03h computes Global Moran's I per feature using the
              road-distance-inverse weights, plus four sensitivity weights.
              Top features ({" "}
              <Mono>inter_density_1500m</Mono>, <Mono>menu_items_sum_1500m</Mono>) sit
              around <span className="metric-num text-foreground">I ≈ 0.998</span>. The
              labels themselves are spatially clustered (I ≈ 0.94). High
              spatial autocorrelation is treated as an audit signal — not an
              automatic reason to drop a feature.
            </p>
          </div>
        </div>

        {/* Metric */}
        <div className="mt-24">
          <SectionHeader
            eyebrow="6 · Metric"
            title="Macro-F1 — every class counts equally."
            description="Macro-F1 averages the per-class F1 score with equal weight. Rare classes — food swamp accounts for ~5% of nodes — count just as much as the majority oasis class. This is the right metric for an imbalanced 4-class problem."
          />
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="metric-num shrink-0 text-2xl text-accent">{n}</span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}
