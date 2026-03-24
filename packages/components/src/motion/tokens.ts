/**
 * Standard motion duration constants in seconds.
 * Aligned with `--ac-transition-*` CSS custom properties in `index.css`.
 *
 * @example
 * ```tsx
 * <motion.div animate={{opacity: 1}} transition={{duration: durations.normal}} />
 * ```
 */
export const durations = {
  fast: 0.1,
  normal: 0.15,
  slow: 0.2,
  slower: 0.3,
  slowest: 0.5,
} as const;

/**
 * Standard easing curves for consistent motion across the library.
 */
export const easings = {
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  spring: {type: "spring" as const, stiffness: 300, damping: 24},
} as const;

/**
 * Represents a named motion duration token.
 */
export type Duration = keyof typeof durations;

/**
 * Represents a named motion easing token.
 */
export type Easing = keyof typeof easings;
