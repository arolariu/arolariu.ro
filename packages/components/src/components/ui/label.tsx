import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./label.module.css";

/**
 * Represents the configurable props for the Label component.
 *
 * @remarks
 * Extends native `<label>` attributes so the component can participate in accessible
 * form relationships while exposing a documented class override.
 */
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /**
   * Additional CSS classes merged with the default label typography.
   */
  className?: string;
}

/**
 * An accessible text label for form controls and field groups.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Renders a styled `<label>` element that pairs naturally with form inputs through
 * `htmlFor`. Use it to provide clear, clickable context for interactive controls.
 *
 * @example
 * ```tsx
 * <Label htmlFor="email">Email address</Label>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/label Base UI Label docs}
 */
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({children, className, htmlFor, ...props}, ref) => (
  <label
    ref={ref}
    className={cn(styles.label, className)}
    htmlFor={htmlFor}
    {...props}>
    {children}
  </label>
));
Label.displayName = "Label";

export {Label};
