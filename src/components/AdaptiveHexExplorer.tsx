import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import mapboxgl from "mapbox-gl";
import { ExternalLink, X } from "lucide-react";
import { useMotionPresets } from "../lib/motion";
import { Legend } from "./Legend";
import { Term } from "./Term";
import { labelColor } from "../data/realData";
import { type LabelKey } from "../data/labels";

mapboxgl.accessToken =
  "pk.eyJ1IjoibmloYWxtYW5uYXQiLCJhIjoiY21xaTllOGxjMDNmYTJzc2I4YmN6YjhoNyJ9.vrJ2OuIEe-7UZMcPnn36CA";

type MetricKey =
  | "label"
  | "access_score"
  | "affordability_score"
  | "quality_diversity_score"
  | "stability_score"
  | "label_confidence_score";

type HexProperties = Record<string, string | number | boolean | null>;
type HexCollection = { type: "FeatureCollection"; features: Array<{ properties: HexProperties | null }> };

const METRICS: Array<{ key: MetricKey; label: string; short: string }> = [
  { key: "label", label: "Food climate", short: "Climate" },
  { key: "access_score", label: "Access score", short: "Access" },
  { key: "affordability_score", label: "Affordability score", short: "Affordability" },
  { key: "quality_diversity_score", label: "Quality & diversity", short: "Quality" },
  { key: "stability_score", label: "Stability score", short: "Stability" },
  { key: "label_confidence_score", label: "Target confidence", short: "Confidence" },
];

// adaptive label_name -> base LabelKey + a one-line "why this climate"
const CLIMATE: Record<string, { key: LabelKey; name: string; definition: string }> = {
  food_desert: { key: "desert", name: "Food desert", definition: "Access is the first failing condition." },
  food_oasis: { key: "oasis", name: "Food oasis", definition: "Access, affordability, and quality all pass." },
  food_mirage: { key: "mirage", name: "Food mirage", definition: "Food is nearby, but affordability fails." },
  food_swamp: { key: "swamp", name: "Food swamp", definition: "Access passes, but quality & diversity fail." },
};

const LABEL_EXPRESSION: mapboxgl.Expression = [
  "match",
  ["get", "label_name"],
  "food_desert", labelColor("desert"),
  "food_oasis", labelColor("oasis"),
  "food_mirage", labelColor("mirage"),
  "food_swamp", labelColor("swamp"),
  "#c9d4e0",
];

// One coherent sequential ramp (0–100): low = scarce/red → high = healthy/green.
// Ends in the same green the score bars + the rest of the app use for "good",
// and deliberately avoids the categorical navy/terracotta so the two map modes
// never contradict the legend.
const SCORE_STOPS: Array<[number, string]> = [
  [0, "#c0532f"], [35, "#dd9b6b"], [55, "#f0c674"], [75, "#9bb277"], [100, "#5e7d4f"],
];
// Confidence is certainty, not good/bad — a single neutral hue, faint → ink.
const CONF_STOPS: Array<[number, string]> = [
  [0, "#e6dfd0"], [50, "#9aa1a8"], [100, "#2b2b2b"],
];

function buildInterp(value: mapboxgl.Expression, stops: Array<[number, string]>): mapboxgl.Expression {
  const out: unknown[] = ["interpolate", ["linear"], value];
  for (const [v, c] of stops) out.push(v, c);
  return out as mapboxgl.Expression;
}

function metricExpression(metric: MetricKey): mapboxgl.Expression {
  if (metric === "label") return LABEL_EXPRESSION;
  if (metric === "label_confidence_score") {
    // stored as a 0–1 fraction; scale to the shared 0–100 domain
    const value: mapboxgl.Expression = ["*", ["coalesce", ["to-number", ["get", metric]], 0], 100];
    return buildInterp(value, CONF_STOPS);
  }
  const value: mapboxgl.Expression = ["coalesce", ["to-number", ["get", metric]], 50];
  return buildInterp(value, SCORE_STOPS);
}

