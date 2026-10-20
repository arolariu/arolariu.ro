/**
 * Private, directive-free home of the public `toggleVariants` class helper; not a package subpath.
 *
 * @remarks
 * The root barrel re-exports the helper from here, so `@arolariu/components` hands Server Components the function itself.
 * `toggle.tsx` re-exports it too, which keeps the `@arolariu/components/toggle` subpath API unchanged. Keep this module
 * free of `"use client"` and of runtime React imports: its whole runtime graph is the CSS Module and `cn()`.
 */

import {cn} from "@/lib/utilities";
import type {Toggle, ToggleVariantOptions} from "./toggle";
import styles from "./toggle.module.css";

/**
 * Returns the CSS module classes used by the toggle wrapper.
 *
 * @remarks
 * {@link Toggle} applies these classes itself. Use the helper to give another element the toggle surface. The pressed
 * look follows a `data-pressed` attribute, which Toggle's Base UI primitive sets: on another element set `data-pressed`
 * together with the matching accessible state (for example `aria-pressed` on a native `<button>`).
 *
 * **Rendering Context**: Server-callable. This pure function lives in a directive-free module that loads no React, so a
 * Server Component can call it when it imports it from the package root (`@arolariu/components`). The
 * `@arolariu/components/toggle` subpath re-exports it from a `"use client"` module, where it is a client reference: call
 * it through that subpath only from Client Components.
 *
 * @param options - The `variant` and `size` (both `"default"` when omitted) and extra `className` merged last.
 * @returns The merged class string: the base toggle class, the variant class, the size class and `className`.
 *
 * @example
 * ```tsx
 * const className = toggleVariants({variant: "outline", size: "sm"});
 * ```
 */
export function toggleVariants({variant = "default", size = "default", className}: Readonly<ToggleVariantOptions> = {}): string {
  const variantClass = variant === "outline" ? styles.outline : styles.default;
  const sizeClass = size === "sm" ? styles.sizeSm : size === "lg" ? styles.sizeLg : styles.sizeDefault;

  return cn(styles.root, variantClass, sizeClass, className);
}
