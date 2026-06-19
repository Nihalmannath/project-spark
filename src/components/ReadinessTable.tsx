import { CITIES, DATASETS, DATASET_LABELS, type DatasetKey } from "../data/platform";

const KEYS: DatasetKey[] = [
  "boundary", "roads", "food_pois", "groceries", "restaurants",
  "prices", "ratings", "menu_diversity", "population", "vulnerability",
  "access_grid", "adaptive_hex", "local_labels",
];

const DOT: Record<string, string> = {
  verified: "#7a9461",
  partial: "#d59e71",
  missing: "#d8dde4",
};

export function ReadinessMatrix() {
  return (
    <div className="overflow-x-auto rounded-sm border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-3 py-2 smallcaps text-[9px] text-muted-foreground font-normal">
              Dataset
            </th>
            {CITIES.map((c) => (
              <th
                key={c.id}
                className="px-3 py-2 smallcaps text-[9px] text-muted-foreground font-normal"
              >
                {c.display_name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {KEYS.map((k) => (
            <tr key={k} className="border-t border-border">
              <td className="px-3 py-2 text-foreground">{DATASET_LABELS[k]}</td>
              {CITIES.map((c) => {
                const d = DATASETS.find((x) => x.city_id === c.id && x.type === k);
                const s = d?.status || "missing";
                return (
                  <td key={c.id} className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: DOT[s] }}
                      />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {s === "verified" && d?.row_count
                          ? d.row_count.toLocaleString()
                          : s}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
