import { useMemo, useState } from "react";
import { HEXES, type HexPrediction } from "../data/mockData";
import { LABELS, type LabelKey } from "../data/labels";

interface MapDashboardProps {
  filterLabel?: LabelKey | null;
  onSelect: (hex: HexPrediction) => void;
  selectedId?: string | null;
  scenarioShift?: (h: HexPrediction) => LabelKey;
  hideLowConfidence?: boolean;
}

const HEX_SIZE = 22;
const HEX_W = Math.sqrt(3) * HEX_SIZE;
const HEX_H = 2 * HEX_SIZE;

function hexPoints(cx: number, cy: number, size: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

export function MapDashboard({
  filterLabel,
  onSelect,
  selectedId,
  scenarioShift,
  hideLowConfidence,
}: MapDashboardProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const positioned = useMemo(() => {
    return HEXES.map((h) => {
      const x = h.col * HEX_W + (h.row % 2 === 1 ? HEX_W / 2 : 0) + HEX_W;
      const y = h.row * (HEX_H * 0.75) + HEX_H / 2;
      return { hex: h, x, y };
    });
  }, []);

  const xs = positioned.map((p) => p.x);
  const ys = positioned.map((p) => p.y);
  const minX = Math.min(...xs) - HEX_W;
  const minY = Math.min(...ys) - HEX_H;
  const maxX = Math.max(...xs) + HEX_W;
  const maxY = Math.max(...ys) + HEX_H;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-[var(--paper)]">
      {/* TODO(integration): swap this SVG mock for a Leaflet/Maplibre layer
          rendering `bangalore_access_hex.geojson` once the file is wired in. */}
      <svg
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        className="h-full w-full"
        role="img"
        aria-label="Mock food environment hex map"
      >
        <defs>
          <pattern id="lowconf" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--color-unknown)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,0.2)" strokeWidth="1.2" />
          </pattern>
        </defs>
        {positioned.map(({ hex, x, y }) => {
          const labelKey: LabelKey = scenarioShift ? scenarioShift(hex) : hex.predicted;
          if (hideLowConfidence && hex.confidence < 0.6) return null;
          const dimmed = filterLabel && labelKey !== filterLabel;
          const isSel = selectedId === hex.id;
          const isHover = hoverId === hex.id;
          const fill = labelKey === "unknown" ? "url(#lowconf)" : LABELS[labelKey].color;
          return (
            <polygon
              key={hex.id}
              points={hexPoints(x, y, HEX_SIZE - 1)}
              fill={fill}
              stroke={isSel ? "var(--ink)" : isHover ? "var(--ink)" : "rgba(0,0,0,0.15)"}
              strokeWidth={isSel ? 2.4 : isHover ? 1.6 : 0.6}
              opacity={dimmed ? 0.25 : 0.9}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => setHoverId(hex.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => onSelect(hex)}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-card/90 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur">
        Bengaluru · adaptive hex grid · prototype
      </div>
    </div>
  );
}
