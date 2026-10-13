import * as React from "react";

import {cn} from "@/lib/utilities";

import {Skeleton, type SkeletonProps} from "./skeleton";
import styles from "./table-skeleton.module.css";

/**
 * Represents the configurable props for the {@link TableSkeleton} component.
 *
 * @remarks
 * Extends native `<div>` attributes so table loading placeholders can be embedded in
 * semantic sections, receive accessibility metadata, and accept layout overrides.
 */
interface TableSkeletonProps extends Readonly<React.ComponentPropsWithoutRef<"div">> {
  /**
   * Number of body rows: a nonnegative finite integer at most 10,000.
   * Zero preserves only the optional header.
   *
   * @default 5
   */
  readonly rows?: number;
  /**
   * Number of columns: a nonnegative finite integer at most 10,000.
   * Zero preserves empty row/header shapes without placeholder cells.
   *
   * @default 4
   */
  readonly columns?: number;
  /** Whether to render the decorative header row and count its cells. @default true */
  readonly showHeader?: boolean;
  /** Enables shared Skeleton motion; reduced motion remains static. @default true */
  readonly animated?: SkeletonProps["animated"];
}

/**
 * Renders a skeleton placeholder shaped like a data table.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Simulates a tabular layout with a muted header row and repeated body rows so pages can
 * preserve data-table rhythm while async records are loading.
 * This flex layout is decorative, not an accessible table with rows and cells.
 * Set one loading role/label/busy announcement on this root or a containing region.
 * `animated={false}` and the shared reduced-motion policy keep placeholders static.
 *
 * Counts must each be nonnegative finite integers at most 10,000. Total placeholder
 * cells, `(rows + (showHeader ? 1 : 0)) * columns`, must not exceed 10,000.
 * Valid zero axes are preserved; counts are never clamped or truncated.
 *
 * @throws {RangeError} Before allocation when either axis is invalid or exceeds
 * 10,000, or when total cells including the optional header exceed 10,000.
 *
 * @example
 * ```tsx
 * <TableSkeleton rows={8} columns={5} role="status" aria-label="Loading records" aria-busy />
 * ```
 *
 * @see {@link TableSkeletonProps} for available props
 */
const TableSkeleton = React.forwardRef<HTMLDivElement, TableSkeletonProps>(
  (
    {rows = 5, columns = 4, showHeader = true, animated = true, className, ...props}: Readonly<TableSkeletonProps>,
    ref,
  ): React.JSX.Element => {
    if (!Number.isSafeInteger(rows) || rows < 0 || rows > 10_000) {
      throw new RangeError("TableSkeleton rows must be a nonnegative finite integer no greater than 10,000.");
    }
    if (!Number.isSafeInteger(columns) || columns < 0 || columns > 10_000) {
      throw new RangeError("TableSkeleton columns must be a nonnegative finite integer no greater than 10,000.");
    }
    if ((rows + (showHeader ? 1 : 0)) * columns > 10_000) {
      throw new RangeError("TableSkeleton total placeholder cells, including the optional header, must not exceed 10,000.");
    }

    return (
      <div
        ref={ref}
        className={cn(styles.container, className)}
        {...props}>
        {showHeader ? (
          <div className={styles.header}>
            {Array.from({length: columns}, (_, index) => (
              <Skeleton
                key={index}
                aria-hidden
                animated={animated}
                className={styles.headerCell}
              />
            ))}
          </div>
        ) : null}
        {Array.from({length: rows}, (_, rowIndex) => (
          <div
            key={rowIndex}
            className={styles.row}>
            {Array.from({length: columns}, (_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                aria-hidden
                animated={animated}
                className={styles.cell}
              />
            ))}
          </div>
        ))}
      </div>
    );
  },
);

TableSkeleton.displayName = "TableSkeleton";

export {TableSkeleton};
export type {TableSkeletonProps};
