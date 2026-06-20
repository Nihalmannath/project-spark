// Curated tier-1 world cities, used ONLY by the landing picker (/cities).
// Deliberately separate from the platform CITIES registry (platform.ts) so the
// audit / target / comparison pages stay unaffected. Only Bengaluru is live;
// every other city resolves to "coming soon".

export interface WorldCity {
  id: string;
  name: string;
  country: string;
  coords: [number, number]; // [lon, lat]
  status: "live" | "coming-soon";
  /** When live, the id used by the platform CITIES registry + the profile route. */
  liveCityId?: string;
}

export const WORLD_CITIES: WorldCity[] = [
  { id: "bengaluru", name: "Bengaluru", country: "India", coords: [77.5946, 12.9716], status: "live", liveCityId: "bengaluru" },
  { id: "mumbai", name: "Mumbai", country: "India", coords: [72.8777, 19.076], status: "coming-soon" },
  { id: "london", name: "London", country: "United Kingdom", coords: [-0.1276, 51.5074], status: "coming-soon" },
  { id: "new-york", name: "New York", country: "United States", coords: [-74.006, 40.7128], status: "coming-soon" },
  { id: "tokyo", name: "Tokyo", country: "Japan", coords: [139.6917, 35.6895], status: "coming-soon" },
  { id: "singapore", name: "Singapore", country: "Singapore", coords: [103.8198, 1.3521], status: "coming-soon" },
  { id: "paris", name: "Paris", country: "France", coords: [2.3522, 48.8566], status: "coming-soon" },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", coords: [-46.6333, -23.5505], status: "coming-soon" },
  { id: "lagos", name: "Lagos", country: "Nigeria", coords: [3.3792, 6.5244], status: "coming-soon" },
  { id: "jakarta", name: "Jakarta", country: "Indonesia", coords: [106.8456, -6.2088], status: "coming-soon" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", coords: [-99.1332, 19.4326], status: "coming-soon" },
  { id: "cairo", name: "Cairo", country: "Egypt", coords: [31.2357, 30.0444], status: "coming-soon" },
  { id: "shanghai", name: "Shanghai", country: "China", coords: [121.4737, 31.2304], status: "coming-soon" },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", coords: [55.2708, 25.2048], status: "coming-soon" },
  { id: "sydney", name: "Sydney", country: "Australia", coords: [151.2093, -33.8688], status: "coming-soon" },
];

export const LIVE_WORLD_CITY = WORLD_CITIES.find((c) => c.status === "live")!;

export function findWorldCity(id: string): WorldCity | undefined {
  return WORLD_CITIES.find((c) => c.id === id || c.liveCityId === id);
}
