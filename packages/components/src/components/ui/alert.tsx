import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./alert.module.css";

/**
 * Defines the supported visual treatments for the Alert component.
 */
export type AlertVariant = "default" | "destructive";

const variantStyles: Record<AlertVariant, string> = {
  default: styles.default,
  destructive: styles.destructive,
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
export interface AlertProps extends Readonly<React.HTMLAttributes<HTMLDivElement>> {
  /**
   * Additional CSS classes merged with the base alert surface styles.
   */
  readonly className?: string;
  /**
   * The visual tone used to communicate neutral or destructive feedback.
   *
   * @default "default"
   */
  readonly variant?: AlertVariant;
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
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({className, variant = "default", ...props}: Readonly<AlertProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      role='alert'
      data-slot='alert'
      data-variant={variant}
      className={cn(styles.alert, variantStyles[variant], className)}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

/**
 * Represents the configurable props for the AlertTitle component.
 *
 * @remarks
 * Extends native heading attributes and exposes a class override for styling.
 */
export interface AlertTitleProps extends Readonly<React.HTMLAttributes<HTMLHeadingElement>> {
  /**
   * Additional CSS classes merged with the alert title styles.
   */
  readonly className?: string;
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
const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({children, className, ...props}: Readonly<AlertTitleProps>, ref): React.JSX.Element => (
    <h5
      ref={ref}
      data-slot='alert-title'
      className={cn(styles.title, className)}
      {...props}>
      {children}
    </h5>
  ),
);
AlertTitle.displayName = "AlertTitle";

/**
 * Represents the configurable props for the AlertDescription component.
 *
 * @remarks
 * Extends native `<div>` attributes so rich supporting content can be rendered inside
 * an alert body while preserving the component's spacing and typography.
 */
export interface AlertDescriptionProps extends Readonly<React.HTMLAttributes<HTMLDivElement>> {
  /**
   * Additional CSS classes merged with the alert description styles.
   */
  readonly className?: string;
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
const AlertDescription = React.forwardRef<HTMLDivElement, AlertDescriptionProps>(
  ({className, ...props}: Readonly<AlertDescriptionProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='alert-description'
      className={cn(styles.description, className)}
      {...props}
    />
  ),
);
AlertDescription.displayName = "AlertDescription";

/** Native attributes for the alert's trailing action region. */
export type AlertActionProps = Readonly<React.ComponentPropsWithoutRef<"div">>;

/** Groups controls beside an alert's message without intercepting their native behavior. */
const AlertAction = React.forwardRef<HTMLDivElement, AlertActionProps>(
  ({className, ...props}: Readonly<AlertActionProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='alert-action'
      className={cn(styles.action, className)}
      {...props}
    />
  ),
);
AlertAction.displayName = "AlertAction";

// eslint-disable-next-line no-redeclare -- public component namespace
namespace Alert {
  export type Props = AlertProps;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace AlertTitle {
  export type Props = AlertTitleProps;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace AlertDescription {
  export type Props = AlertDescriptionProps;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace AlertAction {
  export type Props = Readonly<AlertActionProps>;
}

export {Alert, AlertAction, AlertDescription, AlertTitle};
