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
    shortDef: "Hard to find affordable, healthy food nearby",
    longDef:
      "Areas with limited access to affordable, nutritious food. Few grocery stores or restaurants within walking distance.",
    color: "var(--color-desert)",
  },
  swamp: {
    key: "swamp",
    name: "Food Swamp",
    shortDef: "Lots of fast food, few healthy alternatives",
    longDef:
      "Saturated by fast food, junk food, and low-quality outlets that crowd out healthier options.",
    color: "var(--color-swamp)",
  },
  mirage: {
    key: "mirage",
    name: "Food Mirage",
    shortDef: "Looks well-served, but most options are too expensive or unhealthy",
    longDef:
      "Areas with high outlet density but where most options are unaffordable or skew unhealthy — access without affordability.",
    color: "var(--color-mirage)",
  },
  oasis: {
    key: "oasis",
    name: "Food Oasis",
    shortDef: "Good range of affordable, healthy food nearby",
    longDef:
      "Well-served neighbourhoods with strong access to affordable, quality, and diverse food sources.",
    color: "var(--color-oasis)",
  },
  unknown: {
    key: "unknown",
    name: "Unknown / Low confidence",
    shortDef: "Not enough data to estimate this area",
    longDef:
      "Areas withheld because evidence is incomplete, model confidence is low, predictive entropy is high, or features fall outside the training domain.",
    color: "var(--color-unknown)",
  },
};

export const LABEL_ORDER: LabelKey[] = ["desert", "swamp", "mirage", "oasis", "unknown"];
