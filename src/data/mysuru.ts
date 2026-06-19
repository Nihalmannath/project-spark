// Synthetic Mysuru hex predictions for the SCENARIO transfer projection.
// Smaller grid, lower confidence, more "unknown" cells — reflects partial features.
import type { HexPrediction } from "./mockData";
import { LABEL_ORDER, type LabelKey } from "./labels";

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function gen(): HexPrediction[] {
  const r = rng(7);
  const out: HexPrediction[] = [];
  const cols = 10, rows = 9;
  let i = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const dx = col - cols / 2;
      const dy = row - rows / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 4.4 + r() * 0.6) continue;

      let predicted: LabelKey;
      const noise = r();
      if (dist < 1.6) predicted = noise < 0.6 ? "oasis" : "mirage";
      else if (dist < 2.8) predicted = noise < 0.5 ? "mirage" : noise < 0.85 ? "swamp" : "oasis";
      else if (dist < 3.8) predicted = noise < 0.55 ? "swamp" : "desert";
      else predicted = "desert";

      // Lower confidence overall (transfer projection)
      const confidence = 0.45 + r() * 0.45;
      if (confidence < 0.55) predicted = "unknown";

      out.push({
        id: `M${String(i).padStart(4, "0")}`,
        col, row,
        ward: "Mysuru Zone " + ((i % 9) + 1),
        predicted,
        trueLabel: undefined, // NO ground truth
        confidence,
        scores: {
          access: Math.round(r() * 100) / 100,
          affordability: Math.round(r() * 100) / 100,
          quality: Math.round(r() * 100) / 100,
        },
        context: {
          groceryCount: Math.floor(r() * 14),
          restaurantCount: Math.floor(r() * 22),
          nearestFoodKm: Math.round(r() * 1800) / 1000,
          populationDensity: Math.floor(3000 + r() * 12000),
          vulnerabilityIndex: Math.round(r() * 100) / 100,
        },
        checkpoint: "ckpt_blr_08",
        topFeatures: [
          { name: "nearest_food_km", contribution: 0.22, direction: r() > 0.5 ? "↑" : "↓" },
          { name: "grocery_count_800m", contribution: 0.18, direction: r() > 0.5 ? "↑" : "↓" },
          { name: "inter_density_1km", contribution: 0.14, direction: r() > 0.5 ? "↑" : "↓" },
        ],
      });
      // Sprinkle nearest-tech-park hub as scenario anchor: row 4 col 7
      void LABEL_ORDER;
      i++;
    }
  }
  return out;
}

export const MYSURU_HEXES: HexPrediction[] = gen();

// Hub at approximate "tech park" cell — used by scenario lab.
export const MYSURU_HUB = { col: 7, row: 4 };
