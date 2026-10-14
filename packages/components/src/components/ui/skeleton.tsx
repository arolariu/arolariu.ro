import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./skeleton.module.css";

/**
 * Represents the configurable props for the Skeleton component.
 *
 * @remarks
 * Extends native `<div>` attributes so loading placeholders can be sized, annotated,
 * and composed freely while exposing a documented class override.
 */
export interface SkeletonProps extends Readonly<React.ComponentPropsWithRef<"div">> {
  /**
   * Additional CSS classes merged with the default skeleton shimmer styles.
   */
  readonly className?: string;
  /** Enables two decorative pulses (four seconds); reduced motion and `false` disable them. @default true */
  readonly animated?: boolean;
}

/**
 * A loading placeholder used while content is being fetched or prepared.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a styled `<div>` with the library's skeleton animation. Size it with layout
 * classes to mimic the eventual content and reduce perceived loading jank.
 * Reduced motion and `animated={false}` keep the visible loading surface static.
 * Set loading announcements on the containing region or supply a localized role/label.
 *
 * @example
 * ```tsx
 * <Skeleton className="account-name-placeholder" aria-hidden="true" />
 * ```
 *
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const Skeleton = ({ref, className, animated = true, ...props}: Readonly<SkeletonProps>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='skeleton'
    data-animated={animated}
    className={cn(styles.skeleton, className)}
    {...props}
  />
);
Skeleton.displayName = "Skeleton";

// eslint-disable-next-line no-redeclare -- public component namespace
namespace Skeleton {
  export type Props = SkeletonProps;
}

export {Skeleton};
