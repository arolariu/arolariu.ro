"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./loading-overlay.module.css";
import {Spinner} from "./spinner";

/**
 * Represents the configurable props for the {@link LoadingOverlay} component.
 *
 * @remarks
 * Extends native `<div>` attributes so overlays can be positioned inside relatively
 * positioned containers, annotated for accessibility, and visually customized.
 */
interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether the overlay should be rendered.
   *
   * @default true
   */
  visible?: boolean;
  /**
   * Whether a backdrop blur effect should be applied behind the overlay.
   *
   * @default false
   */
  blur?: boolean;
}

/**
 * Renders a centered loading overlay for pending asynchronous operations.
 *
 * @remarks
 * **Rendering Context**: Client component.
 *
 * Place this component inside a relatively positioned container to block interactions
 * while preserving the layout underneath. By default, it renders the shared spinner, but
 * custom children can replace that indicator when richer progress UI is needed.
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   <LoadingOverlay visible blur />
 *   <Content />
 * </div>
 * ```
 *
 * @see {@link LoadingOverlayProps} for available props
 */
const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({visible = true, blur = false, className, children, ...props}: Readonly<LoadingOverlayProps>, ref): React.JSX.Element | null => {
    if (!visible) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(styles.overlay, blur && styles.blur, className)}
        {...props}>
        {children ?? <Spinner className={styles.spinner} />}
      </div>
    );
  },
);

LoadingOverlay.displayName = "LoadingOverlay";

export {LoadingOverlay};
export type {LoadingOverlayProps};
