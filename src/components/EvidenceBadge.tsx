import type { EvidenceState } from "../data/platform";

const MAP: Record<EvidenceState, { label: string; bg: string; fg: string; border: string }> = {
  AVAILABLE: { label: "Available", bg: "#eef2e7", fg: "#3a5224", border: "#b9ca9d" },
  SCENARIO: { label: "Scenario", bg: "#fbeede", fg: "#7a4a1f", border: "#d59e71" },
  COMING_SOON: { label: "Coming soon", bg: "#eef1f5", fg: "#475264", border: "#c9d4e0" },
};

export function EvidenceBadge({ state, size = "sm" }: { state: EvidenceState; size?: "sm" | "md" }) {
  const c = MAP[state];
  const pad = size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[9px]";
  return (
    <span
      className={`smallcaps inline-flex items-center gap-1.5 rounded-sm border ${pad}`}
      style={{ background: c.bg, color: c.fg, borderColor: c.border }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.fg }} />
      {c.label}
    </span>
  );
}
