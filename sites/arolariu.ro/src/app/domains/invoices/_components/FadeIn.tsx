"use client";

import {motion} from "motion/react";
import type {ReactNode} from "react";

/**
 * Props for the FadeIn component.
 */
type Props = {
  /**
   * The content to animate in.
   */
  children: ReactNode;

  /**
   * Delay before animation starts (in seconds).
   * @default 0
   */
  delay?: number;

  /**
   * Direction from which content fades in.
   * @default "up"
   */
  direction?: "up" | "down" | "left" | "right" | "none";

  /**
   * Animation duration in seconds.
   * @default 0.4
   */
  duration?: number;

  /**
   * Optional CSS class name for the wrapper div.
   */
  className?: string;
};

/**
 * FadeIn - A reusable fade-in animation wrapper for any content.
 *
 * @remarks
 * This component wraps children with a motion.div that animates opacity and position.
 * It supports multiple directions (up, down, left, right, none) and configurable timing.
 *
 * @example
 * ```tsx
 * <FadeIn direction="up" delay={0.2}>
 *   <h1>Welcome!</h1>
 * </FadeIn>
 * ```
 *
 * @param props - Component properties
 * @returns A React element with fade-in animation applied
 */
export function FadeIn({children, delay = 0, direction = "up", duration = 0.4, className}: Readonly<Props>): React.JSX.Element {
  const directionMap = {
    up: {y: 20},
    down: {y: -20},
    left: {x: 20},
    right: {x: -20},
    none: {},
  };

  return (
    <motion.div
      className={className}
      initial={{opacity: 0, ...directionMap[direction]}}
      animate={{opacity: 1, x: 0, y: 0}}
      transition={{duration, delay, ease: "easeOut"}}>
      {children}
    </motion.div>
  );
}
