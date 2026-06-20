import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { type LabelKey } from "../data/labels";
import { labelColor } from "../data/realData";
import { EXPO_OUT, useMotionPresets } from "../lib/motion";

export const Route = createFileRoute("/")({ component: Landing });

const ROTATING = ["Tokyo", "Lagos", "São Paulo", "London", "Jakarta", "New York"];

function Landing() {
  const { reduce, fadeUp, stagger, spring } = useMotionPresets();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7.5rem)] max-w-[1400px] items-center px-6">
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl">
        <motion.p
          variants={fadeUp}
          className="smallcaps text-[11px] tracking-[0.18em] text-muted-foreground"
        >
          Urban food-environment intelligence
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="mt-4 font-serif text-[40px] font-light leading-[1.08] tracking-tight text-foreground sm:text-[56px]"
        >
          Is your city a <EnvWord k="desert" delay={0.35} reduce={reduce} />, an{" "}
          <EnvWord k="oasis" delay={0.5} reduce={reduce} />,
          <br className="hidden sm:block" /> a <EnvWord k="swamp" delay={0.65} reduce={reduce} />, or a{" "}
          <EnvWord k="mirage" delay={0.8} reduce={reduce} />?
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-xl text-base leading-relaxed text-[color:var(--color-ink-deep)]"
        >
          Every neighbourhood has a food climate. We map it at street-intersection scale — then let you
          test what a new market or hub would change.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 0 }} transition={spring}>
            <Link
              to="/cities"
              className="group inline-flex items-center gap-2 rounded-sm bg-foreground px-5 py-3 smallcaps text-[10px] text-background transition-colors hover:bg-foreground/85"
            >
              Test your city
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </motion.div>
          <RotatingHint reduce={reduce} />
        </motion.div>
      </motion.div>
    </div>
  );
}

function EnvWord({ k, delay, reduce }: { k: LabelKey; delay: number; reduce: boolean | null }) {
  return (
    <span className="relative inline-block whitespace-nowrap italic text-foreground">
      {k}
      <motion.span
        aria-hidden
        className="absolute -bottom-0.5 left-0 h-[0.16em] w-full origin-left rounded-full"
        style={{ background: labelColor(k) }}
        initial={{ scaleX: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.7, ease: EXPO_OUT, delay: reduce ? 0 : delay }}
      />
    </span>
  );
}

function RotatingHint({ reduce }: { reduce: boolean | null }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % ROTATING.length), 2200);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <span className="inline-flex items-center gap-1.5 smallcaps text-[10px] text-muted-foreground">
      <span className="size-1.5 rounded-full" style={{ background: "#7a9461" }} />
      Live in Bengaluru ·
      <span className="relative inline-grid">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={ROTATING[i]}
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -6 }}
            transition={{ duration: 0.3 }}
            className="text-foreground"
          >
            {ROTATING[i]}
          </motion.span>
        </AnimatePresence>
      </span>
      coming soon
    </span>
  );
}
