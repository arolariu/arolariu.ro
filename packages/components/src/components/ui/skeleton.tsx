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
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Additional CSS classes merged with the default skeleton shimmer styles.
   */
  className?: string;
}

/**
 * A loading placeholder used while content is being fetched or prepared.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a styled `<div>` with the library's skeleton animation. Size it with layout
 * classes to mimic the eventual content and reduce perceived loading jank.
 *
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-32" aria-label="Loading account name" />
 * ```
 *
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
function Skeleton({className, ...props}: Readonly<SkeletonProps>): React.JSX.Element {
  return (
    <div
      className={cn(styles.skeleton, className)}
      {...props}
    />
  );
}

export {Skeleton};
