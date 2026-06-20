import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { AnimatePresence, motion } from "motion/react";
import { LABELS, type LabelKey } from "../data/labels";
import { labelColor } from "../data/realData";
import { spring, useMotionPresets } from "../lib/motion";

// Same token as NodeMap.tsx — keep them in sync.
mapboxgl.accessToken =
  "pk.eyJ1IjoibmloYWxtYW5uYXQiLCJhIjoiY21xaTllOGxjMDNmYTJzc2I4YmN6YjhoNyJ9.vrJ2OuIEe-7UZMcPnn36CA";

type View = "wards" | "nodes" | "both";

interface WardProps {
  ward_no: number;
  ward_name: string;
  label_name: string; // food_desert | food_oasis | food_mirage | food_swamp
  label_confidence_score: number;
  access_score: number;
  affordability_score: number;
  quality_diversity_score: number;
  cuisine_entropy: number;
  restaurant_count: number;
  grocery_count_final: number;
}

const BASE_LABELS: LabelKey[] = ["desert", "oasis", "mirage", "swamp"];

function baseLabel(labelName: string): LabelKey {
  const k = labelName.replace("food_", "") as LabelKey;
  return BASE_LABELS.includes(k) ? k : "unknown";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WARD_COLOR: any = [
  "match",
  ["get", "label_name"],
  "food_desert", labelColor("desert"),
  "food_oasis", labelColor("oasis"),
  "food_mirage", labelColor("mirage"),
  "food_swamp", labelColor("swamp"),
  labelColor("unknown"),
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NODE_COLOR: any = [
  "match",
  ["get", "label"],
  "desert", labelColor("desert"),
  "swamp", labelColor("swamp"),
  "mirage", labelColor("mirage"),
  "oasis", labelColor("oasis"),
  labelColor("unknown"),
];

function applyView(map: mapboxgl.Map, view: View) {
  if (!map.getLayer("ward-fill")) return;
  const showNodes = view !== "wards";
  map.setLayoutProperty("node-pt", "visibility", showNodes ? "visible" : "none");
  map.setLayoutProperty("ward-fill", "visibility", view === "nodes" ? "none" : "visible");

  const base = view === "both" ? 0.4 : 0.62;
  const hov = view === "both" ? 0.58 : 0.78;
  const sel = view === "both" ? 0.72 : 0.9;
  map.setPaintProperty("ward-fill", "fill-opacity", [
    "case",
    ["boolean", ["feature-state", "selected"], false], sel,
    ["boolean", ["feature-state", "hover"], false], hov,
    base,
  ]);
  map.setPaintProperty("ward-outline", "line-color", [
    "case",
    ["boolean", ["feature-state", "selected"], false], "#1a1a1a",
    view === "nodes" ? "rgba(26,26,26,0.12)" : "rgba(26,26,26,0.3)",
  ]);
}

export function WardMap({
  wardsUrl,
  nodesUrl,
  center,
  zoom,
}: {
  wardsUrl: string;
  nodesUrl: string;
  center: [number, number];
  zoom: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const hoverRef = useRef<number | null>(null);
  const selRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("both");
  const [selected, setSelected] = useState<WardProps | null>(null);
  const { reduce } = useMotionPresets();

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom,
      attributionControl: false,
      projection: { name: "mercator" },
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    map.on("load", () => {
      map.addSource("wards", { type: "geojson", data: wardsUrl, promoteId: "ward_no" });
      map.addSource("nodes", { type: "geojson", data: nodesUrl, promoteId: "id" });

      map.addLayer({
        id: "ward-fill",
        type: "fill",
        source: "wards",
        paint: {
          "fill-color": WARD_COLOR,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 0.72,
            ["boolean", ["feature-state", "hover"], false], 0.58,
            0.4,
          ],
          "fill-opacity-transition": { duration: 180 },
        },
      });
      map.addLayer({
        id: "ward-outline",
        type: "line",
        source: "wards",
        paint: {
          "line-color": "rgba(26,26,26,0.3)",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 2.2,
            ["boolean", ["feature-state", "hover"], false], 1.3,
            0.6,
          ],
          "line-width-transition": { duration: 150 },
        },
      });
      map.addLayer({
        id: "node-pt",
        type: "circle",
        source: "nodes",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1.3, 12, 2.6, 15, 5],
          "circle-color": NODE_COLOR,
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["get", "confidence"],
            0.3, 0.5,
            0.95, 0.92,
          ],
          "circle-stroke-width": 0.3,
          "circle-stroke-color": "rgba(255,255,255,0.65)",
        },
      });

      applyView(map, "both");

      map.on("mousemove", "ward-fill", (e) => {
        const f = e.features?.[0] as unknown as { id?: number } | undefined;
        const id = f?.id;
        if (id == null) return;
        map.getCanvas().style.cursor = "pointer";
        if (hoverRef.current !== null && hoverRef.current !== id) {
          map.setFeatureState({ source: "wards", id: hoverRef.current }, { hover: false });
        }
        hoverRef.current = id;
        map.setFeatureState({ source: "wards", id }, { hover: true });
      });
      map.on("mouseleave", "ward-fill", () => {
        map.getCanvas().style.cursor = "";
        if (hoverRef.current !== null) {
          map.setFeatureState({ source: "wards", id: hoverRef.current }, { hover: false });
        }
        hoverRef.current = null;
      });
      map.on("click", "ward-fill", (e) => {
        const f = e.features?.[0] as unknown as { id?: number; properties?: WardProps } | undefined;
        const id = f?.id;
        if (id == null) return;
        if (selRef.current !== null) {
          map.setFeatureState({ source: "wards", id: selRef.current }, { selected: false });
        }
        selRef.current = id;
        map.setFeatureState({ source: "wards", id }, { selected: true });
        setSelected(f?.properties as WardProps);
      });
    });

    map.on("idle", () => setReady(true));

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map && map.isStyleLoaded()) applyView(map, view);
  }, [view]);

  const clearSelection = () => {
    const map = mapRef.current;
    if (map && selRef.current !== null) {
      map.setFeatureState({ source: "wards", id: selRef.current }, { selected: false });
    }
    selRef.current = null;
    setSelected(null);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />

      {/* View toggle */}
      <div className="absolute right-3 top-3 z-20">
        <ViewToggle value={view} onChange={setView} reduce={reduce} />
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-sm border border-border bg-card/85 px-3 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {(["oasis", "desert", "swamp", "mirage"] as LabelKey[]).map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 smallcaps text-[9px] text-muted-foreground"
            >
              <span className="size-2 rounded-[2px]" style={{ background: labelColor(k) }} />
              {LABELS[k].name.replace("Food ", "")}
            </span>
          ))}
        </div>
      </div>

      {/* Ward detail */}
      <AnimatePresence>
        {selected && <WardDetail ward={selected} onClose={clearSelection} reduce={reduce} />}
      </AnimatePresence>

      {/* Loading veil */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            className="absolute inset-0 z-30 grid place-items-center bg-[color:var(--color-paper)]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="smallcaps animate-pulse text-[10px] text-muted-foreground">
              Loading Bengaluru…
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
  reduce,
}: {
  value: View;
  onChange: (v: View) => void;
  reduce: boolean | null;
}) {
  const opts: View[] = ["wards", "nodes", "both"];
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-card/90 p-0.5 shadow-sm backdrop-blur">
      {opts.map((o) => {
        const active = value === o;
        return (
          <motion.button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            whileTap={{ scale: 0.94 }}
            className="relative rounded-[5px] px-3 py-1.5"
          >
            {active && (
              <motion.span
                layoutId="ward-view-pill"
                className="absolute inset-0 rounded-[5px] bg-foreground"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span
              className={
                "relative z-10 smallcaps text-[9px] transition-colors " +
                (active ? "text-background" : "text-muted-foreground")
              }
            >
              {o}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function WardDetail({
  ward,
  onClose,
  reduce,
}: {
  ward: WardProps;
  onClose: () => void;
  reduce: boolean | null;
}) {
  const k = baseLabel(ward.label_name);
  return (
    <motion.div
      className="absolute right-3 top-16 z-20 w-64 rounded-md border border-border bg-card/95 p-4 shadow-lg backdrop-blur"
      initial={{ opacity: 0, x: reduce ? 0 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduce ? 0 : 16 }}
      transition={reduce ? { duration: 0 } : spring}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="smallcaps text-[9px] text-muted-foreground">Ward {ward.ward_no}</p>
          <p className="mt-0.5 font-serif text-base leading-tight text-foreground">
            {ward.ward_name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-lg leading-none text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close ward detail"
        >
          ×
        </button>
      </div>

      <div
        className="mt-3 inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5"
        style={{ borderColor: labelColor(k) }}
      >
        <span className="size-1.5 rounded-full" style={{ background: labelColor(k) }} />
        <span className="text-[11px] font-medium text-foreground">{LABELS[k].name}</span>
        <span className="smallcaps text-[8px] text-muted-foreground">
          · {Math.round(ward.label_confidence_score * 100)}% conf
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <ScoreBar label="Access" value={ward.access_score} reduce={reduce} />
        <ScoreBar label="Affordability" value={ward.affordability_score} reduce={reduce} />
        <ScoreBar label="Quality / diversity" value={ward.quality_diversity_score} reduce={reduce} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
        <Stat label="Restaurants" value={ward.restaurant_count ?? "—"} />
        <Stat label="Groceries" value={ward.grocery_count_final ?? "—"} />
        <Stat
          label="Entropy"
          value={typeof ward.cuisine_entropy === "number" ? ward.cuisine_entropy.toFixed(2) : "—"}
        />
      </div>
    </motion.div>
  );
}

function ScoreBar({
  label,
  value,
  reduce,
}: {
  label: string;
  value: number;
  reduce: boolean | null;
}) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  // Below 40 is the deterministic "failing" threshold (access<40 → desert, etc.).
  const color = pct < 40 ? "#d59e71" : "#7a9461";
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="smallcaps text-[9px] text-muted-foreground">{label}</span>
        <span className="metric-num text-[11px] text-foreground">{Math.round(value ?? 0)}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="metric-num text-sm text-foreground">{value}</p>
      <p className="smallcaps text-[8px] text-muted-foreground">{label}</p>
    </div>
  );
}
