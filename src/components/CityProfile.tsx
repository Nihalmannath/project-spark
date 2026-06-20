import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CITIES, CHECKPOINTS_V2, evidenceTone } from "../data/platform";
import { CHECKPOINTS } from "../data/mockData";
import { CITY_INFO } from "../data/realData";
import { Reveal } from "./Reveal";
import { WardMap } from "./WardMap";
import { useMotionPresets } from "../lib/motion";

const METRICS: [string, string, string][] = [
  ["Best accuracy", "93.9%", "high-confidence adaptive target"],
  ["Macro-F1", "0.783", "operational checkpoint"],
  ["Spatial-CV macro-F1", "0.51", "leave-one-zone-out"],
  ["Road nodes", "34,200", "Bengaluru intersections"],
];

const STEPS: [string, string, string][] = [
  [
    "01 · Extract",
    "Real road graph + OSM features",
    "Build the city's road-intersection graph and compute eight transferable, OSM-only features — food counts at 800 m / 1500 m, nearest-food distance, road structure.",
  ],
  [
    "02 · Weight",
    "Within-city percentiles",
    "Rank every feature against the city's own distribution, so “well-served relative to this city” means the same thing everywhere, despite uneven coverage.",
  ],
  [
    "03 · Transfer",
    "Frozen model → new city + scenario",
    "Apply the trained model unchanged to a new city, then simulate a jobs hub and re-predict which intersections move out of food desert.",
  ],
];

