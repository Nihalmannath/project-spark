import { createFileRoute } from "@tanstack/react-router";
import { PageHero, SectionHeader, KeyValueRow } from "@/components/primitives";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — GraphSAGE Food Desert Identification" },
      {
        name: "description",
        content:
          "Data sources, citations, and acknowledgements for the GraphSAGE food-environment classification thesis on Bengaluru.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div>
      <PageHero
        eyebrow="About"
        title="Data, sources, and what to read next."
      />

      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-12 md:grid-cols-3">
          <div className="md:col-span-2 space-y-12">
            <section>
              <SectionHeader eyebrow="Study area" title="Bengaluru — BBMP boundary" />
              <p className="text-base leading-relaxed text-muted-foreground">
                The Bruhat Bengaluru Mahanagara Palike (BBMP) administrative area
                covers 198 wards and roughly 741 km². The thesis works at the
                resolution of road intersections inside this boundary:{" "}
                <span className="text-foreground">31,645 labelled nodes</span>{" "}
                connected by <span className="text-foreground">61,908 road segments</span>.
              </p>
            </section>

            <section>
              <SectionHeader eyebrow="Data sources" title="Five primary datasets" />
              <dl className="rounded-md border bg-card p-6">
                <KeyValueRow label="Zomato">
                  3,680 restaurants — name, location, rating, cost-for-two, cuisines
                </KeyValueRow>
                <KeyValueRow label="Swiggy Dineout">
                  798 dine-out restaurants — location, rating, cost
                </KeyValueRow>
                <KeyValueRow label="Google grocery">
                  8,656–9,043 grocery and supermarket locations with rating, basket-cost proxy, and Swiggy Instamart coverage
                </KeyValueRow>
                <KeyValueRow label="Menu items">
                  231,395 menu items tagged with category, protein, fat, and sugar content
                </KeyValueRow>
                <KeyValueRow label="OpenStreetMap">
                  Road geometry, road rank (2–6), and a sparser fallback food layer for the baseline
                </KeyValueRow>
                <KeyValueRow label="Ward labels">
                  4-class food-environment labels per BBMP ward, derived from access / affordability / quality / stability scores
                </KeyValueRow>
              </dl>
            </section>

            <section>
              <SectionHeader eyebrow="Methods" title="Stack & libraries" />
              <ul className="space-y-2 text-base leading-relaxed text-muted-foreground">
                <li>• <span className="text-foreground">PyTorch + PyG</span> — GraphSAGE implementation, focal loss, weighted edges</li>
                <li>• <span className="text-foreground">scikit-learn</span> — Random Forest baseline + Gradient Boosting</li>
                <li>• <span className="text-foreground">PySAL / esda</span> — Global Moran's I + permutation p-values</li>
                <li>• <span className="text-foreground">GeoPandas + Folium</span> — spatial joins and interactive maps</li>
                <li>• <span className="text-foreground">NetworkX + OSMnx</span> — road graph construction</li>
              </ul>
            </section>

            <section>
              <SectionHeader eyebrow="Honest limitations" title="What this work does not claim" />
              <ul className="space-y-3 text-base leading-relaxed text-muted-foreground">
                <li>
                  <span className="text-foreground">Ward labels are a proxy.</span> They
                  are convenient and administratively interpretable but coarse. Notebook 08 demonstrates that this is a meaningful part of the modelling error.
                </li>
                <li>
                  <span className="text-foreground">Commercial data has coverage gaps.</span>{" "}
                  Zomato, Swiggy, and Google all under-represent informal vendors, weekly markets, and street food carts — categories central to food access in many Indian neighbourhoods.
                </li>
                <li>
                  <span className="text-foreground">Macro-F1 plateaus around 0.5</span>{" "}
                  for the ward-target problem. Architectural sophistication does not break through this ceiling — only changing the target unit does.
                </li>
              </ul>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-md border bg-card p-5">
              <p className="smallcaps text-[10px] text-muted-foreground">Cite</p>
              <p className="mt-3 font-serif text-base leading-snug text-foreground">
                GraphSAGE Food Desert Identification — Bengaluru
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                MSc Thesis, 2026
              </p>
            </div>

            <div className="rounded-md border bg-card p-5">
              <p className="smallcaps text-[10px] text-muted-foreground">
                Reproducibility
              </p>
              <p className="mt-2 text-sm text-foreground">
                Notebook outputs are deterministic given a fixed seed. Spatial folds are recorded in <code className="font-mono text-xs">graphsage_foodenv_weighted_edges_meta.json</code>.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
