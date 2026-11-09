"use client";

/**
 * @fileoverview Reusable empty state component with animations for invoice management pages.
 * @module app/domains/invoices/_components/EmptyState
 */

import {buttonVariants} from "@arolariu/components";
import {motion} from "motion/react";
import Link from "next/link";
import styles from "./EmptyState.module.scss";

type Props = {
  /** Icon element to display in the gradient circle */
  icon: React.ReactNode;
  /** Main title text for the empty state */
  title: string;
  /** Description text explaining the empty state */
  description: string;
  /** Optional primary action button configuration */
  primaryAction?: {
    label: string;
    href: string;
  };
  /** Optional secondary action button configuration */
  secondaryAction?: {
    label: string;
    href: string;
  };
};

/**
 * Reusable empty state component with animations and optional actions.
 *
 * @remarks
 * Features:
 * - Large icon with animated gradient background circle
 * - Title and description text
 * - Optional primary CTA (Button with Link)
 * - Optional secondary CTA (outline Button)
 * - Motion entrance animation (fade up + scale)
 * - Responsive padding
 *
 * @param props - Component props
 * @returns The EmptyState component
 */
export default function EmptyState({icon, title, description, primaryAction, secondaryAction}: Readonly<Props>): React.JSX.Element {
  return (
    <motion.div
      initial={{opacity: 0, y: 20, scale: 0.95}}
      animate={{opacity: 1, y: 0, scale: 1}}
      transition={{duration: 0.3, ease: "easeOut"}}
      className={styles["container"]}>
      <motion.div
        className={styles["iconWrapper"]}
        animate={{y: [0, -8, 0]}}
        transition={{duration: 3, repeat: Infinity, ease: "easeInOut"}}>
        {icon}
      </motion.div>

      <h3 className={styles["title"]}>{title}</h3>
      <p className={styles["description"]}>{description}</p>

      {primaryAction || secondaryAction ? (
        <div className={styles["actions"]}>
          {primaryAction ? (
            <Link
              className={buttonVariants({size: "lg"})}
              href={primaryAction.href}>
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link
              className={buttonVariants({variant: "outline", size: "lg"})}
              href={secondaryAction.href}>
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}
