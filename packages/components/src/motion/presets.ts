import {durations, easings} from "./tokens";

/**
 * Reusable animation variant presets for common transitions.
 * Each preset includes `initial`, `animate`, and `exit` states.
 * All presets respect reduced-motion preferences when used with `useReducedMotion`.
 */

/**
 * Fades content in and out without positional movement.
 */
export const fadeIn = {
  initial: {opacity: 0},
  animate: {opacity: 1},
  exit: {opacity: 0},
  transition: {duration: durations.normal, ease: easings.ease},
} as const;

/**
 * Fades content upward into view.
 */
export const fadeInUp = {
  initial: {opacity: 0, y: 8},
  animate: {opacity: 1, y: 0},
  exit: {opacity: 0, y: 8},
  transition: {duration: durations.normal, ease: easings.easeOut},
} as const;

/**
 * Fades content downward into view.
 */
export const fadeInDown = {
  initial: {opacity: 0, y: -8},
  animate: {opacity: 1, y: 0},
  exit: {opacity: 0, y: -8},
  transition: {duration: durations.normal, ease: easings.easeOut},
} as const;

/**
 * Fades and scales content into view.
 */
export const scaleIn = {
  initial: {opacity: 0, scale: 0.95},
  animate: {opacity: 1, scale: 1},
  exit: {opacity: 0, scale: 0.95},
  transition: {duration: durations.fast, ease: easings.easeOut},
} as const;

/**
 * Slides content in from the left.
 */
export const slideInFromLeft = {
  initial: {opacity: 0, x: -16},
  animate: {opacity: 1, x: 0},
  exit: {opacity: 0, x: -16},
  transition: {duration: durations.slow, ease: easings.easeOut},
} as const;

/**
 * Slides content in from the right.
 */
export const slideInFromRight = {
  initial: {opacity: 0, x: 16},
  animate: {opacity: 1, x: 0},
  exit: {opacity: 0, x: 16},
  transition: {duration: durations.slow, ease: easings.easeOut},
} as const;

/**
 * No-op preset for reduced motion — instant state change, no animation.
 */
export const reducedMotion = {
  initial: {},
  animate: {},
  exit: {},
  transition: {duration: 0},
} as const;
