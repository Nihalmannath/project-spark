// =====================================================================
// Mock data for the Food Spatial Intelligence Platform prototype.
//
// Replace these structures with real GeoJSON / CSV outputs from the
// model pipeline when integrating with the backend. The shapes here
// are deliberately close to what an `adaptive_hex_predictions.geojson`
// + `node_features.csv` export would produce.
// =====================================================================

import type { LabelKey } from "./labels";
import { LABEL_ORDER } from "./labels";

export interface HexPrediction {
  id: string;
  // Axial hex coords (col, row) used by the SVG mock map.
  // Replace with `geometry.coordinates` from a real GeoJSON polygon
  // when wiring the backend.
  col: number;
  row: number;
  ward: string;
  predicted: LabelKey;
  trueLabel?: LabelKey;
  confidence: number; // 0..1
  scores: {
    access: number;
    affordability: number;
    quality: number;
  };
  context: {
    groceryCount: number;
    restaurantCount: number;
    nearestFoodKm: number;
    populationDensity: number; // per km²
    vulnerabilityIndex: number; // 0..1
  };
  checkpoint: string;
  topFeatures: { name: string; contribution: number; direction: "↑" | "↓" }[];
}

const WARDS = [
  "Koramangala", "Indiranagar", "Whitefield", "Jayanagar", "Malleshwaram",
  "HSR Layout", "BTM Layout", "Bellandur", "Hebbal", "Yelahanka",
  "Rajajinagar", "Banashankari", "JP Nagar", "Marathahalli", "Frazer Town",
];

const FEATURES = [
  "restaurant_count_800m", "grocery_basket_median_800m", "menu_entropy_mean_1500m",
  "healthy_cuisine_share_800m", "instamart_ok_share_1500m", "boundary_conflict_rate",
  "nearest_food_km", "inter_density_1km", "road_rank_mean",
];

// Deterministic pseudo-random so the map is stable between renders.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateHexes(): HexPrediction[] {
  const r = rng(42);
  const hexes: HexPrediction[] = [];
  const cols = 14;
  const rows = 12;
  let i = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // carve a roughly city-shaped boundary
      const dx = col - cols / 2;
      const dy = row - rows / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 6.4 + r() * 0.8) continue;

      // Bias label by distance from centre — centre = oasis/mirage,
      // mid ring = swamp, outskirts = desert. Sprinkle unknown.
      let predicted: LabelKey;
      const noise = r();
      if (dist < 2) predicted = noise < 0.7 ? "oasis" : "mirage";
      else if (dist < 3.8) predicted = noise < 0.45 ? "mirage" : noise < 0.8 ? "swamp" : "oasis";
      else if (dist < 5.2) predicted = noise < 0.5 ? "swamp" : noise < 0.8 ? "desert" : "mirage";
      else predicted = noise < 0.7 ? "desert" : "swamp";
      const confidence = 0.55 + r() * 0.43;
      if (confidence < 0.6) predicted = "unknown";

      hexes.push({
        id: `H${String(i).padStart(4, "0")}`,
        col,
        row,
        ward: WARDS[Math.floor(r() * WARDS.length)],
        predicted,
        trueLabel: r() > 0.25 ? predicted : LABEL_ORDER[Math.floor(r() * 4)],
        confidence,
        scores: {
          access: Math.round(r() * 100) / 100,
          affordability: Math.round(r() * 100) / 100,
          quality: Math.round(r() * 100) / 100,
        },
        context: {
          groceryCount: Math.floor(r() * 28),
          restaurantCount: Math.floor(r() * 60),
          nearestFoodKm: Math.round(r() * 1500) / 1000,
          populationDensity: Math.floor(8000 + r() * 22000),
          vulnerabilityIndex: Math.round(r() * 100) / 100,
        },
        checkpoint: r() > 0.5 ? "03c_weighted_edges" : "08_adaptive_hex",
        topFeatures: Array.from({ length: 4 }).map(() => ({
          name: FEATURES[Math.floor(r() * FEATURES.length)],
          contribution: Math.round(r() * 100) / 100,
          direction: r() > 0.5 ? "↑" : "↓",
        })),
      });
      i++;
    }
  }
  return hexes;
}

export const HEXES: HexPrediction[] = generateHexes();

