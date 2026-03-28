"use client";

import {animate, motion, useMotionValue, useTransform} from "motion/react";
import {useEffect, useRef} from "react";
import styles from "./AnimatedCounter.module.scss";

/**
 * Props for the AnimatedCounter component.
 */
type Props = {
  /**
   * The target numeric value to animate to.
   */
  value: number;

  /**
   * Animation duration in seconds.
   * @default 1
   */
  duration?: number;

  /**
   * Number of decimal places to display.
   * @default 0
   */
  decimals?: number;

  /**
   * Optional prefix to display before the number (e.g., "$").
   * @default ""
   */
  prefix?: string;

  /**
   * Optional suffix to display after the number (e.g., "%").
   * @default ""
   */
  suffix?: string;
};

/**
 * AnimatedCounter - A component that animates number counting from 0 to target value.
 *
 * @remarks
 * This component uses Framer Motion's useMotionValue and animate functions to create
 * smooth number transitions. It re-animates when the value prop changes.
 *
 * @example
 * ```tsx
 * <AnimatedCounter value={1250} prefix="$" decimals={2} />
 * // Displays: $1,250.00 (animated)
 * ```
 *
 * @param props - Component properties
 * @returns A React element displaying the animated counter
 */
export function AnimatedCounter({value, duration = 1, decimals = 0, prefix = "", suffix = ""}: Readonly<Props>): React.JSX.Element {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => {
    return latest.toFixed(decimals);
  });

  const prevValue = useRef(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
      from: prevValue.current,
    });

    prevValue.current = value;

    return () => {
      controls.stop();
    };
  }, [value, duration, motionValue]);

  return (
    <motion.span className={styles["counter"]}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </motion.span>
  );
}
