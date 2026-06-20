import { LABELS } from "../data/labels";
import { labelColor, type NodeProps, type ScenarioChange } from "../data/realData";

function Row({ label, value, after }: { label: string; value: string | number; after?: string | number }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 py-2 last:border-b-0">
      <span className="smallcaps text-[10px] text-muted-foreground">{label}</span>
      <span className="metric-num text-sm text-foreground">
        {value}
        {after !== undefined && after !== value && (
          <span className="ml-2 text-[color:var(--color-oasis)]">→ {after}</span>
        )}
      </span>
    </div>
  );
}

interface Props {
  node: NodeProps | null;
  change?: ScenarioChange | null;
  onClose: () => void;
}

export function NodeSidePanel({ node, change, onClose }: Props) {
  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="smallcaps text-[10px] text-muted-foreground">No node selected</p>
        <p className="mt-3 max-w-[30ch] font-serif text-base leading-snug text-foreground">
          Click any road-intersection node on the map to inspect its features and label.
        </p>
      </div>
    );
  }
  const baseLabel = LABELS[node.label];
  const afterLabel = change ? LABELS[change.after] : null;
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="smallcaps text-[10px] text-muted-foreground">
            node #{node.id} · {node.ward}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block size-3 rounded-full" style={{ backgroundColor: labelColor(node.label) }} />
            <h3 className="font-serif text-xl font-medium text-foreground">{baseLabel.name}</h3>
            {afterLabel && change && change.after !== change.before && (
              <>
                <span className="text-muted-foreground">→</span>
                <span className="inline-block size-3 rounded-full" style={{ backgroundColor: labelColor(change.after) }} />
                <span className="font-serif text-xl font-medium text-[color:var(--color-oasis-deep,#3f6b46)]">{afterLabel.name}</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{(afterLabel ?? baseLabel).shortDef}</p>
          {change?.spillover && (
            <p className="mt-1 text-[11px] italic text-[color:var(--color-ink-deep)]">
              Changed via graph spillover (a neighbouring intersection improved).
            </p>
          )}
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
            <span className="smallcaps text-[10px] text-muted-foreground">Label confidence</span>
            <span className="metric-num text-base text-foreground">{(node.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full"
              style={{
                width: `${node.confidence * 100}%`,
                backgroundColor: node.confidence > 0.75 ? "var(--color-oasis)" : "var(--color-desert)",
              }}
            />
          </div>
        </div>

        <p className="smallcaps mb-2 text-[10px] text-muted-foreground">Food-environment scores</p>
        <Row label="Access" value={node.access.toFixed(2)} />
        <Row label="Affordability" value={node.affordability.toFixed(2)} />
        <Row label="Quality / diversity" value={node.quality.toFixed(2)} />

        <p className="smallcaps mb-2 mt-5 text-[10px] text-muted-foreground">Transferable OSM features</p>
        <Row label="Food outlets ≤800 m" value={node.food_800m} />
        <Row label="Food outlets ≤1500 m" value={node.food_1500m} />
        <Row label="Nearest food (km)" value={node.nearest_food_km.toFixed(2)} />
        <Row label="Road degree" value={node.road_degree} />
        <Row label="Intersections ≤1 km" value={node.inter_density_1km} />
        <Row label="Access percentile" value={`${node.access_pct.toFixed(0)}%`} />
      </div>
    </div>
  );
}