// ---------------------------------------------------------------------
// Feature inspector groups
// ---------------------------------------------------------------------
export interface FeatureDef {
  key: string;
  name: string;
  explanation: string;
  whyItMatters: string;
  interpretation: string;
  direction: "higher-is-better" | "lower-is-better" | "context-dependent";
}
export interface FeatureGroup {
  key: string;
  name: string;
  features: FeatureDef[];
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    key: "road", name: "Road structure",
    features: [
      { key: "inter_density_1km", name: "Intersection density (1 km)",
        explanation: "Number of road intersections within a 1 km radius of the node.",
        whyItMatters: "High intersection density signals a walkable street grid that supports walk-in retail.",
        interpretation: "20+ is dense urban core; under 5 is car-oriented periphery.",
        direction: "context-dependent" },
      { key: "road_rank_mean", name: "Mean road rank",
        explanation: "Average functional class of incident road segments.",
        whyItMatters: "Arterials carry through-traffic but discourage walk-in food access.",
        interpretation: "Lower values indicate local streets — generally better for food access.",
        direction: "lower-is-better" },
    ],
  },
  {
    key: "access", name: "Food access",
    features: [
      { key: "nearest_food_km", name: "Distance to nearest food outlet",
        explanation: "Network distance to the nearest grocery or restaurant.",
        whyItMatters: "Distance is the single strongest predictor of food desert classification.",
        interpretation: "Above 0.8 km flags a probable desert candidate.",
        direction: "lower-is-better" },
      { key: "food_800m", name: "Food outlet count (800 m)",
        explanation: "Total food retail outlets within a 10-minute walk.",
        whyItMatters: "Measures realistic walk-in choice.",
        interpretation: "Under 5 outlets is sparse; over 25 indicates concentration.",
        direction: "context-dependent" },
    ],
  },
  {
    key: "afford", name: "Grocery affordability",
    features: [
      { key: "grocery_basket_median_800m", name: "Median grocery basket cost (800 m)",
        explanation: "Median cost of a standardised grocery basket across nearby stores.",
        whyItMatters: "High basket cost combined with high outlet density signals a Mirage.",
        interpretation: "Above the city median by 25%+ flags affordability stress.",
        direction: "lower-is-better" },
      { key: "instamart_ok_share_1500m", name: "Instamart-eligible share (1.5 km)",
        explanation: "Share of nearby groceries with reliable quick-commerce coverage.",
        whyItMatters: "Quick-commerce supplements physical access in dense areas.",
        interpretation: "Above 0.7 indicates strong digital access.",
        direction: "higher-is-better" },
    ],
  },
  {
    key: "quality", name: "Restaurant quality",
    features: [
      { key: "restaurant_rating_mean", name: "Mean restaurant rating",
        explanation: "Average user rating across nearby restaurants.",
        whyItMatters: "Quality skew separates Mirage (high density, low quality) from Oasis.",
        interpretation: "Above 4.0 is generally a quality signal; combine with cost.",
        direction: "higher-is-better" },
      { key: "healthy_cuisine_share_800m", name: "Healthy cuisine share (800 m)",
        explanation: "Share of restaurants tagged as healthier cuisines.",
        whyItMatters: "Low healthy-share with high density is the Swamp signal.",
        interpretation: "Under 0.2 strongly suggests Swamp characteristics.",
        direction: "higher-is-better" },
    ],
  },
  {
    key: "menu", name: "Menu / nutrition",
    features: [
      { key: "menu_entropy_mean_1500m", name: "Mean menu entropy (1.5 km)",
        explanation: "Diversity of menu items across nearby restaurants.",
        whyItMatters: "Low entropy indicates a monoculture of cuisine, often fast food.",
        interpretation: "Higher entropy = more diverse food choice.",
        direction: "higher-is-better" },
    ],
  },
  {
    key: "vuln", name: "Vulnerability context",
    features: [
      { key: "population_density", name: "Population density",
        explanation: "People per km² in the surrounding catchment.",
        whyItMatters: "Risk compounds where vulnerable populations also face poor access.",
        interpretation: "Used as a context layer, not a direct predictor.",
        direction: "context-dependent" },
    ],
  },
  {
    key: "boundary", name: "Boundary uncertainty",
    features: [
      { key: "boundary_conflict_rate", name: "Boundary conflict rate",
        explanation: "Share of neighbours within the 1 km buffer that carry a different ward label.",
        whyItMatters: "High conflict signals the ward boundary, not real environment, is doing the work.",
        interpretation: "Above 0.3 means the node's label is geographically ambiguous.",
        direction: "lower-is-better" },
    ],
  },
  {
    key: "moran", name: "Spatial autocorrelation (Moran audit)",
    features: [
      { key: "moran_i_local", name: "Local Moran's I",
        explanation: "Local statistic of how similar a node's value is to its neighbours.",
        whyItMatters: "Audits whether features carry genuine spatial signal rather than noise.",
        interpretation: "Significant positive I indicates real spatial clustering.",
        direction: "context-dependent" },
    ],
  },
];

