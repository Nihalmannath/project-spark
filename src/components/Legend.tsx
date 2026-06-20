import { LABELS, LABEL_ORDER, type LabelKey } from "../data/labels";

interface LegendProps {
  active?: LabelKey | null;
  onToggle?: (k: LabelKey) => void;
  compact?: boolean;
  proxyMode?: boolean;
  modelMode?: boolean;
  counts?: Record<string, number>;
}

/**
 * Large readable legend — block of solid colour swatches with the
 * food environment name printed inside, matching the FINAL DRAFT deck.
 */
export function Legend({ active, onToggle, compact, proxyMode, modelMode, counts }: LegendProps) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <p className="smallcaps text-muted-foreground">Legend · food environments</p>
      <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-5" : "grid-cols-1"}`}>
        {LABEL_ORDER.map((key) => {
          const l = LABELS[key];
          const isActive = active === key;
          const isDark = key === "swamp";
          const isProxy = proxyMode && (key === "desert" || key === "swamp");
          const isModel = modelMode && key !== "unknown";
          const unavailable = proxyMode && (key === "mirage" || key === "oasis");
          const count = counts?.[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle?.(key)}
              disabled={unavailable}
              className={`group relative overflow-hidden border text-left transition-all ${
                isActive
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                  : "hover:opacity-90"
              } ${isProxy || isModel ? "border-dashed border-foreground/70" : "border-transparent"} ${unavailable ? "cursor-not-allowed opacity-35" : ""}`}
              style={{ backgroundColor: l.color }}
            >
              <div
                className={`flex items-center justify-between gap-2 px-3 ${compact ? "py-3" : "py-3"}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={`font-medium italic ${compact ? "text-[11px]" : "text-sm"}`}
                    style={{ color: isDark ? "#ffffff" : "#1a1a1a" }}
                  >
                    {l.name}
                  </span>
                  {isProxy && (
                    <span
                      className={`rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide ${isDark ? "border-white/70 text-white" : "border-black/40 text-black/70"}`}
                    >
                      proxy
                    </span>
                  )}
                  {isModel && (
                    <span
                      className={`rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide ${isDark ? "border-white/70 text-white" : "border-black/40 text-black/70"}`}
                    >
                      model
                    </span>
                  )}
                </span>
                {!compact && (
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider"
                    style={{ color: isDark ? "#ffffffcc" : "#465468" }}
                  >
                    {unavailable ? "not produced" : counts ? count.toLocaleString() : key}
                  </span>
                )}
              </div>
              {!compact && (
                <p
                  className="px-3 pb-3 text-[11px] leading-snug"
                  style={{ color: isDark ? "#ffffffcc" : "#465468" }}
                >
                  {unavailable
                    ? "Requires local affordability evidence."
                    : key === "unknown" && proxyMode
                      ? "Evidence cannot distinguish mirage from oasis."
                      : l.shortDef}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
