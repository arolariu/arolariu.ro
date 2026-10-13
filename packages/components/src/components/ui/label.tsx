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
export type LabelProps = Readonly<React.ComponentPropsWithoutRef<"label">>;

/**
 * An accessible text label for form controls and field groups.
 *
 * @remarks
 * Pure native display module; compatible with server and client rendering.
 *
 * Renders a styled `<label>` element that pairs naturally with form inputs through
 * `htmlFor`. Use it to provide clear, clickable context for interactive controls.
 *
 * @example
 * ```tsx
 * <Label htmlFor="email">Email address</Label>
 * ```
 *
 * No generated IDs or context are introduced; callers own the `htmlFor`/`id`
 * relationship. Disabled fieldsets retain native control semantics.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label | Native label}
 */
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({children, className, htmlFor, ...props}: Readonly<LabelProps>, ref): React.JSX.Element => (
    <label
      data-slot='label'
      ref={ref}
      className={cn(styles.label, className)}
      htmlFor={htmlFor}
      {...props}>
      {children}
    </label>
  ),
);
Label.displayName = "Label";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Label {
  export type Props = Readonly<LabelProps>;
}

export {Label};
