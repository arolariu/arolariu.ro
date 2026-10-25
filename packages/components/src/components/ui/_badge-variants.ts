/**
 * Private, directive-free home of the public `badgeVariants` class helper; not a package subpath.
 *
 * @remarks
 * The root barrel re-exports the helper from here, so `@arolariu/components` hands Server Components the function itself.
 * `badge.tsx` re-exports it too, which keeps the `@arolariu/components/badge` subpath API unchanged. Keep this module free
 * of `"use client"` and of runtime React imports: its whole runtime graph is the CSS Module and `cn()`.
 */

import {cn} from "@/lib/utilities";
import type {Badge, BadgeVariant, BadgeVariantOptions} from "./badge";
import styles from "./badge.module.css";

const variantStyles: Record<BadgeVariant, string> = {
  default: styles.default!,
  secondary: styles.secondary!,
  destructive: styles.destructive!,
  outline: styles.outline!,
  ghost: styles.ghost!,
  link: styles.link!,
};

/**
 * Generates the CSS class list for a badge variant.
 *
 * @remarks
 * This utility is useful when another component needs badge styling but cannot render
 * the Badge component directly. It always includes the base badge classes.
 *
 * **Rendering Context**: Server-callable. This pure function lives in a directive-free module that loads no React, so a
 * Server Component can call it when it imports it from the package root (`@arolariu/components`). The
 * `@arolariu/components/badge` subpath re-exports it from a `"use client"` module, where it is a client reference: call
 * it through that subpath only from Client Components.
 *
 * @param options - The `variant` (`"default"` when omitted) and extra `className` merged last.
 * @returns The merged class string: the base badge class, the variant class and `className`.
 *
 * @example
 * ```tsx
 * <span className={badgeVariants({variant: "outline"})}>Beta</span>
 * ```
 *
 * @see {@link Badge}
 * @see {@link https://base-ui.com/react/overview Base UI documentation}
 */
export function badgeVariants({variant = "default", className}: Readonly<BadgeVariantOptions> = {}): string {
  return cn(styles.badge, variantStyles[variant], className);
}
