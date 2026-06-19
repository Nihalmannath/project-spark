import { LABELS } from "../data/labels";

/**
 * QuadrantDiagram — the iconic Access × Affordability map of the four
 * food environments. Used on overview and methodology pages to give the
 * deck a strong visual anchor before any numbers are introduced.
 */
export function QuadrantDiagram({ size = 360 }: { size?: number }) {
  const pad = 48;
  const inner = size - pad * 2;
  const mid = pad + inner / 2;

  const cells = [
    { x: pad, y: pad, w: inner / 2, h: inner / 2, label: "swamp",
      title: "Food Swamp", note: "high access · low quality" },
    { x: mid, y: pad, w: inner / 2, h: inner / 2, label: "oasis",
      title: "Food Oasis", note: "high access · high quality" },
    { x: pad, y: mid, w: inner / 2, h: inner / 2, label: "desert",
      title: "Food Desert", note: "low access · low quality" },
    { x: mid, y: mid, w: inner / 2, h: inner / 2, label: "mirage",
      title: "Food Mirage", note: "low access · unaffordable" },
  ] as const;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
      {cells.map((c) => {
        const fill = LABELS[c.label as keyof typeof LABELS].color;
        const isDark = c.label === "swamp";
        return (
          <g key={c.label}>
            <rect x={c.x} y={c.y} width={c.w} height={c.h} fill={fill} />
            <text
              x={c.x + 14} y={c.y + 26}
              fill={isDark ? "#ffffff" : "#1a1a1a"}
              fontFamily="Montserrat" fontSize="13" fontWeight="500"
              fontStyle="italic"
            >
              {c.title}
            </text>
            <text
              x={c.x + 14} y={c.y + 44}
              fill={isDark ? "#ffffff" : "#465468"}
              fontFamily="Roboto Mono" fontSize="9" letterSpacing="0.5"
              opacity={0.85}
            >
              {c.note}
            </text>
          </g>
        );
      })}

      {/* Axes labels */}
      <line x1={pad} y1={size - pad + 10} x2={size - pad} y2={size - pad + 10}
        stroke="#ffc000" strokeWidth="1.5" markerEnd="url(#arr)" />
      <line x1={pad - 10} y1={size - pad} x2={pad - 10} y2={pad}
        stroke="#ffc000" strokeWidth="1.5" markerEnd="url(#arr)" />
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffc000" />
        </marker>
      </defs>
      <text x={size / 2} y={size - pad + 28} textAnchor="middle"
        fontFamily="Roboto Mono" fontSize="10" fill="#465468"
        letterSpacing="1.5">
        ACCESS →
      </text>
      <text
        x={pad - 22} y={size / 2}
        textAnchor="middle"
        fontFamily="Roboto Mono" fontSize="10" fill="#465468"
        letterSpacing="1.5"
        transform={`rotate(-90, ${pad - 22}, ${size / 2})`}
      >
        QUALITY · AFFORDABILITY →
      </text>
    </svg>
  );
}
