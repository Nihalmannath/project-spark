import { LABELS, LABEL_ORDER, type LabelKey } from "../data/labels";

interface LegendProps {
  active?: LabelKey | null;
  onToggle?: (k: LabelKey) => void;
  compact?: boolean;
}

export function Legend({ active, onToggle, compact }: LegendProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="smallcaps text-[10px] text-muted-foreground">Food environment legend</p>
      <div className={compact ? "mt-3 grid grid-cols-2 gap-2" : "mt-3 flex flex-col gap-2"}>
        {LABEL_ORDER.map((key) => {
          const l = LABELS[key];
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle?.(key)}
              className={`group flex items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                isActive ? "border-foreground bg-secondary" : "border-transparent hover:border-border hover:bg-secondary/60"
              }`}
            >
              <span
                aria-hidden
                className="mt-1 inline-block size-4 shrink-0 rounded-sm border border-border/50"
                style={{ backgroundColor: l.color }}
              />
              <span className="min-w-0">
                <span className="block font-serif text-sm font-medium text-foreground">{l.name}</span>
                {!compact && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">{l.shortDef}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
