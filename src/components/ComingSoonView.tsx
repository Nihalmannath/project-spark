import { DATASET_LABELS, type City, type DatasetRecord } from "../data/platform";

export function ComingSoonView({ city, datasets }: { city: City; datasets: DatasetRecord[] }) {
  const required: (keyof typeof DATASET_LABELS)[] = [
    "boundary", "roads", "food_pois", "groceries", "restaurants",
    "prices", "ratings", "population", "vulnerability", "local_labels",
  ];
  const status = (k: string) =>
    datasets.find((d) => d.type === k)?.status || "missing";

  return (
    <div className="rounded-sm border border-border bg-background p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">No model outputs</p>
          <h2 className="mt-1 font-serif text-2xl text-foreground">
            {city.display_name} — readiness view
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            This city has no verified model. Predictions, confidence values, accuracy, F1, and
            node counts are intentionally withheld. The checklist below tracks the inputs needed
            before the local pipeline can run.
          </p>
        </div>
        <div className="text-right">
          <p className="smallcaps text-[9px] text-muted-foreground">OSM place</p>
          <p className="mt-1 font-mono text-xs text-foreground">{city.osm_place_name}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-2 md:grid-cols-2">
        {required.map((k) => {
          const s = status(k);
          const tone =
            s === "verified" ? "#7a9461" : s === "partial" ? "#d59e71" : "#aab3bf";
          return (
            <div
              key={k}
              className="flex items-center justify-between rounded-sm border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full" style={{ background: tone }} />
                <span className="text-sm text-foreground">{DATASET_LABELS[k]}</span>
              </div>
              <span className="smallcaps text-[9px] text-muted-foreground">{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
