import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./alert.module.css";

export type AlertVariant = "default" | "destructive";

const variantStyles: Record<AlertVariant, string> = {
  default: styles.default!,
  destructive: styles.destructive!,
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({className, variant = "default", ...props}, ref) => (
  <div
    ref={ref}
    role='alert'
    className={cn(styles.alert, variantStyles[variant], className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({className, ...props}, ref) => (
  <h5
    ref={ref}
    className={cn(styles.title, className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({className, ...props}, ref) => (
    <div
      ref={ref}
      className={cn(styles.description, className)}
      {...props}
    />
  ),
);
AlertDescription.displayName = "AlertDescription";

export {Alert, AlertDescription, AlertTitle};
