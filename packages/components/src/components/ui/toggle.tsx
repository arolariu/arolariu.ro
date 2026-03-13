"use client";

import {Toggle as BaseToggle} from "@base-ui/react/toggle";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./toggle.module.css";

export type ToggleVariant = "default" | "outline";
export type ToggleSize = "default" | "sm" | "lg";

export interface ToggleVariantOptions {
  variant?: ToggleVariant;
  size?: ToggleSize;
  className?: string;
}

/** Returns the CSS module classes used by the toggle wrapper. */
export function toggleVariants({variant = "default", size = "default", className}: Readonly<ToggleVariantOptions> = {}): string {
  const variantClass = variant === "outline" ? styles.outline : styles.default;
  const sizeClass = size === "sm" ? styles.sizeSm : size === "lg" ? styles.sizeLg : styles.sizeDefault;

  return cn(styles.root, variantClass, sizeClass, className);
}

export interface ToggleProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseToggle>, "className"> {
  className?: string;
  variant?: ToggleVariant;
  size?: ToggleSize;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(({className, variant, size, ...props}, ref) => (
  <BaseToggle
    ref={ref}
    className={toggleVariants({variant, size, className})}
    {...props}
  />
));
Toggle.displayName = "Toggle";

export {Toggle};
