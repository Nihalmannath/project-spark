// Client for the food-environment transfer inference service (pipeline/serve.py).
// Baseline node GeoJSON is loaded statically from /data so the map still renders
// when the service is offline; only live scenario re-inference needs the service.
import type { CityMeta, NodeProps, ScenarioResult } from "../data/realData";

const INFERENCE_URL =
  (import.meta as { env?: Record<string, string> }).env?.VITE_INFERENCE_URL ??
  "http://127.0.0.1:8000";

export interface NodeFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: NodeProps;
}
export interface NodeFeatureCollection {
  type: "FeatureCollection";
  features: NodeFeature[];
}

export async function fetchNodes(city: string): Promise<NodeFeatureCollection> {
  const res = await fetch(`/data/${city}_nodes.geojson`);
  if (!res.ok) throw new Error(`nodes for ${city} not found (${res.status})`);
  return res.json();
}

export async function fetchMeta(city: string): Promise<CityMeta> {
  const res = await fetch(`/data/${city}_meta.json`);
  if (!res.ok) throw new Error(`meta for ${city} not found (${res.status})`);
  return res.json();
}

export interface ScenarioParams {
  hub: [number, number];
  radius_m?: number;
  d_food_800?: number;
  d_food_1500?: number;
  near_floor?: number;
  dens_mult?: number;
  grocery_outlets?: number;
  restaurant_outlets?: number;
  outlet_categories?: Array<"grocery" | "restaurant" | "fast_food" | "cafe">;
  cuisine_categories?: string[];
}

export async function runScenario(city: string, params: ScenarioParams): Promise<ScenarioResult> {
  const res = await fetch(`${INFERENCE_URL}/api/scenario/${city}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ radius_m: 2000, ...params }),
  });
  if (!res.ok) throw new Error(`scenario failed (${res.status})`);
  return res.json();
}

export async function inferenceHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${INFERENCE_URL}/api/health`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- "Any location" transfer: download OSM on demand + run the frozen Bengaluru model ---

export interface ExtractParams {
  lat: number;
  lon: number;
  radius_m: number;
}

export interface ExtractedLocation {
  city_id: string;
  center: [number, number]; // [lon, lat]
  meta: CityMeta;
  nodes: NodeFeatureCollection;
}

/** Download an arbitrary area's OSM, build features, run the frozen Bengaluru model. Slow (osmnx). */
export async function extractLocation(params: ExtractParams): Promise<ExtractedLocation> {
  const res = await fetch(`${INFERENCE_URL}/api/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    // OSM download + inference can take a while; allow generous time.
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `extract failed (${res.status})`);
  }
  return res.json();
}

/** Run the jobs-hub scenario on a previously extracted location (by city_id). */
export async function runScenarioAt(cityId: string, params: ScenarioParams): Promise<ScenarioResult> {
  const res = await fetch(`${INFERENCE_URL}/api/extract/scenario/${cityId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ radius_m: 2000, ...params }),
  });
  if (!res.ok) throw new Error(`scenario failed (${res.status})`);
  return res.json();
}

export { INFERENCE_URL };
