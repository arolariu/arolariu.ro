import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./card-skeleton.module.css";
import {Skeleton, type SkeletonProps} from "./skeleton";

/**
 * Represents the configurable props for the {@link CardSkeleton} component.
 *
 * @remarks
 * Extends native `<div>` attributes so card-shaped loading placeholders can be composed
 * in semantic regions, annotated for accessibility, and sized with custom class names.
 */
interface CardSkeletonProps extends Readonly<React.ComponentPropsWithRef<"div">> {
  /**
   * Number of body placeholder lines: a nonnegative finite integer at most 10,000.
   * Zero preserves the header and footer without body lines.
   *
   * @default 3
   */
  readonly lines?: number;
  /** Enables shared Skeleton motion; reduced motion remains static. @default true */
  readonly animated?: SkeletonProps["animated"];
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
 * Placeholders are decorative and the skeleton announces nothing; do not give individual
 * placeholders a role or label. Announce loading through a status region that is mounted
 * before loading starts and receives its text when loading begins, such as a persistent
 * `VisuallyHidden` status or `useAnnounce`: a status element inserted already populated is
 * not reliably announced, and `aria-busy` on a live region defers its announcements.
 * `animated={false}` and the shared reduced-motion policy keep placeholders static.
 *
 * @throws {RangeError} Before allocation when lines is not a nonnegative finite
 * integer or exceeds 10,000.
 *
 * @example
 * ```tsx
 * <VisuallyHidden role="status">{loading ? "Loading summary" : null}</VisuallyHidden>
 * {loading ? <CardSkeleton lines={4} /> : <SummaryCard />}
 * ```
 *
 * @see {@link CardSkeletonProps} for available props
 */
const CardSkeleton = ({ref, lines = 3, animated = true, className, ...props}: Readonly<CardSkeletonProps>): React.JSX.Element => {
  if (!Number.isSafeInteger(lines) || lines < 0 || lines > 10_000) {
    throw new RangeError("CardSkeleton lines must be a nonnegative finite integer no greater than 10,000.");
  }

  return (
    <div
      ref={ref}
      className={cn(styles.card, className)}
      {...props}>
      <div className={styles.header}>
        <Skeleton
          aria-hidden
          animated={animated}
          className={styles.title}
        />
        <Skeleton
          aria-hidden
          animated={animated}
          className={styles.subtitle}
        />
      </div>
      <div className={styles.content}>
        {Array.from({length: lines}, (_, index) => (
          <Skeleton
            key={index}
            aria-hidden
            animated={animated}
            className={cn(styles.line, index === lines - 1 && styles.lineShort)}
          />
        ))}
      </div>
      <div className={styles.footer}>
        <Skeleton
          aria-hidden
          animated={animated}
          className={styles.button}
        />
      </div>
    </div>
  );
};

CardSkeleton.displayName = "CardSkeleton";

export {CardSkeleton};
export type {CardSkeletonProps};
