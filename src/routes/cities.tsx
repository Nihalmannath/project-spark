import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { WorldCityMap } from "../components/WorldCityMap";
import { useMotionPresets } from "../lib/motion";

export const Route = createFileRoute("/cities")({ component: CitiesPage });

function CitiesPage() {
  const navigate = useNavigate();
  const { fadeUp, stagger } = useMotionPresets();

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-10 pb-16">
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-2xl">
        <motion.p variants={fadeUp} className="smallcaps text-[10px] text-muted-foreground">
          Step 02 · Choose a city
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="mt-2 font-serif text-[28px] font-light leading-tight tracking-tight text-foreground"
        >
          Pick a city to read its food climate
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mt-3 text-sm leading-relaxed text-[color:var(--color-ink-deep)]"
        >
          Bengaluru has local evidence and Mysuru has a calibrated transfer projection. Spin the
          globe to open either city, or inspect the wider city roadmap.
        </motion.p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15 }}
        className="relative mt-6 h-[68vh] min-h-[440px] w-full overflow-hidden rounded-md border border-border bg-[color:var(--color-paper)]"
      >
        <WorldCityMap
          onSelectLive={(c) => navigate({ to: "/city/$id", params: { id: c.liveCityId ?? c.id } })}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 z-30 flex items-center gap-4 rounded-sm border border-border bg-card/85 px-3 py-1.5 backdrop-blur">
          <LegendDot color="#ffc000" label="Live" glow />
          <LegendDot color="#d59e71" label="Scenario" />
          <LegendDot color="#8a97a6" label="Coming soon" />
        </div>
      </motion.div>
    </div>
  );
}

function LegendDot({ color, label, glow }: { color: string; label: string; glow?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 smallcaps text-[9px] text-muted-foreground">
      <span
        className="size-2 rounded-full"
        style={{ background: color, boxShadow: glow ? `0 0 8px 1px ${color}aa` : undefined }}
      />
      {label}
    </span>
  );
}
