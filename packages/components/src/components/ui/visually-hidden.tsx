import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./visually-hidden.module.css";

/**
 * Represents the configurable props for the {@link VisuallyHidden} component.
 *
 * @remarks
 * Extends native `<span>` attributes so hidden assistive text can carry ARIA metadata,
 * testing hooks, and composed class overrides while remaining available to screen readers.
 */
interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Content that is hidden visually but remains accessible to assistive technology.
   */
  children: React.ReactNode;
}

/**
 * Hides content visually while keeping it accessible to screen readers.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a `<span>` that uses the classic clipping technique to remove content from the
 * visual flow without removing it from the accessibility tree. Use it to provide labels
 * for icon-only controls, clarify status changes, or add extra context for assistive tech.
 *
 * @example
 * ```tsx
 * <button type="button">
 *   <TrashIcon aria-hidden="true" />
 *   <VisuallyHidden>Delete item</VisuallyHidden>
 * </button>
 * ```
 *
 * @see {@link https://www.w3.org/WAI/tutorials/forms/labels/#note-on-hiding-elements | W3C hiding elements guidance}
 */
const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(({className, ...props}, ref) => (
  <span
    ref={ref}
    className={cn(styles.visuallyHidden, className)}
    {...props}
  />
));
VisuallyHidden.displayName = "VisuallyHidden";

export {VisuallyHidden};
export type {VisuallyHiddenProps};
