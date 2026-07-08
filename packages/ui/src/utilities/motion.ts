import type { Transition, Variants } from "framer-motion";

export const durations = {
  fast: 0.12,
  normal: 0.18,
  slow: 0.24,
} as const;

export const transitions = {
  fast: { duration: durations.fast, ease: [0.2, 0, 0, 1] } satisfies Transition,
  normal: { duration: durations.normal, ease: [0.2, 0, 0, 1] } satisfies Transition,
  slow: { duration: durations.slow, ease: [0.2, 0, 0, 1] } satisfies Transition,
} as const;

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
};

export function reducedMotionVariants(variants: Variants, prefersReducedMotion: boolean): Variants {
  if (!prefersReducedMotion) return variants;
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };
}

export function reducedMotionTransition(
  transition: Transition,
  prefersReducedMotion: boolean,
): Transition {
  if (!prefersReducedMotion) return transition;
  return { duration: 0 };
}
