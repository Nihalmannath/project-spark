import { createFileRoute } from "@tanstack/react-router";
import { useCity } from "../lib/city-context";
import { api, RUNS } from "../data/platform";

export const Route = createFileRoute("/exports")({
  head: () => ({ meta: [{ title: "Download Results — Food Access Planning Tool" }] }),
  component: Exports,
});

const RUN_TYPE_LABELS: Record<string, string> = {
  LOCAL_MODEL: "Bengaluru food access map",
  TRANSFER_PROJECTION: "Mysuru food access map (estimated)",
  PLANNING_SCENARIO: "Scenario analysis",
};

const FILE_LABELS: Record<string, string> = {
  "predictions.geojson": "Download map (GeoJSON)",
  "nodes.csv": "Download spreadsheet (CSV)",
  "map.html": "Download printable map (HTML)",
  "scenario_summary.md": "Download scenario report",
  "metadata.json": "Download data description",
};

function Exports() {
  const { city } = useCity();
  const runs = RUNS.filter((r) => r.city_id === city.id);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl text-foreground">Download Results · {city.display_name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Downloads include a plain-language description of what the data represents and how it was
          generated.
        </p>
      </header>

      {runs.length === 0 ? (
        <div className="mt-6 rounded-sm border border-dashed border-border bg-background p-8 text-center">
          <p className="smallcaps text-[10px] text-muted-foreground">No outputs</p>
          <p className="mt-2 text-sm text-foreground">
            No results available for {city.display_name} yet.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {runs.map((r) => (
            <div key={r.id} className="rounded-sm border border-border bg-background p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-base text-foreground">
                    {RUN_TYPE_LABELS[r.run_type] ?? r.run_type}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["predictions.geojson", "nodes.csv", "map.html", "scenario_summary.md"].map(
                    (f) => (
                      <button
                        key={f}
                        className="rounded-sm border border-border bg-background px-3 py-1.5 text-[11px] text-foreground hover:bg-muted/40"
                      >
                        ↓ {FILE_LABELS[f] ?? f}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
