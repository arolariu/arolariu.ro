import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./badge.module.css";

/**
 * Defines the supported visual treatments for the Badge component.
 */
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/**
 * Represents the options accepted by the internal badge class generator.
 *
 * @remarks
 * This helper mirrors the public Badge styling API and exists so callers can derive
 * consistent class names without rendering the component itself.
 *
 * @default variant `"default"`
 */
interface BadgeVariantOptions {
  /**
   * The visual emphasis applied to the badge surface.
   *
   * @default "default"
   */
  variant?: BadgeVariant;
  /**
   * Additional CSS classes merged with the generated badge classes.
   */
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: styles.default!,
  secondary: styles.secondary!,
  destructive: styles.destructive!,
  outline: styles.outline!,
};

/**
 * Represents the configurable props for the Badge component.
 *
 * @remarks
 * Extends standard `<div>` attributes so badges can expose data attributes, ARIA
 * state, and event handlers while preserving the library's visual variants.
 *
 * @default variant `"default"`
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Additional CSS classes merged with the computed badge classes.
   */
  className?: string;
  /**
   * The visual variant used to communicate importance or status.
   *
   * @default "default"
   */
  variant?: BadgeVariant;
}

/**
 * Generates the CSS class list for a badge variant.
 *
 * @remarks
 * This utility is useful when another component needs badge styling but cannot render
 * the Badge component directly. It always includes the base badge classes.
 *
 * @example
 * ```tsx
 * <span className={badgeVariants({variant: "outline"})}>Beta</span>
 * ```
 *
 * @see {@link Badge}
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
function badgeVariants({variant = "default", className}: Readonly<BadgeVariantOptions> = {}): string {
  return cn(styles.badge, variantStyles[variant], className);
}

/**
 * A compact status label for surfacing metadata, categories, or state.
 *
 * @remarks
 * **Rendering Context**: Server- and client-compatible presentational component.
 *
 * Renders a styled `<div>` with pill-like spacing and variant-driven colors.
 * Use it for small, high-signal labels such as statuses, tags, or counters.
 *
 * @example
 * ```tsx
 * <Badge variant="secondary">New</Badge>
 * ```
 *
 * @see {@link badgeVariants} — Generates matching badge classes without rendering.
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({className, variant = "default", ...props}, ref) => (
  <div
    ref={ref}
    className={badgeVariants({variant, className})}
    {...props}
  />
));
Badge.displayName = "Badge";

export {Badge, badgeVariants};
