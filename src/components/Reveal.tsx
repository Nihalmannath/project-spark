import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useMotionPresets } from "../lib/motion";

/** Fade-and-rise a block into view the first time it scrolls in. Reduced-motion safe. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { fadeUp } = useMotionPresets();
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