export function CityProfile() {
  const { fadeUp, stagger, spring } = useMotionPresets();
  const city = CITIES.find((c) => c.id === "bengaluru")!;
  const info = CITY_INFO.bengaluru;
  const ckpt = CHECKPOINTS_V2.find((c) => c.id === "ckpt_blr_08")!;
  const safety = CHECKPOINTS.find((c) => c.id === "08_adaptive_hex")!;
  const tone = evidenceTone(city.evidence_state);

  const mysuru = CITIES.find((c) => c.id === "mysuru")!;
  const comingSoon = CITIES.filter((c) => c.evidence_state === "COMING_SOON");

  return (
    <div className="mx-auto max-w-[1100px] px-6 pt-10 pb-24">
      {/* Header */}
      <Reveal>
        <p className="smallcaps text-[10px] text-muted-foreground">Step 03 · City diagnosis</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[34px] font-light leading-none tracking-tight text-foreground">
              {info.name}
            </h1>
            <p className="mt-1.5 font-mono text-xs text-muted-foreground">{info.region}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <span className="size-1.5 rounded-full" style={{ background: tone.dot }} />
            <span className="smallcaps text-[9px] text-foreground">{tone.text}</span>
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--color-ink-deep)]">
          Across 34,200 intersections, Bengaluru reads as an oasis-leaning city pocked with food deserts
          and mirages. {info.blurb}
        </p>
      </Reveal>

      {/* Evidence map — real ward boundaries with the node "rounds" inside */}
      <Reveal>
        <div className="mt-8 h-[560px] overflow-hidden rounded-md border border-border bg-[color:var(--color-paper)]">
          <WardMap
            wardsUrl="/data/bengaluru_wards.geojson"
            nodesUrl="/data/bengaluru_nodes.geojson"
            center={[77.5875, 12.9771]}
            zoom={11}
          />
        </div>
        <p className="source-note mt-2">198 BBMP wards · 34,200 road intersections</p>
      </Reveal>

      {/* Diagnosis */}
      <section className="mt-12">
        <Reveal>
          <p className="smallcaps text-[10px] text-accent">The diagnosis</p>
          <h2 className="mt-2 font-serif text-2xl font-light text-foreground">
            What the model reads in this city
          </h2>
        </Reveal>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-6 grid gap-4 md:grid-cols-3"
        >
          <DiagnosisCard label="Cuisine entropy" fadeUp={fadeUp}>
            <p className="metric-num text-3xl text-foreground">0.72</p>
            <p className="mt-1 text-sm font-medium text-foreground">High diversity</p>
            <p className="source-note mt-2">Zomato menu entropy · 1.5 km · representative</p>
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
              Higher entropy = more varied food choice. Low entropy flags a fast-food monoculture.
            </p>
          </DiagnosisCard>

          <DiagnosisCard label="Urban cluster" fadeUp={fadeUp}>
            <div className="flex flex-wrap gap-1.5">
              {ckpt.urban_context_tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">Dense South-Asian metro</p>
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
              Mixed road hierarchy with comparable Zomato / Swiggy + Google retail coverage.
            </p>
          </DiagnosisCard>

          <DiagnosisCard label="Geography fit" fadeUp={fadeUp} emphasis tone={tone.dot}>
            <p className="font-serif text-2xl font-light text-foreground">Evidence-backed</p>
            <p className="mt-1 text-sm font-medium text-foreground">Home city — safe at every scale</p>
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
              Trained and validated here on real BBMP ward labels, down to adaptive-hex decisions.
            </p>
          </DiagnosisCard>
        </motion.div>
      </section>

      {/* Safe / unsafe geography scale */}
      <section className="mt-12">
        <Reveal>
          <p className="smallcaps text-[10px] text-accent">Geography scale</p>
          <h2 className="mt-2 font-serif text-2xl font-light text-foreground">
            Where this model is safe to use — and where it isn&apos;t
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            From the operational checkpoint ({safety.name}). The same scale that holds in Bengaluru is what
            we test before projecting anywhere else.
          </p>
        </Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ConditionList tone="safe" title="Safe to use for" items={safety.safeConditions} />
          <ConditionList tone="caution" title="Use with caution" items={safety.unsafeConditions} />
        </div>
      </section>

      {/* Nearby cities */}
      <section className="mt-12">
        <Reveal>
          <p className="smallcaps text-[10px] text-accent">Nearby cities</p>
          <h2 className="mt-2 font-serif text-2xl font-light text-foreground">
            More-suitable cities to try next
          </h2>
        </Reveal>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-6 divide-y divide-border overflow-hidden rounded-md border border-border bg-card"
        >
          <NearbyRow
            fadeUp={fadeUp}
            spring={spring}
            name={mysuru.display_name}
            region={mysuru.osm_place_name}
            dot={evidenceTone(mysuru.evidence_state).dot}
            status={evidenceTone(mysuru.evidence_state).text}
            why="Same region (Karnataka) and comparable OSM coverage — the frozen Bengaluru model is already projected here."
            action={
              <Link
                to="/scenario-lab"
                className="smallcaps shrink-0 rounded-sm border border-foreground px-3 py-2 text-[9px] text-foreground transition-colors hover:bg-muted/40"
              >
                Run the transfer →
              </Link>
            }
          />
          {comingSoon.map((c) => (
            <NearbyRow
              key={c.id}
              fadeUp={fadeUp}
              spring={spring}
              name={c.display_name}
              region={c.osm_place_name}
              dot={evidenceTone(c.evidence_state).dot}
              status="Coming soon"
              why={c.caveat}
            />
          ))}
        </motion.div>
      </section>

      {/* Evidence behind it */}
      <section className="mt-14 border-t border-border pt-10">
        <Reveal>
          <p className="smallcaps text-[10px] text-muted-foreground">The evidence behind it</p>
          <h2 className="mt-2 font-serif text-2xl font-light text-foreground">
            Why you can trust the Bengaluru build
          </h2>
        </Reveal>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-6 grid grid-cols-2 overflow-hidden rounded-md border border-border bg-[color:var(--color-paper)] md:grid-cols-4"
        >
          {METRICS.map(([label, value, sub], i) => (
            <motion.div
              key={label}
              variants={fadeUp}
              className={`p-5 ${i < METRICS.length - 1 ? "border-r border-border" : ""}`}
            >
              <p className="smallcaps text-[9px] text-muted-foreground">{label}</p>
              <p className="metric-num mt-1.5 text-2xl text-foreground">{value}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-4 grid border border-border md:grid-cols-3">
          {STEPS.map(([num, title, body], i) => (
            <div
              key={num}
              className={`p-6 ${i < 2 ? "border-b border-border md:border-b-0 md:border-r" : ""}`}
            >
              <p className="smallcaps text-[10px] text-muted-foreground">{num}</p>
              <h3 className="mt-2 font-serif text-base text-foreground">{title}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] italic leading-relaxed text-muted-foreground">{city.caveat}</p>
      </section>

      {/* CTAs */}
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/results"
          className="smallcaps rounded-sm bg-foreground px-5 py-3 text-[10px] text-background transition-colors hover:bg-foreground/85"
        >
          Open the evidence map →
        </Link>
        <Link
          to="/scenario-lab"
          className="smallcaps rounded-sm border border-foreground px-5 py-3 text-[10px] text-foreground transition-colors hover:bg-muted/40"
        >
          Run a transfer scenario →
        </Link>
      </div>
    </div>
  );
}

function DiagnosisCard({
  label,
  children,
  emphasis,
  tone,
  fadeUp,
}: {
  label: string;
  children: ReactNode;
  emphasis?: boolean;
  tone?: string;
  fadeUp: import("motion/react").Variants;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="relative overflow-hidden rounded-md border border-border bg-card p-5"
    >
      {emphasis && tone && (
        <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: tone }} />
      )}
      <p className="smallcaps text-[10px] text-muted-foreground">{label}</p>
      <div className="mt-3">{children}</div>
    </motion.div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-sm border border-border bg-[color:var(--color-paper)] px-2 py-0.5 smallcaps text-[9px] text-[color:var(--color-ink-deep)]">
      {children}
    </span>
  );
}

function ConditionList({
  tone,
  title,
  items,
}: {
  tone: "safe" | "caution";
  title: string;
  items: string[];
}) {
  const color = tone === "safe" ? "#7a9461" : "#d59e71";
  const mark = tone === "safe" ? "✓" : "!";
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: color }} />
        <p className="smallcaps text-[10px] text-foreground">{title}</p>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li key={it} className="flex gap-2.5 text-[13px] leading-snug text-foreground">
            <span
              className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
              style={{ background: color }}
            >
              {mark}
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NearbyRow({
  name,
  region,
  dot,
  status,
  why,
  action,
  fadeUp,
  spring,
}: {
  name: string;
  region: string;
  dot: string;
  status: string;
  why: string;
  action?: ReactNode;
  fadeUp: import("motion/react").Variants;
  spring: import("motion/react").Transition;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ backgroundColor: "rgba(0,0,0,0.015)" }}
      transition={spring}
      className="flex items-start justify-between gap-4 p-5"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full" style={{ background: dot }} />
          <span className="font-serif text-base text-foreground">{name}</span>
          <span className="smallcaps text-[9px] text-muted-foreground">· {status}</span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{region}</p>
        <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-muted-foreground">{why}</p>
      </div>
      {action}
    </motion.div>
  );
}
