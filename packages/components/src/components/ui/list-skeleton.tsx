import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./list-skeleton.module.css";
import {Skeleton, type SkeletonProps} from "./skeleton";

/**
 * Represents the configurable props for the {@link ListSkeleton} component.
 *
 * @remarks
 * Extends native `<div>` attributes so list-shaped placeholders can be embedded in
 * semantic containers and customized with layout or accessibility attributes.
 */
interface ListSkeletonProps extends Readonly<React.ComponentPropsWithoutRef<"div">> {
  /**
   * Number of list item placeholders: a nonnegative finite integer at most 10,000.
   * Zero renders an empty layout.
   *
   * @default 5
   */
  readonly items?: number;
  /**
   * Whether each item should render a leading circular avatar placeholder.
   *
   * @default true
   */
  readonly showAvatar?: boolean;
  /** Enables shared Skeleton motion; reduced motion remains static. @default true */
  readonly animated?: SkeletonProps["animated"];
}

/**
 * Renders a skeleton placeholder shaped like a stacked list of items.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Each item includes optional avatar media plus two text lines, making it suitable for
 * activity feeds, contact lists, or navigation menus that load incrementally.
 * Placeholders are decorative. Set one loading role/label/busy announcement on
 * this root or a containing region, not on individual items.
 * `animated={false}` and the shared reduced-motion policy keep placeholders static.
 *
 * @throws {RangeError} Before allocation when items is not a nonnegative finite
 * integer or exceeds 10,000.
 *
 * @example
 * ```tsx
 * <ListSkeleton items={8} showAvatar={false} role="status" aria-label="Loading results" aria-busy />
 * ```
 *
 * @see {@link ListSkeletonProps} for available props
 */
const ListSkeleton = React.forwardRef<HTMLDivElement, ListSkeletonProps>(
  ({items = 5, showAvatar = true, animated = true, className, ...props}: Readonly<ListSkeletonProps>, ref): React.JSX.Element => {
    if (!Number.isSafeInteger(items) || items < 0 || items > 10_000) {
      throw new RangeError("ListSkeleton items must be a nonnegative finite integer no greater than 10,000.");
    }

    return (
      <div
        ref={ref}
        className={cn(styles.list, className)}
        {...props}>
        {Array.from({length: items}, (_, index) => (
          <div
            key={index}
            className={styles.item}>
            {showAvatar ? (
              <Skeleton
                aria-hidden
                animated={animated}
                className={styles.avatar}
              />
            ) : null}
            <div className={styles.text}>
              <Skeleton
                aria-hidden
                animated={animated}
                className={styles.primary}
              />
              <Skeleton
                aria-hidden
                animated={animated}
                className={styles.secondary}
              />
            </div>
          </div>
        ))}
      </div>
    );
  },
);

ListSkeleton.displayName = "ListSkeleton";

export {ListSkeleton};
export type {ListSkeletonProps};
