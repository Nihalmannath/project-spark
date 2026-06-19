export type LabelKey = "desert" | "oasis" | "mirage" | "swamp" | "unknown";

export interface LabelDef {
  key: LabelKey;
  name: string;
  shortDef: string;
  longDef: string;
  color: string;
}

export const LABELS: Record<LabelKey, LabelDef> = {
  desert: {
    key: "desert",
    name: "Food Desert",
    shortDef: "Low access, few affordable options",
    longDef:
      "Areas with limited access to affordable, nutritious food. Few grocery stores or restaurants within walking distance.",
    color: "var(--color-desert)",
  },
  swamp: {
    key: "swamp",
    name: "Food Swamp",
    shortDef: "Overwhelmed by fast food / junk",
    longDef:
      "Saturated by fast food, junk food, and low-quality outlets that crowd out healthier options.",
    color: "var(--color-swamp)",
  },
  mirage: {
    key: "mirage",
    name: "Food Mirage",
    shortDef: "Many outlets but unaffordable or unhealthy",
    longDef:
      "Areas with high outlet density but where most options are unaffordable or skew unhealthy — access without affordability.",
    color: "var(--color-mirage)",
  },
  oasis: {
    key: "oasis",
    name: "Food Oasis",
    shortDef: "Good access to affordable, quality food",
    longDef:
      "Well-served neighbourhoods with strong access to affordable, quality, and diverse food sources.",
    color: "var(--color-oasis)",
  },
  unknown: {
    key: "unknown",
    name: "Unknown / Low confidence",
    shortDef: "Insufficient data or model confidence",
    longDef:
      "Areas where the model's prediction confidence falls below the operational threshold. Treat as needing further validation.",
    color: "var(--color-unknown)",
  },
};

export const LABEL_ORDER: LabelKey[] = ["desert", "swamp", "mirage", "oasis", "unknown"];
