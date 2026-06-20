import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { labelColor, type NodeProps, type ScenarioChange } from "../data/realData";

mapboxgl.accessToken =
  "pk.eyJ1IjoibmloYWxtYW5uYXQiLCJhIjoiY21xaTllOGxjMDNmYTJzc2I4YmN6YjhoNyJ9.vrJ2OuIEe-7UZMcPnn36CA";

// label -> color expression used by the circle paint
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COLOR_EXPR: any = [
  "match",
  ["get", "label"],
  "desert",
  labelColor("desert"),
  "swamp",
  labelColor("swamp"),
  "mirage",
  labelColor("mirage"),
  "oasis",
  labelColor("oasis"),
  labelColor("unknown"),
];

function ringPolygon(center: [number, number], radiusM: number, steps = 72) {
  const [lon, lat] = center;
  const coords: [number, number][] = [];
  const dLat = radiusM / 111320;
  const dLon = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    coords.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [coords] },
    properties: {},
  };
}

function hydrateNode(properties: NodeProps): NodeProps {
  const rawFlags = properties.risk_flags as unknown;
  if (typeof rawFlags === "string") {
    try {
      properties.risk_flags = JSON.parse(rawFlags) as string[];
    } catch {
      properties.risk_flags = rawFlags ? [rawFlags] : [];
    }
  }
  const rawProbabilities = properties.model_probabilities as unknown;
  if (typeof rawProbabilities === "string") {
    try {
      properties.model_probabilities = JSON.parse(
        rawProbabilities,
      ) as NodeProps["model_probabilities"];
    } catch {
      properties.model_probabilities = null;
    }
  }
  return properties;
}

interface Props {
  geojsonUrl: string;
  center: [number, number];
  zoom: number;
  filterLabel?: string | null;
  /** node id -> after-label, applied as a recolor when a scenario has run */
  scenarioChanges?: ScenarioChange[] | null;
  hub?: [number, number] | null;
  radiusM?: number;
  pickHub?: boolean;
  onPickHub?: (lonlat: [number, number]) => void;
  onSelect?: (props: NodeProps) => void;
  selectedId?: number | null;
  caption?: string;
}

