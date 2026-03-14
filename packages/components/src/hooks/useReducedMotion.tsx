"use client";

/**
 * Returns whether the user prefers reduced motion.
 *
 * @remarks
 * This hook is re-exported from `motion/react` so consumers can depend on the component
 * library for motion-aware behavior without importing Motion directly.
 *
 * @returns `true` when `prefers-reduced-motion: reduce` is active, or `null` until the first client measurement when Motion has not resolved the preference yet.
 *
 * @example
 * ```tsx
 * const prefersReduced = useReducedMotion();
 * ```
 *
 * @see {@link https://motion.dev/docs/react-use-reduced-motion | Motion useReducedMotion}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion | MDN prefers-reduced-motion}
 */
export {useReducedMotion} from "motion/react";
