import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./badge.module.css";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface BadgeVariantOptions {
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: styles.default!,
  secondary: styles.secondary!,
  destructive: styles.destructive!,
  outline: styles.outline!,
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

function badgeVariants({variant = "default", className}: Readonly<BadgeVariantOptions> = {}): string {
  return cn(styles.badge, variantStyles[variant], className);
}

function Badge({className, variant = "default", ...props}: BadgeProps): React.JSX.Element {
  return (
    <div
      className={badgeVariants({variant, className})}
      {...props}
    />
  );
}

export {Badge, badgeVariants};