// JS twin of SCORE_STOPS so the detail-panel bars match the map exactly.
function scoreColor(value: number): string {
  const v = Math.max(0, Math.min(100, value));
  for (let i = 1; i < SCORE_STOPS.length; i++) {
    const [v0, c0] = SCORE_STOPS[i - 1];
    const [v1, c1] = SCORE_STOPS[i];
    if (v <= v1) return lerpHex(c0, c1, (v - v0) / (v1 - v0));
  }
  return SCORE_STOPS[SCORE_STOPS.length - 1][1];
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const mix = pa.map((x, i) => Math.round(x + (pb[i] - x) * Math.max(0, Math.min(1, t))));
  return `#${mix.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export function AdaptiveHexExplorer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const hoverIdRef = useRef<string | null>(null);
  const [data, setData] = useState<HexCollection | null>(null);
  const [ready, setReady] = useState(false);
  const [metric, setMetric] = useState<MetricKey>("label");
  const [filter, setFilter] = useState<LabelKey | null>(null);
  const [selected, setSelected] = useState<HexProperties | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { reduce } = useMotionPresets();

  // fetch the geojson once — used for both the map source and the legend counts
  useEffect(() => {
    let alive = true;
    fetch("/data/adaptive_hex_labels.geojson")
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { desert: 0, oasis: 0, mirage: 0, swamp: 0, unknown: 0 };
    let mergedBase = 0;
    if (data) {
      for (const f of data.features) {
        const key = String(f.properties?.label_name ?? "").replace("food_", "");
        if (key in counts) counts[key] += 1;
        mergedBase += Number(f.properties?.source_hex_count ?? 1) || 0;
      }
    }
    return { counts, total: data?.features.length ?? 0, mergedBase };
  }, [data]);

  // init the map once on mount (source streams from the served geojson URL)
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [77.5946, 12.9716],
      zoom: 10.35,
      minZoom: 9,
      maxZoom: 15,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    popupRef.current = popup;

    map.on("load", () => {
      map.addSource("adaptive-hexes", {
        type: "geojson",
        data: "/data/adaptive_hex_labels.geojson",
        promoteId: "adaptive_hex_id",
      });
      map.addLayer({
        id: "adaptive-fill",
        type: "fill",
        source: "adaptive-hexes",
        paint: {
          "fill-color": LABEL_EXPRESSION,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.95,
            ["boolean", ["feature-state", "hover"], false],
            0.88,
            0.74,
          ],
          "fill-opacity-transition": { duration: 180 },
          "fill-color-transition": { duration: 350 },
        },
      });
      map.addLayer({
        id: "adaptive-outline",
        type: "line",
        source: "adaptive-hexes",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#1a1a1a",
            ["boolean", ["feature-state", "hover"], false],
            "rgba(26,26,26,0.55)",
            "rgba(26,26,26,0.20)",
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.4,
            ["boolean", ["feature-state", "hover"], false],
            1.3,
            0.6,
          ],
          "line-width-transition": { duration: 180 },
        },
      });

      map.on("mousemove", "adaptive-fill", (event) => {
        const feature = event.features?.[0] as unknown as
          | { id?: string | number; properties?: HexProperties }
          | undefined;
        const properties = feature?.properties;
        if (!properties) return;
        map.getCanvas().style.cursor = "pointer";
        const id = String(properties.adaptive_hex_id ?? feature?.id ?? "");
        if (hoverIdRef.current && hoverIdRef.current !== id) {
          map.setFeatureState({ source: "adaptive-hexes", id: hoverIdRef.current }, { hover: false });
        }
        if (id) {
          map.setFeatureState({ source: "adaptive-hexes", id }, { hover: true });
          hoverIdRef.current = id;
        }
        const climate = CLIMATE[String(properties.label_name ?? "")];
        const content = document.createElement("div");
        content.className = "adaptive-map-tooltip";
        const swatch = document.createElement("i");
        swatch.style.background = climate ? labelColor(climate.key) : "#c9d4e0";
        const title = document.createElement("strong");
        title.textContent = climate ? climate.name : "Adaptive catchment";
        const head = document.createElement("span");
        head.className = "row";
        head.append(swatch, title);
        const detail = document.createElement("span");
        detail.className = "sub";
        detail.textContent = `${properties.ward_name || properties.adaptive_hex_id || "Bengaluru"} · ${formatPercent(properties.label_confidence_score)} confidence`;
        content.append(head, detail);
        popup.setLngLat(event.lngLat).setDOMContent(content).addTo(map);
      });
      map.on("mouseleave", "adaptive-fill", () => {
        map.getCanvas().style.cursor = "";
        if (hoverIdRef.current) {
          map.setFeatureState({ source: "adaptive-hexes", id: hoverIdRef.current }, { hover: false });
          hoverIdRef.current = null;
        }
        popup.remove();
      });
      map.on("click", "adaptive-fill", (event) => {
        const properties = (event.features?.[0] as unknown as { properties?: HexProperties } | undefined)
          ?.properties;
        if (!properties) return;
        setSelected(properties);
        setSelectedId(String(properties.adaptive_hex_id ?? ""));
      });
      // the map can mount inside an opacity/transform transition (view switch),
      // which leaves the GL canvas sized to 0 — force a measure once visible.
      map.resize();
      requestAnimationFrame(() => map.resize());
      setReady(true);
    });

    // keep the canvas in sync with the flex/grid column as it settles
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      popup.remove();
      map.remove();
      popupRef.current = null;
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPaintProperty("adaptive-fill", "fill-color", metricExpression(metric));
  }, [metric, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const next: mapboxgl.FilterSpecification | null = filter
      ? ["==", ["get", "label_name"], `food_${filter}`]
      : null;
    map.setFilter("adaptive-fill", next);
    map.setFilter("adaptive-outline", next);
  }, [filter, ready]);

  const previousIdRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (previousIdRef.current) {
      map.setFeatureState({ source: "adaptive-hexes", id: previousIdRef.current }, { selected: false });
    }
    if (selectedId) {
      map.setFeatureState({ source: "adaptive-hexes", id: selectedId }, { selected: true });
    }
    previousIdRef.current = selectedId;
  }, [selectedId, ready]);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr_340px]">
      {/* Left — concept + legend + controls */}
      <aside className="space-y-4">
        <section className="rounded-sm border border-border bg-card p-4">
          <p className="smallcaps text-[10px] text-accent">Adaptive catchments · Notebook 08</p>
          <h3 className="mt-1 font-serif text-lg font-medium text-foreground">How each unit is built</h3>
          <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--color-ink-deep)]">
            Instead of fixed wards or a uniform grid, Bengaluru is split into{" "}
            <Term explain="Variable-size units: small base hexes are merged together until each unit holds enough population and food-data coverage to be labelled fairly. Dense, well-mapped areas stay small; sparse areas merge into bigger catchments.">
              adaptive catchments
            </Term>{" "}
            — base hexes merge until each unit has enough population and food-data coverage to label
            fairly.
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--color-ink-deep)]">
            Each catchment's climate is a deterministic rule on four 0–100 scores — access,
            affordability, quality/diversity, stability — with access measured by{" "}
            <Term explain="Two-Step Floating Catchment Area: a food-access measure that accounts for both how many outlets are reachable and how many people compete for them.">
              2SFCA
            </Term>
            .
          </p>
          <p className="source-note mt-3">
            {stats.total.toLocaleString()} catchments · merged from {stats.mergedBase.toLocaleString()} base
            hexes
          </p>
        </section>

        <Legend
          active={filter}
          counts={stats.counts}
          onToggle={(key) => {
            if (key === "unknown") return;
            setFilter((current) => (current === key ? null : key));
          }}
        />

        <section className="rounded-sm border border-border bg-card p-4">
          <p className="smallcaps text-[10px] text-muted-foreground">Colour the map by</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {METRICS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={metric === item.key}
                onClick={() => setMetric(item.key)}
                className={`rounded-sm border px-2.5 py-1.5 text-[10px] transition-colors ${
                  metric === item.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:border-foreground/50"
                }`}
              >
                {item.short}
              </button>
            ))}
          </div>
          {metric !== "label" && (
            <MetricLegend
              stops={metric === "label_confidence_score" ? CONF_STOPS : SCORE_STOPS}
              low={metric === "label_confidence_score" ? "0% · unsure" : "0 · scarce"}
              high={metric === "label_confidence_score" ? "100% · certain" : "100 · healthy"}
            />
          )}
        </section>

        <a
          href="/maps/adaptive_hex_pred_vs_true_map.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Predicted vs true audit map <ExternalLink className="size-3" />
        </a>
      </aside>

      {/* Centre — map */}
      <div className="relative h-[640px] overflow-hidden rounded-sm border border-border bg-card">
        <div ref={containerRef} className="absolute inset-0" />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="smallcaps animate-pulse text-[10px] text-muted-foreground">
              Loading adaptive catchments…
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-sm border border-border bg-card/90 px-3 py-2 text-[10px] text-[color:var(--color-ink-deep)] shadow-sm backdrop-blur">
          <span className="font-medium">Showing:</span>{" "}
          {METRICS.find((item) => item.key === metric)?.label}
        </div>
      </div>

      {/* Right — per-catchment detail */}
      <aside className="h-[640px]">
        {selected ? (
          <div className="h-full overflow-y-auto rounded-sm border border-border bg-card p-5">
            <HexDetails properties={selected} onClose={() => { setSelected(null); setSelectedId(null); }} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-sm border border-dashed border-border bg-card/40 p-8 text-center">
            <p className="smallcaps text-[10px] text-muted-foreground">No catchment selected</p>
            <p className="mt-3 max-w-[30ch] font-serif text-base leading-snug text-foreground">
              Click any catchment on the map to see its scores and why it received its label.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function MetricLegend({ stops, low, high }: { stops: Array<[number, string]>; low: string; high: string }) {
  const max = stops[stops.length - 1][0];
  const gradient = stops.map(([v, c]) => `${c} ${(v / max) * 100}%`).join(", ");
  return (
    <div className="mt-3">
      <div className="h-2 w-full rounded-full" style={{ background: `linear-gradient(to right, ${gradient})` }} />
      <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

function HexDetails({ properties, onClose }: { properties: HexProperties; onClose: () => void }) {
  const climate = CLIMATE[String(properties.label_name ?? "")];
  const wardLabel = CLIMATE[String(properties.ward_label_name ?? "")];
  const merged = Math.max(1, Math.round(numberValue(properties.source_hex_count) ?? 1));
  const wardDiffers = wardLabel && climate && wardLabel.key !== climate.key;
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="smallcaps text-[9px] text-muted-foreground">
            {String(properties.adaptive_hex_id ?? "Adaptive catchment")}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="size-3 rounded-full" style={{ background: climate ? labelColor(climate.key) : "#c9d4e0" }} />
            <h3 className="font-serif text-xl font-medium text-foreground">{climate?.name ?? "Unknown climate"}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {String(properties.ward_name || "Ward context unavailable")}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close catchment details"
          onClick={onClose}
          className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="mt-4 inline-flex items-center gap-1.5 rounded-sm border border-border bg-[color:var(--color-paper)] px-2.5 py-1 text-[11px] text-foreground">
        Merged from <span className="metric-num font-medium">{merged}</span> base{" "}
        {merged === 1 ? "hex" : "hexes"}
      </p>

      <p className="mt-3 rounded-sm bg-muted/60 p-3 text-xs leading-relaxed text-[color:var(--color-ink-deep)]">
        {climate?.definition}
      </p>

      <div className="mt-5 space-y-4">
        <ScoreBar label="Access" value={numberValue(properties.access_score)} />
        <ScoreBar label="Affordability" value={numberValue(properties.affordability_score)} />
        <ScoreBar label="Quality / diversity" value={numberValue(properties.quality_diversity_score)} />
        <ScoreBar label="Stability" value={numberValue(properties.stability_score)} />
      </div>

      <dl className="mt-6 space-y-2 border-t border-border pt-5 text-xs">
        <DetailRow label="Target confidence" value={formatPercent(properties.label_confidence_score)} />
        {wardDiffers && (
          <DetailRow label="Ward broadcast" value={`${wardLabel.name} (this unit: ${climate?.name})`} />
        )}
        <DetailRow label="Primary reason" value={humanize(properties.primary_reason)} />
        <DetailRow label="Boundary margin" value={formatNumber(properties.boundary_margin)} />
        <DetailRow label="Population" value={formatInteger(properties.population)} />
        <DetailRow label="Missing data" value={humanize(properties.missing_flags)} />
      </dl>
      <p className="mt-5 text-[10px] italic leading-relaxed text-muted-foreground">
        Constructed thesis targets, not household survey measurements. Confidence fields describe
        target reliability and are excluded from the model's predictors.
      </p>
    </>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const safe = value ?? 0;
  return (
    <div>
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value == null ? "—" : value.toFixed(1)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, safe))}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ background: scoreColor(safe) }}
        />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[58%] text-right text-foreground">{value}</dd>
    </div>
  );
}

function numberValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatPercent(value: unknown): string {
  const number = numberValue(value);
  return number == null ? "Not available" : `${(number * 100).toFixed(0)}%`;
}

function formatNumber(value: unknown): string {
  const number = numberValue(value);
  return number == null ? "Not available" : number.toFixed(1);
}

function formatInteger(value: unknown): string {
  const number = numberValue(value);
  return number == null ? "Not available" : Math.round(number).toLocaleString();
}

function humanize(value: unknown): string {
  if (value == null || value === "" || value === "none") return "None";
  return String(value).replaceAll(";", ", ").replaceAll("_", " ");
}
