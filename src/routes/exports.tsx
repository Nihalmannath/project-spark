import { createFileRoute } from "@tanstack/react-router";
import { useCity } from "../lib/city-context";
import { api, RUNS } from "../data/platform";

export const Route = createFileRoute("/exports")({
  head: () => ({ meta: [{ title: "Exports — Food Spatial Intelligence Platform" }] }),
  component: Exports,
});

function Exports() {
  const { city } = useCity();
  const runs = RUNS.filter((r) => r.city_id === city.id);

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl text-foreground">Exports · {city.display_name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Every export bundles a metadata sidecar with checkpoint id, target definition, feature
          schema, validation policy, and warnings. Never strip the sidecar before sharing.
        </p>
      </header>

      {runs.length === 0 ? (
        <div className="mt-6 rounded-sm border border-dashed border-border bg-background p-8 text-center">
          <p className="smallcaps text-[10px] text-muted-foreground">No outputs</p>
          <p className="mt-2 text-sm text-foreground">
            No model runs available for {city.display_name}. Nothing to export.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {runs.map((r) => {
            const ckpt = api.getCheckpoint(r.checkpoint_id);
            return (
              <div key={r.id} className="rounded-sm border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] text-muted-foreground">{r.id} · {r.output_version}</p>
                    <p className="mt-0.5 font-serif text-base text-foreground">
                      {r.run_type === "TRANSFER_PROJECTION" ? "Transfer projection" : r.run_type === "PLANNING_SCENARIO" ? "Planning scenario" : "Local model"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Checkpoint {ckpt?.id} · {ckpt?.target_definition}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["predictions.geojson", "nodes.csv", "map.html", "metadata.json", "scenario_summary.md"].map((f) => (
                      <button
                        key={f}
                        className="rounded-sm border border-border bg-background px-2.5 py-1 font-mono text-[11px] text-foreground hover:bg-muted/40"
                      >
                        ↓ {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
