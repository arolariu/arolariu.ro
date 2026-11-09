/**
 * Private, directive-free home of the public `markerVariants` class helper; not a package subpath.
 *
 * @remarks
 * The root barrel re-exports the helper from here, so `@arolariu/components` hands Server Components the function itself.
 * `marker.tsx` re-exports it too, which keeps the `@arolariu/components/marker` subpath API unchanged. Keep this module
 * free of `"use client"` and of runtime React imports: its whole runtime graph is the CSS Module and `cn()`.
 */

import {cn} from "@/lib/utilities";
import type {Marker, MarkerContent, MarkerVariant, MarkerVariantOptions} from "./marker";
import styles from "./marker.module.css";

const variantStyles: Record<MarkerVariant, string | undefined> = {
  default: undefined,
  separator: styles.separator,
  border: styles.border,
};

/**
 * Builds the {@link Marker} class list without rendering a Marker.
 *
 * @remarks
 * Gives another element the marker look: a full-width, muted flex row, plus the leading and trailing rules of
 * `separator` or the bottom border of `border`. It only styles, so the element keeps its own semantics and gains no role
 * or live region. Put text and links in a {@link MarkerContent}, which wraps long text: plain links there inherit the
 * marker colour and stay underlined. `className` and the upstream-compatible `class` alias are merged last, in that
 * order.
 *
 * **Rendering Context**: Server-callable. This pure function lives in a directive-free module that loads no React, so a
 * Server Component can call it when it imports it from the package root (`@arolariu/components`). The
 * `@arolariu/components/marker` subpath re-exports it from a `"use client"` module, where it is a client reference: call
 * it through that subpath only from Client Components.
 *
 * @param options - The `variant` (`"default"` when omitted) and the extra `className`/`class` values merged last.
 * @returns The merged class string: the base marker class, the variant class (none for `"default"`), `className` and
 * `class`.
 *
 * @example
 * ```tsx
 * <li className={markerVariants({variant: "separator"})}>
 *   <MarkerContent>Yesterday</MarkerContent>
 * </li>
 * ```
 */
export function markerVariants({variant = "default", className, class: classValue}: Readonly<MarkerVariantOptions> = {}): string {
  return cn(styles.marker, variantStyles[variant], className, classValue);
}
