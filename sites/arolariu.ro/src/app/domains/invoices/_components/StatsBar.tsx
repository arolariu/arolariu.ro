"use client";

/**
 * @fileoverview Unified stats bar component for displaying key metrics with optional actions.
 * @module app/domains/invoices/_components/StatsBar
 *
 * @remarks
 * Reusable component extracted from upload-scans and view-scans pages.
 * Features:
 * - Animated counters for stat values
 * - Color variants (default, green, amber, blue, red, purple)
 * - Optional action buttons on the right
 * - Entrance animation with motion
 * - Responsive layout with flexbox
 */

import {motion} from "motion/react";
import {AnimatedCounter} from "./AnimatedCounter";
import styles from "./StatsBar.module.scss";

type StatItem = {
  /** Label text for the stat */
  label: string;
  /** Numeric value to display */
  value: number;
  /** Color variant for the stat value */
  color?: "default" | "green" | "amber" | "blue" | "red" | "purple";
};

type Props = {
  /** Array of stats to display */
  stats: StatItem[];
  /** Optional action buttons rendered on the right */
  children?: React.ReactNode;
};

/**
 * Unified stats bar component for displaying key metrics.
 *
 * @remarks
 * Can be used across invoice-related pages to show statistics
 * like total invoices, scans, pending uploads, etc. with consistent styling.
 *
 * @example
 * ```tsx
 * <StatsBar
 *   stats={[
 *     { label: "Total", value: 42, color: "default" },
 *     { label: "Uploaded", value: 10, color: "green" }
 *   ]}
 * >
 *   <Button>Action</Button>
 * </StatsBar>
 * ```
 *
 * @param props - Component props
 * @returns The StatsBar component
 */
export function StatsBar({stats, children}: Readonly<Props>): React.JSX.Element {
  return (
    <motion.div
      className={styles["container"]}
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.3}}>
      <div className={styles["statsGroup"]}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={styles["statItem"]}>
            <span className={`${styles["statValue"]} ${styles[stat.color ?? "default"]}`}>
              <AnimatedCounter value={stat.value} />
            </span>
            <span className={styles["statLabel"]}>{stat.label}</span>
          </div>
        ))}
      </div>
      {children ? <div className={styles["actions"]}>{children}</div> : null}
    </motion.div>
  );
}
