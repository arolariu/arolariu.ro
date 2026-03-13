"use client";

import {Input as BaseInput} from "@base-ui/react/input";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./input.module.css";

/**
 * Represents the configurable props for the Input component.
 *
 * @remarks
 * Extends the Base UI input primitive props and documents the styling hooks commonly
 * customized by consumers of the shared component library.
 */
export interface InputProps extends React.ComponentPropsWithoutRef<typeof BaseInput> {
  /**
   * Additional CSS classes merged with the base input control styles.
   */
  className?: string;
  /**
   * The HTML input type forwarded to the underlying Base UI input element.
   */
  type?: React.HTMLInputTypeAttribute;
}

/**
 * A single-line text input styled for forms, filters, and search fields.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI input primitive and forwards all supported native input props.
 * Styling is applied through CSS Modules so the control remains theme-aware and easy
 * to compose inside form layouts.
 *
 * @example
 * ```tsx
 * <Input type="email" placeholder="name@example.com" aria-label="Email address" />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/input Base UI Input docs}
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(({className, type, ...props}, ref) => (
  <BaseInput
    ref={ref}
    type={type}
    className={cn(styles.input, className)}
    {...props}
  />
));
Input.displayName = "Input";

export {Input};
