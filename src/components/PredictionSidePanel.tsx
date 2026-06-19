import { LABELS } from "../data/labels";
import type { HexPrediction } from "../data/mockData";

interface Props {
  hex: HexPrediction | null;
  onClose: () => void;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 py-2 last:border-b-0">
      <span className="smallcaps text-[10px] text-muted-foreground">{label}</span>
      <span className="metric-num text-sm text-foreground">{value}</span>
    </div>
  );
}

export function PredictionSidePanel({ hex, onClose }: Props) {
  if (!hex) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="smallcaps text-[10px] text-muted-foreground">No selection</p>
        <p className="mt-3 max-w-[28ch] font-serif text-base leading-snug text-foreground">
          Click any area on the map to see what food access looks like there.
        </p>
      </div>
    );
  }
  const label = LABELS[hex.predicted];
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">{hex.ward}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block size-3 rounded-sm" style={{ backgroundColor: label.color }} />
            <h3 className="font-serif text-xl font-medium text-foreground">{label.name}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{label.shortDef}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-5 rounded-md bg-secondary/60 p-3">
          <div className="flex items-baseline justify-between">
            <span className="smallcaps text-[10px] text-muted-foreground">How certain is this estimate?</span>
            <span className="metric-num text-base text-foreground">
              {(hex.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full"
              style={{
                width: `${hex.confidence * 100}%`,
                backgroundColor: hex.confidence > 0.75 ? "var(--color-oasis)" : "var(--color-desert)",
              }}
            />
          </div>
        </div>

        <p className="smallcaps mb-2 text-[10px] text-muted-foreground">Access breakdown</p>
        <Stat label="Food access" value={hex.scores.access.toFixed(2)} />
        <Stat label="Affordability" value={hex.scores.affordability.toFixed(2)} />
        <Stat label="Quality" value={hex.scores.quality.toFixed(2)} />

        <p className="smallcaps mb-2 mt-5 text-[10px] text-muted-foreground">What's nearby</p>
        <Stat label="Grocery stores nearby" value={hex.context.groceryCount} />
        <Stat label="Restaurants nearby" value={hex.context.restaurantCount} />
        <Stat label="Distance to nearest food" value={`${hex.context.nearestFoodKm.toFixed(2)} km`} />
        <Stat label="Population density" value={`${hex.context.populationDensity.toLocaleString()} /km²`} />
      </div>
    </div>
  );
}
