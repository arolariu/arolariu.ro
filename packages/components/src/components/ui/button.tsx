"use client";

import {Button as BaseButton} from "@base-ui/react/button";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./button.module.css";

const variantStyles: Record<string, string> = {
  default: styles.default!,
  destructive: styles.destructive!,
  outline: styles.outline!,
  secondary: styles.secondary!,
  ghost: styles.ghost!,
  link: styles.link!,
};

const sizeStyles: Record<string, string> = {
  default: styles.sizeDefault!,
  sm: styles.sizeSm!,
  lg: styles.sizeLg!,
  icon: styles.sizeIcon!,
};

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonVariantOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /**
   * Render as a child element (e.g., an anchor tag).
   * Maps to Base UI's `render` prop internally.
   * @deprecated Prefer using Base UI's `render` prop directly for new code.
   */
  asChild?: boolean;
}

function buttonVariants({variant = "default", size = "default", className}: Readonly<ButtonVariantOptions> = {}): string {
  return cn(styles.button, variantStyles[variant], sizeStyles[size], className);
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant = "default", size = "default", asChild = false, children, ...props}, ref) => {
    const composedClassName = buttonVariants({variant, size, className});

    if (asChild && React.isValidElement(children)) {
      return (
        <BaseButton
          ref={ref}
          className={composedClassName}
          nativeButton={false}
          render={children as React.ReactElement}
          {...props}
        />
      );
    }

    return (
      <BaseButton
        ref={ref}
        className={composedClassName}
        {...props}>
        {children}
      </BaseButton>
    );
  },
);
Button.displayName = "Button";

export {Button, buttonVariants};
