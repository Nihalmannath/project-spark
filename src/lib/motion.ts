// Shared motion presets so entrances/hovers feel consistent across the app.
// Everything is gated on prefers-reduced-motion: when the user opts out,
// transforms collapse to opacity-only / instant.
import { useReducedMotion, type Transition, type Variants } from "motion/react";

/** Expo-out cubic — the calm, decisive curve used for reveals. */
export const EXPO_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** Restrained spring — the "settle" used for hovers and pops. */
export const spring: Transition = { type: "spring", stiffness: 240, damping: 28, mass: 0.9 };

/** Standard reveal easing. */
export const easeOut: Transition = { duration: 0.55, ease: EXPO_OUT };

export function useMotionPresets() {
  const reduce = useReducedMotion();

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 16 },
    visible: { opacity: 1, y: 0, transition: reduce ? { duration: 0 } : easeOut },
  };

  const fade: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: reduce ? { duration: 0 } : { duration: 0.4 } },
  };

  const pop: Variants = {
    hidden: { opacity: 0, scale: reduce ? 1 : 0.92 },
    visible: { opacity: 1, scale: 1, transition: reduce ? { duration: 0 } : spring },
  };

  const stagger: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: reduce ? 0 : 0.04 },
    },
  };

  return { reduce, fadeUp, fade, pop, stagger, spring, easeOut };
}
