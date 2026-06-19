import { LABELS, LABEL_ORDER, type LabelKey } from "../data/labels";

interface LegendProps {
  active?: LabelKey | null;
  onToggle?: (k: LabelKey) => void;
  compact?: boolean;
}

/**
 * Large readable legend — block of solid colour swatches with the
 * food environment name printed inside, matching the FINAL DRAFT deck.
 */
export function Legend({ active, onToggle, compact }: LegendProps) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <p className="smallcaps text-muted-foreground">Legend · food environments</p>
      <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-5" : "grid-cols-1"}`}>
        {LABEL_ORDER.map((key) => {
          const l = LABELS[key];
          const isActive = active === key;
          const isDark = key === "swamp";
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle?.(key)}
              className={`group relative overflow-hidden text-left transition-all ${
                isActive ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : "hover:opacity-90"
              }`}
              style={{ backgroundColor: l.color }}
            >
              <div className={`flex items-center justify-between gap-2 px-3 ${compact ? "py-3" : "py-3"}`}>
                <span
                  className={`font-medium italic ${compact ? "text-[11px]" : "text-sm"}`}
                  style={{ color: isDark ? "#ffffff" : "#1a1a1a" }}
                >
                  {l.name}
                </span>
                {!compact && (
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider"
                    style={{ color: isDark ? "#ffffffcc" : "#465468" }}
                  >
                    {key}
                  </span>
                )}
              </div>
              {!compact && (
                <p
                  className="px-3 pb-3 text-[11px] leading-snug"
                  style={{ color: isDark ? "#ffffffcc" : "#465468" }}
                >
                  {l.shortDef}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
