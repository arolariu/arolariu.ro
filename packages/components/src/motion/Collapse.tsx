"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./Collapse.module.css";

/**
 * Represents the configurable props for the {@link Collapse} component.
 *
 * @remarks
 * Extends native `<div>` attributes so consumers can provide ARIA metadata,
 * testing hooks, and custom classes while keeping the animated container typed.
 */
interface CollapseProps extends React.ComponentPropsWithRef<"div"> {
  /**
   * Whether the content is expanded.
   */
  open: boolean;
  /**
   * Content to show or hide with animation.
   */
  children: React.ReactNode;
}

/**
 * Animated height collapse and expand using CSS grid-template-rows.
 *
 * @remarks
 * Supports reduced motion through a CSS `prefers-reduced-motion` media query and keeps
 * content mounted for measurement while closed content is inert and hidden
 * from assistive navigation.
 *
 * @example
 * ```tsx
 * <Collapse open={isExpanded}>
 *   <p>Collapsible content</p>
 * </Collapse>
 * ```
 */
function Collapse({open, children, className, ref, ...props}: Readonly<CollapseProps>): React.JSX.Element {
  return (
    <div
      ref={ref}
      data-state={open ? "open" : "closed"}
      inert={!open || props.inert}
      aria-hidden={open ? props["aria-hidden"] : true}
      className={cn(styles.collapse, className)}
      {...props}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
Collapse.displayName = "Collapse";

export {Collapse};
export type {CollapseProps};
