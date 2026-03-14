import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./list-skeleton.module.css";
import {Skeleton} from "./skeleton";

/**
 * Represents the configurable props for the {@link ListSkeleton} component.
 *
 * @remarks
 * Extends native `<div>` attributes so list-shaped placeholders can be embedded in
 * semantic containers and customized with layout or accessibility attributes.
 */
interface ListSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of list item placeholders to render.
   *
   * @default 5
   */
  items?: number;
  /**
   * Whether each item should render a leading circular avatar placeholder.
   *
   * @default true
   */
  showAvatar?: boolean;
}

/**
 * Renders a skeleton placeholder shaped like a stacked list of items.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Each item includes optional avatar media plus two text lines, making it suitable for
 * activity feeds, contact lists, or navigation menus that load incrementally.
 *
 * @example
 * ```tsx
 * <ListSkeleton items={8} showAvatar={false} aria-label="Loading notifications" />
 * ```
 *
 * @see {@link ListSkeletonProps} for available props
 */
const ListSkeleton = React.forwardRef<HTMLDivElement, ListSkeletonProps>(
  ({items = 5, showAvatar = true, className, ...props}: Readonly<ListSkeletonProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      className={cn(styles.list, className)}
      {...props}>
      {Array.from({length: items}, (_, index) => (
        <div
          key={index}
          className={styles.item}>
          {showAvatar ? <Skeleton className={styles.avatar} /> : null}
          <div className={styles.text}>
            <Skeleton className={styles.primary} />
            <Skeleton className={styles.secondary} />
          </div>
        </div>
      ))}
    </div>
  ),
);

ListSkeleton.displayName = "ListSkeleton";

export {ListSkeleton};
export type {ListSkeletonProps};
