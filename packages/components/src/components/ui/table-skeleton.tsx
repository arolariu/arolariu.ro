import * as React from "react";

import {cn} from "@/lib/utilities";

import {Skeleton} from "./skeleton";
import styles from "./table-skeleton.module.css";

/**
 * Represents the configurable props for the {@link TableSkeleton} component.
 *
 * @remarks
 * Extends native `<div>` attributes so table loading placeholders can be embedded in
 * semantic sections, receive accessibility metadata, and accept layout overrides.
 */
interface TableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of body rows rendered beneath the table header placeholders.
   *
   * @default 5
   */
  rows?: number;
  /**
   * Number of columns rendered for both the header and body rows.
   *
   * @default 4
   */
  columns?: number;
}

/**
 * Renders a skeleton placeholder shaped like a data table.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Simulates a tabular layout with a muted header row and repeated body rows so pages can
 * preserve data-table rhythm while async records are loading.
 *
 * @example
 * ```tsx
 * <TableSkeleton rows={8} columns={5} aria-label="Loading invoices table" />
 * ```
 *
 * @see {@link TableSkeletonProps} for available props
 */
const TableSkeleton = React.forwardRef<HTMLDivElement, TableSkeletonProps>(
  ({rows = 5, columns = 4, className, ...props}: Readonly<TableSkeletonProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      className={cn(styles.container, className)}
      {...props}>
      <div className={styles.header}>
        {Array.from({length: columns}, (_, index) => (
          <Skeleton
            key={index}
            className={styles.headerCell}
          />
        ))}
      </div>
      {Array.from({length: rows}, (_, rowIndex) => (
        <div
          key={rowIndex}
          className={styles.row}>
          {Array.from({length: columns}, (_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={styles.cell}
            />
          ))}
        </div>
      ))}
    </div>
  ),
);

TableSkeleton.displayName = "TableSkeleton";

export {TableSkeleton};
export type {TableSkeletonProps};
