import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { HEXES, type HexPrediction } from "../data/mockData";
import { LABELS, type LabelKey } from "../data/labels";

mapboxgl.accessToken =
  "pk.eyJ1IjoibmloYWxtYW5uYXQiLCJhIjoiY21xaTllOGxjMDNmYTJzc2I4YmN6YjhoNyJ9.vrJ2OuIEe-7UZMcPnn36CA";

const HEX_R = 0.013;

function hexPolygon(cx: number, cy: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.9]);
  }
  pts.push(pts[0]);
  return pts;
}

function colorHex(c: string) {
  const map: Record<string, string> = {
    desert: "#d59e71",
    swamp: "#3d5a80",
    mirage: "#ffe09d",
    oasis: "#b9ca9d",
    unknown: "#c9d4e0",
  };
  return map[c] || "#888";
}

function buildFC(
  hexes: HexPrediction[],
  center: [number, number],
  filter?: LabelKey | null,
  hideLowConf?: boolean,
  shift?: (h: HexPrediction) => LabelKey,
  scale = 1,
) {
  const r = HEX_R * scale;
  const features = hexes
    .filter((h) => !(hideLowConf && h.confidence < 0.6))
    .map((h) => {
      const label = shift ? shift(h) : h.predicted;
      const dx = (h.col - 7) * r * 1.732;
      const dy = (h.row - 6) * r * 1.5;
      const cx = center[0] + dx + (h.row % 2 === 1 ? r * 0.866 : 0);
      const cy = center[1] - dy;
      return {
        type: "Feature" as const,
        id: parseInt(h.id.slice(1), 10) + (h.id.charCodeAt(0) * 100000),
        geometry: { type: "Polygon" as const, coordinates: [hexPolygon(cx, cy, r)] },
        properties: {
          id: h.id,
          predicted: label,
          color: colorHex(label),
          confidence: h.confidence,
          dim: filter && label !== filter ? 1 : 0,
        },
      };
    });
  return { type: "FeatureCollection" as const, features };
}

interface Props {
  filterLabel?: LabelKey | null;
  hideLowConfidence?: boolean;
  selectedId?: string | null;
  scenarioShift?: (h: HexPrediction) => LabelKey;
  onSelect: (hex: HexPrediction) => void;
  center?: [number, number];
  zoom?: number;
  hexes?: HexPrediction[];
  scale?: number;
  caption?: string;
}

export function MapDashboard({
  filterLabel,
  hideLowConfidence,
  selectedId,
  scenarioShift,
  onSelect,
  center = [77.5946, 12.9716],
  zoom = 10.3,
  hexes = HEXES,
  scale = 1,
  caption,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const dataKey = useMemo(() => `${center[0]}|${hexes.length}`, [center, hexes]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    map.on("load", () => {
      map.addSource("hexes", { type: "geojson", data: buildFC(hexes, center, filterLabel, hideLowConfidence, scenarioShift, scale) });
      map.addLayer({
        id: "hex-fill",
        type: "fill",
        source: "hexes",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": [
            "case",
            ["==", ["get", "dim"], 1], 0.18,
            ["boolean", ["feature-state", "selected"], false], 0.95,
            0.72,
          ],
        },
      });
      map.addLayer({
        id: "hex-outline",
        type: "line",
        source: "hexes",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false], "#1a1a1a",
            "rgba(26,26,26,0.25)",
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 2.2,
            0.6,
          ],
        },
      });

      map.on("click", "hex-fill", (e) => {
        const f = e.features?.[0] as { properties?: { id?: string } } | undefined;
        const id = f?.properties?.id;
        if (!id) return;
        const hex = hexes.find((h) => h.id === id);
        if (hex) onSelect(hex);
      });
      map.on("mouseenter", "hex-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "hex-fill", () => { map.getCanvas().style.cursor = ""; });
    });
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("hexes") as mapboxgl.GeoJSONSource | undefined;
      if (src) src.setData(buildFC(hexes, center, filterLabel, hideLowConfidence, scenarioShift, scale));
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [filterLabel, hideLowConfidence, scenarioShift, hexes, center, scale]);

  const lastSelRef = useRef<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (lastSelRef.current != null) {
        map.setFeatureState({ source: "hexes", id: lastSelRef.current }, { selected: false });
      }
      if (selectedId) {
        const hex = hexes.find((h) => h.id === selectedId);
        if (hex) {
          const numeric = parseInt(hex.id.slice(1), 10) + (hex.id.charCodeAt(0) * 100000);
          map.setFeatureState({ source: "hexes", id: numeric }, { selected: true });
          lastSelRef.current = numeric;
        }
      } else {
        lastSelRef.current = null;
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [selectedId, hexes]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm border border-border">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-sm bg-white/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-deep)] backdrop-blur">
        {caption || `Bengaluru · adaptive hex grid · ${LABELS.swamp.name.split(" ")[0]} palette`}
      </div>
    </div>
  );
}
