import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Search } from "lucide-react";

// Same token as NodeMap.tsx — keep them in sync.
mapboxgl.accessToken =
  "pk.eyJ1IjoibmloYWxtYW5uYXQiLCJhIjoiY21xaTllOGxjMDNmYTJzc2I4YmN6YjhoNyJ9.vrJ2OuIEe-7UZMcPnn36CA";

const EMPTY = { type: "FeatureCollection" as const, features: [] };

function ring(center: [number, number], radiusM: number, steps = 80) {
  const [lon, lat] = center;
  const coords: [number, number][] = [];
  const dLat = radiusM / 111320;
  const dLon = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    coords.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return {
    type: "FeatureCollection" as const,
    features: [{ type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [coords] }, properties: {} }],
  };
}

/** Pick any point on the world: search to fly, click to drop a centre, radius drawn live. */
export function LocationPicker({
  center,
  radiusM,
  onPick,
}: {
  center: [number, number] | null;
  radiusM: number;
  onPick: (lonlat: [number, number]) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: center ?? [20, 25],
      zoom: center ? 11 : 1.4,
      attributionControl: false,
      projection: { name: "mercator" },
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("ring", { type: "geojson", data: EMPTY });
      map.addLayer({ id: "ring-fill", type: "fill", source: "ring", paint: { "fill-color": "#3d5a80", "fill-opacity": 0.08 } });
      map.addLayer({
        id: "ring-line", type: "line", source: "ring",
        paint: { "line-color": "#3d5a80", "line-width": 1.5, "line-dasharray": [2, 2], "line-opacity": 0.7 },
      });
      map.addSource("pin", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "pin-pt", type: "circle", source: "pin",
        paint: { "circle-radius": 7, "circle-color": "#15191f", "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" },
      });
      readyRef.current = true;
      apply();
    });

    map.getCanvas().style.cursor = "crosshair";
    map.on("click", (e) => onPickRef.current([+e.lngLat.lng.toFixed(5), +e.lngLat.lat.toFixed(5)]));

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function apply() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const ringSrc = map.getSource("ring") as mapboxgl.GeoJSONSource | undefined;
    const pinSrc = map.getSource("pin") as mapboxgl.GeoJSONSource | undefined;
    if (center) {
      ringSrc?.setData(ring(center, radiusM));
      pinSrc?.setData({
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: { type: "Point", coordinates: center }, properties: {} }],
      });
    } else {
      ringSrc?.setData(EMPTY);
      pinSrc?.setData(EMPTY);
    }
  }

  // redraw ring/pin on change; fly to a newly picked centre
  useEffect(() => {
    apply();
    const map = mapRef.current;
    if (map && readyRef.current && center) {
      map.easeTo({ center, zoom: Math.max(map.getZoom(), 10.5), duration: 600 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, radiusM]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?limit=1&access_token=${mapboxgl.accessToken}`,
      );
      const data = await res.json();
      const c = data?.features?.[0]?.center as [number, number] | undefined;
      if (c) onPickRef.current([+c[0].toFixed(5), +c[1].toFixed(5)]);
    } catch {
      /* ignore geocode errors */
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm border border-border">
      <div ref={containerRef} className="h-full w-full" />
      <form
        onSubmit={search}
        className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-sm border border-border bg-card/95 px-2.5 py-1.5 shadow-sm backdrop-blur"
      >
        <Search className="size-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any city or place…"
          className="w-44 bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="smallcaps text-[9px] text-muted-foreground hover:text-foreground">
          {searching ? "…" : "Go"}
        </button>
      </form>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-sm bg-white/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-deep)] backdrop-blur">
        {center ? `centre ${center[1].toFixed(3)}, ${center[0].toFixed(3)}` : "click the map to choose an area centre"}
      </div>
    </div>
  );
}