// ---------------------------------------------------------------------
// Checkpoints
// ---------------------------------------------------------------------
export interface Checkpoint {
  id: string;
  name: string;
  trainedCity: string;
  featureSet: string;
  targetType: "ward-broadcast" | "adaptive-local";
  safeConditions: string[];
  unsafeConditions: string[];
  dataRequirements: string[];
  notebook: string;
}

export const CHECKPOINTS: Checkpoint[] = [
  {
    id: "03c_weighted_edges",
    name: "03c — Weighted-edge GraphSAGE",
    trainedCity: "Bengaluru (BBMP)",
    featureSet: "36 rich features · 1.5 km context · inverse-distance road weighting",
    targetType: "ward-broadcast",
    notebook: "03c",
    safeConditions: [
      "Dense Indian metro with comparable retail data (Zomato/Swiggy + Google).",
      "Ward-level food-environment policy planning.",
      "Cities with reliable OSM road geometry.",
    ],
    unsafeConditions: [
      "Sparse-data cities (no menu or cost coverage).",
      "Block-level / sub-ward inference — use 08 instead.",
      "Cities with very different street typology (US grid, low-density suburbs).",
    ],
    dataRequirements: [
      "OSM road network",
      "Restaurant catalogue with rating + cost",
      "Grocery catalogue with basket price",
      "Ward boundary GeoJSON",
    ],
  },
  {
    id: "08_adaptive_hex",
    name: "08 — Adaptive hex target",
    trainedCity: "Bengaluru (BBMP)",
    featureSet: "48 non-leakage predictors · adaptive catchment target · GBM + GraphSAGE ensemble",
    targetType: "adaptive-local",
    notebook: "08",
    safeConditions: [
      "Hex-level operational decisions (intervention siting).",
      "Areas with at least 1.5 km neighbourhood data coverage.",
      "Where local catchment labels are available or derivable.",
    ],
    unsafeConditions: [
      "Direct comparison with ward-broadcast labels — different target.",
      "Cities without a per-hex 2SFCA pipeline.",
    ],
    dataRequirements: [
      "Food-access hex grid",
      "2SFCA-derived access scores",
      "Same retail catalogues as 03c",
    ],
  },
];

// ---------------------------------------------------------------------
// Confusion matrices (placeholder — replace with real artifacts)
// ---------------------------------------------------------------------
// Rows = true labels (desert, swamp, mirage, oasis); columns = predicted.
export const CONFUSION_MATRICES: Record<string, number[][]> = {
  "03c_weighted_edges": [
    [412, 88, 41, 26],
    [73, 521, 58, 22],
    [49, 67, 318, 81],
    [22, 18, 74, 489],
  ],
  "08_adaptive_hex": [
    [188, 17, 9, 4],
    [12, 296, 14, 3],
    [8, 19, 174, 22],
    [3, 4, 11, 421],
  ],
  "03b_rich_features": [
    [381, 109, 52, 25],
    [98, 472, 79, 25],
    [61, 88, 281, 85],
    [33, 27, 91, 452],
  ],
};

export const CHECKPOINT_METRICS: Record<string, { accuracy: number; macroF1: number; precision: number; recall: number }> = {
  "03c_weighted_edges": { accuracy: 0.556, macroF1: 0.506, precision: 0.512, recall: 0.504 },
  "08_adaptive_hex":    { accuracy: 0.939, macroF1: 0.783, precision: 0.789, recall: 0.778 },
  "03b_rich_features":  { accuracy: 0.535, macroF1: 0.458, precision: 0.464, recall: 0.455 },
};
