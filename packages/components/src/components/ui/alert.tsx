import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./alert.module.css";

/**
 * Defines the supported visual treatments for the Alert component.
 */
export type AlertVariant = "default" | "destructive";

const variantStyles: Record<AlertVariant, string> = {
  default: styles.default!,
  destructive: styles.destructive!,
};

/**
 * Represents the configurable props for the Alert component.
 *
 * @remarks
 * Extends native `<div>` attributes so alerts can expose ARIA relationships,
 * data attributes, and custom event handlers while selecting a visual variant.
 *
 * @default variant `"default"`
 */
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Additional CSS classes merged with the base alert surface styles.
   */
  className?: string;
  /**
   * The visual tone used to communicate neutral or destructive feedback.
   *
   * @default "default"
   */
  variant?: AlertVariant;
}

/**
 * A bordered feedback container for inline status, warning, or error messaging.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a `<div>` with `role="alert"` so assistive technologies announce urgent
 * content. Use {@link AlertTitle} and {@link AlertDescription} to build a clear,
 * accessible message structure.
 *
 * @example
 * ```tsx
 * <Alert variant="destructive">
 *   <AlertTitle>Payment failed</AlertTitle>
 *   <AlertDescription>Verify your card details and try again.</AlertDescription>
 * </Alert>
 * ```
 *
 * @see {@link AlertTitle}
 * @see {@link AlertDescription}
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({className, variant = "default", ...props}, ref) => (
  <div
    ref={ref}
    role='alert'
    className={cn(styles.alert, variantStyles[variant], className)}
    {...props}
  />
));
Alert.displayName = "Alert";

/**
 * Represents the configurable props for the AlertTitle component.
 *
 * @remarks
 * Extends native heading attributes and exposes a class override for styling.
 */
interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * Additional CSS classes merged with the alert title styles.
   */
  className?: string;
}

/**
 * The heading slot for the primary alert message.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders an `<h5>` element styled for compact but prominent messaging. Pair it with
 * {@link AlertDescription} when the alert needs supporting explanatory text.
 *
 * @example
 * ```tsx
 * <AlertTitle>Heads up</AlertTitle>
 * ```
 *
 * @see {@link AlertDescription}
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(({children, className, ...props}, ref) => (
  <h5
    ref={ref}
    className={cn(styles.title, className)}
    {...props}>
    {children}
  </h5>
));
AlertTitle.displayName = "AlertTitle";

/**
 * Represents the configurable props for the AlertDescription component.
 *
 * @remarks
 * Extends native `<div>` attributes so rich supporting content can be rendered inside
 * an alert body while preserving the component's spacing and typography.
 */
interface AlertDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Additional CSS classes merged with the alert description styles.
   */
  className?: string;
}

/**
 * A supporting content slot for additional alert details.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a styled `<div>` so the alert body can contain paragraphs, lists, links,
 * or other rich inline content beneath the title.
 *
 * @example
 * ```tsx
 * <AlertDescription>API access will be restored after the billing issue is resolved.</AlertDescription>
 * ```
 *
 * @see {@link AlertTitle}
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const AlertDescription = React.forwardRef<HTMLDivElement, AlertDescriptionProps>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.description, className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export {Alert, AlertDescription, AlertTitle};
