import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./card-skeleton.module.css";
import {Skeleton} from "./skeleton";

/**
 * Represents the configurable props for the {@link CardSkeleton} component.
 *
 * @remarks
 * Extends native `<div>` attributes so card-shaped loading placeholders can be composed
 * in semantic regions, annotated for accessibility, and sized with custom class names.
 */
interface CardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of body placeholder lines rendered in the card content area.
   *
   * @default 3
   */
  lines?: number;
}

/**
 * Renders a skeleton placeholder shaped like a card surface.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Mimics the visual structure of the library's card primitive with a header, stacked
 * content lines, and a trailing footer action placeholder to reduce layout shift while
 * data-backed card content is loading.
 *
 * @example
 * ```tsx
 * <CardSkeleton lines={4} aria-label="Loading billing summary" />
 * ```
 *
 * @see {@link CardSkeletonProps} for available props
 */
const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(
  ({lines = 3, className, ...props}: Readonly<CardSkeletonProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      className={cn(styles.card, className)}
      {...props}>
      <div className={styles.header}>
        <Skeleton className={styles.title} />
        <Skeleton className={styles.subtitle} />
      </div>
      <div className={styles.content}>
        {Array.from({length: lines}, (_, index) => (
          <Skeleton
            key={index}
            className={cn(styles.line, index === lines - 1 && styles.lineShort)}
          />
        ))}
      </div>
      <div className={styles.footer}>
        <Skeleton className={styles.button} />
      </div>
    </div>
  ),
);

CardSkeleton.displayName = "CardSkeleton";

export {CardSkeleton};
export type {CardSkeletonProps};
