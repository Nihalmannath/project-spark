import { LABELS, LABEL_ORDER } from "../data/labels";
import { HEXES } from "../data/mockData";

/**
 * Compact diagrammatic distribution of label counts — a horizontal
 * "filled bar" graphic in the spirit of the FINAL DRAFT deck. Acts as a
 * visual summary anywhere on the site without taking page width.
 */
export function LabelDistribution({ height = 14 }: { height?: number }) {
  const counts = LABEL_ORDER.map((k) => ({
    key: k,
    name: LABELS[k].name,
    color: LABELS[k].color,
    count: HEXES.filter((h) => h.predicted === k).length,
  }));
  const total = counts.reduce((s, c) => s + c.count, 0);

  return (
    <div className="w-full">
      <div className="flex w-full overflow-hidden rounded-sm border border-border" style={{ height }}>
        {counts.map((c) => (
          <div
            key={c.key}
            style={{ width: `${(c.count / total) * 100}%`, backgroundColor: c.color }}
            title={`${c.name} · ${c.count}`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-5">
        {counts.map((c) => (
          <div key={c.key} className="flex items-baseline gap-2 text-[10px]">
            <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: c.color }} />
            <span className="text-foreground">{c.name}</span>
            <span className="metric-num ml-auto text-muted-foreground">{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