export function NodeMap({
  geojsonUrl,
  center,
  zoom,
  filterLabel,
  scenarioChanges,
  hub,
  radiusM = 2000,
  pickHub,
  onPickHub,
  onSelect,
  selectedId,
  caption,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);
  const cbRef = useRef({ onSelect, onPickHub, pickHub });
  cbRef.current = { onSelect, onPickHub, pickHub };
  const changedRef = useRef<Set<number>>(new Set());

  // init map once per source url / center
  useEffect(() => {
    if (!containerRef.current) return;
    readyRef.current = false;
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
      map.addSource("nodes", { type: "geojson", data: geojsonUrl, promoteId: "id" });
      map.addSource("ring", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("hub", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      // radius ring (under nodes)
      map.addLayer({
        id: "ring-fill",
        type: "fill",
        source: "ring",
        paint: { "fill-color": "#15191f", "fill-opacity": 0.06 },
      });
      map.addLayer({
        id: "ring-line",
        type: "line",
        source: "ring",
        paint: {
          "line-color": "#15191f",
          "line-width": 1,
          "line-dasharray": [2, 2],
          "line-opacity": 0.5,
        },
      });

      // nodes
      map.addLayer({
        id: "node-pt",
        type: "circle",
        source: "nodes",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1.6, 12, 2.8, 15, 5.5],
          "circle-color": ["coalesce", ["feature-state", "afterColor"], COLOR_EXPR],
          "circle-opacity": [
            "case",
            ["==", ["feature-state", "dim"], true],
            0.12,
            ["interpolate", ["linear"], ["get", "confidence"], 0.3, 0.55, 0.95, 0.95],
          ],
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.2,
            ["boolean", ["feature-state", "moved"], false],
            1.4,
            ["==", ["get", "evidence_level"], "proxy"],
            0.8,
            ["==", ["get", "evidence_level"], "model"],
            0.8,
            0,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#15191f",
            ["boolean", ["feature-state", "moved"], false],
            "#1a7a4a",
            ["==", ["get", "evidence_level"], "model"],
            "#15191f",
            "#ffffff",
          ],
        },
      });

      // hub marker
      map.addLayer({
        id: "hub-pt",
        type: "circle",
        source: "hub",
        paint: {
          "circle-radius": 7,
          "circle-color": "#15191f",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

      readyRef.current = true;
      map.getCanvas().style.cursor = cbRef.current.pickHub ? "crosshair" : "";
      applyRing();
      applyHub();

      map.on("click", "node-pt", (e) => {
        const f = e.features?.[0] as unknown as { properties?: NodeProps } | undefined;
        const p = f?.properties;
        if (p && cbRef.current.onSelect) cbRef.current.onSelect(hydrateNode(p));
      });
      map.on("click", (e) => {
        if (!cbRef.current.pickHub || !cbRef.current.onPickHub) return;
        cbRef.current.onPickHub([+e.lngLat.lng.toFixed(5), +e.lngLat.lat.toFixed(5)]);
      });
      map.on("mouseenter", "node-pt", () => {
        if (!cbRef.current.pickHub) map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "node-pt", () => {
        map.getCanvas().style.cursor = cbRef.current.pickHub ? "crosshair" : "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojsonUrl]);

  // cursor reflects pick mode
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) map.getCanvas().style.cursor = pickHub ? "crosshair" : "";
  }, [pickHub]);

  // radius ring + hub marker
  function applyRing() {
    const map = mapRef.current;
    const src = map?.getSource("ring") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(
      hub
        ? { type: "FeatureCollection", features: [ringPolygon(hub, radiusM)] }
        : { type: "FeatureCollection", features: [] },
    );
  }
  function applyHub() {
    const map = mapRef.current;
    const src = map?.getSource("hub") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(
      hub
        ? {
            type: "FeatureCollection",
            features: [
              { type: "Feature", geometry: { type: "Point", coordinates: hub }, properties: {} },
            ],
          }
        : { type: "FeatureCollection", features: [] },
    );
  }
  useEffect(() => {
    if (readyRef.current) {
      applyRing();
      applyHub();
    }
  }, [hub, radiusM]); // eslint-disable-line

  // filter dim
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.removeFeatureState({ source: "nodes" });
    // re-apply selection + scenario after clearing
    reapplyScenario();
    if (filterLabel) {
      // dim is set via querying rendered features is heavy; instead use paint filter opacity by label
      map.setPaintProperty("node-pt", "circle-opacity", [
        "case",
        ["!=", ["get", "label"], filterLabel],
        0.08,
        ["interpolate", ["linear"], ["get", "confidence"], 0.3, 0.55, 0.95, 0.95],
      ]);
    } else {
      map.setPaintProperty("node-pt", "circle-opacity", [
        "case",
        ["==", ["feature-state", "dim"], true],
        0.12,
        ["interpolate", ["linear"], ["get", "confidence"], 0.3, 0.55, 0.95, 0.95],
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLabel]);

  function reapplyScenario() {
    const map = mapRef.current;
    if (!map) return;
    changedRef.current.forEach((id) =>
      map.setFeatureState({ source: "nodes", id }, { afterColor: null, moved: false }),
    );
    changedRef.current = new Set();
    if (scenarioChanges) {
      scenarioChanges.forEach((ch) => {
        map.setFeatureState(
          { source: "nodes", id: ch.id },
          {
            afterColor: labelColor(ch.after),
            moved: ch.before === "desert" && ch.after !== "desert",
          },
        );
        changedRef.current.add(ch.id);
      });
    }
  }

  // scenario recolor
  useEffect(() => {
    if (readyRef.current) reapplyScenario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioChanges]);

  // selection highlight
  const lastSel = useRef<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (lastSel.current != null)
      map.setFeatureState({ source: "nodes", id: lastSel.current }, { selected: false });
    if (selectedId != null) {
      map.setFeatureState({ source: "nodes", id: selectedId }, { selected: true });
      lastSel.current = selectedId;
    } else lastSel.current = null;
  }, [selectedId]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm border border-border">
      <div ref={containerRef} className="h-full w-full" />
      {caption && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-sm bg-white/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-deep)] backdrop-blur">
          {caption}
        </div>
      )}
      {pickHub && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-sm bg-[#15191f] px-3 py-1.5 text-[11px] font-medium text-white">
          Click the map to place the jobs hub
        </div>
      )}
    </div>
  );
}
