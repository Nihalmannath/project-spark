import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { AnimatePresence, motion } from "motion/react";
import { WORLD_CITIES, LIVE_WORLD_CITY, type WorldCity } from "../data/world-cities";
import { spring } from "../lib/motion";

// Same token as NodeMap.tsx — keep them in sync.
mapboxgl.accessToken =
  "pk.eyJ1IjoibmloYWxtYW5uYXQiLCJhIjoiY21xaTllOGxjMDNmYTJzc2I4YmN6YjhoNyJ9.vrJ2OuIEe-7UZMcPnn36CA";

type Projected = { city: WorldCity; x: number; y: number; visible: boolean };

const LIVE = "#ffc000";
const DIM = "#8492a1";

// Unit vector on a sphere for a lng/lat (degrees).
function vec(lng: number, lat: number): [number, number, number] {
  const a = (lat * Math.PI) / 180;
  const b = (lng * Math.PI) / 180;
  return [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)];
}

// A pin is on the visible hemisphere when its bearing from the globe's centre
// point is within ~90°. Small positive margin hides pins clipping the limb.
function onNearSide(center: mapboxgl.LngLat, lng: number, lat: number): boolean {
  const c = vec(center.lng, center.lat);
  const p = vec(lng, lat);
  return c[0] * p[0] + c[1] * p[1] + c[2] * p[2] > 0.06;
}

export function WorldCityMap({ onSelectLive }: { onSelectLive: (city: WorldCity) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [pins, setPins] = useState<Projected[]>([]);
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [55, 18],
      zoom: 1.35,
      minZoom: 1,
      maxZoom: 5,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
      projection: { name: "globe" },
    });
    mapRef.current = map;
    map.scrollZoom.disable(); // never hijack page scroll — spin by dragging instead
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disableRotation();
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    const project = () => {
      const center = map.getCenter();
      setPins(
        WORLD_CITIES.map((city) => {
          const p = map.project(city.coords);
          return {
            city,
            x: p.x,
            y: p.y,
            visible: onNearSide(center, city.coords[0], city.coords[1]),
          };
        }),
      );
    };

    map.on("load", () => {
      // Paper-coloured space so the globe blends into the page (matches --paper).
      map.setFog({
        color: "rgb(248,246,242)",
        "high-color": "rgb(216,210,196)",
        "horizon-blend": 0.04,
        "space-color": "rgb(248,246,242)",
        "star-intensity": 0,
      });
      setReady(true);
      project();
    });
    map.on("move", project);
    map.on("resize", project);
    map.on("click", () => setActiveId(null)); // empty-space click dismisses popover

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const activePin = activeId ? pins.find((p) => p.city.id === activeId) : null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />

      {ready &&
        pins.map(({ city, x, y, visible }) => (
          <CityPin
            key={city.id}
            city={city}
            x={x}
            y={y}
            visible={visible}
            active={activeId === city.id}
            onClick={() => {
              if (city.status !== "coming-soon") onSelectLive(city);
              else setActiveId((id) => (id === city.id ? null : city.id));
            }}
          />
        ))}

      <AnimatePresence>
        {activePin && activePin.visible && (
          <motion.div
            className="pointer-events-auto absolute z-30 w-60 -translate-x-1/2 -translate-y-full"
            style={{ left: activePin.x, top: activePin.y - 20 }}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={spring}
          >
            <div className="rounded-md border border-border bg-card p-4 text-left shadow-lg">
              <p className="smallcaps text-[9px] text-muted-foreground">Coming soon</p>
              <p className="mt-1 font-serif text-sm text-foreground">
                {activePin.city.name}
                <span className="text-muted-foreground">, {activePin.city.country}</span>
              </p>
              <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
                We&apos;re mapping {activePin.city.name} next. Bengaluru and Mysuru are selectable
                today.
              </p>
              <button
                type="button"
                onClick={() => onSelectLive(LIVE_WORLD_CITY)}
                className="smallcaps mt-3 text-[9px] text-foreground underline-offset-4 transition-colors hover:underline"
              >
                Explore Bengaluru instead →
              </button>
            </div>
            <div className="mx-auto -mt-1 h-2 w-2 rotate-45 border-b border-r border-border bg-card" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CityPin({
  city,
  x,
  y,
  visible,
  active,
  onClick,
}: {
  city: WorldCity;
  x: number;
  y: number;
  visible: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const runnable = city.status !== "coming-soon";
  const available = city.status === "available";
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="group absolute z-20 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center"
      style={{ left: x, top: y, pointerEvents: visible ? "auto" : "none" }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.4 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={visible ? { scale: 1.18, zIndex: 25 } : undefined}
      whileTap={visible ? { scale: 0.9 } : undefined}
    >
      <span className="relative grid place-items-center">
        {runnable && (
          <motion.span
            aria-hidden
            className="absolute rounded-full"
            style={{ width: 12, height: 12, background: available ? LIVE : "#d59e71" }}
            animate={{ scale: [1, 2.8], opacity: [0.45, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }}
          />
        )}
        <span
          className="relative rounded-full"
          style={
            runnable
              ? {
                  width: 11,
                  height: 11,
                  background: available ? LIVE : "#d59e71",
                  boxShadow: available
                    ? "0 0 0 1.5px rgba(26,26,26,.18), 0 0 12px 2px rgba(255,192,0,.55)"
                    : "0 0 0 1.5px rgba(26,26,26,.18), 0 0 10px 1px rgba(213,158,113,.5)",
                }
              : {
                  width: 7,
                  height: 7,
                  background: active ? "#1a1a1a" : DIM,
                  boxShadow: "0 0 0 1px rgba(248,246,242,.9)",
                }
          }
        />
      </span>
      <span
        className={
          "mt-1.5 whitespace-nowrap smallcaps text-[9px] transition-colors " +
          (runnable || active
            ? "text-foreground"
            : "text-muted-foreground/70 group-hover:text-foreground")
        }
      >
        {city.name}
      </span>
    </motion.button>
  );
}
