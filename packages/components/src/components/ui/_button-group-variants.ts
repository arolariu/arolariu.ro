/**
 * Private, directive-free home of the public `buttonGroupVariants` class helper; not a package subpath.
 *
 * @remarks
 * The root barrel re-exports the helper from here, so `@arolariu/components` hands Server Components the function itself.
 * `button-group.tsx` re-exports it too, which keeps the `@arolariu/components/button-group` subpath API unchanged. Keep
 * this module free of `"use client"` and of runtime React imports: its whole runtime graph is the CSS Module and `cn()`.
 */

import {cn} from "@/lib/utilities";
import type {ButtonGroup, ButtonGroupVariantOptions} from "./button-group";
import styles from "./button-group.module.css";

/**
 * Returns the CSS class list for a button group root.
 *
 * @remarks
 * Gives another container the {@link ButtonGroup} layout: inline-flex children whose touching corners are squared and
 * whose shared borders overlap by one pixel, in a row or (with `vertical`) a full-width column. It only styles: ButtonGroup
 * itself adds `role="group"`, so give a styled container that role and an accessible name (`aria-label` or
 * `aria-labelledby`) when the grouping matters to assistive technology.
 *
 * **Rendering Context**: Server-callable. This pure function lives in a directive-free module that loads no React, so a
 * Server Component can call it when it imports it from the package root (`@arolariu/components`). The
 * `@arolariu/components/button-group` subpath re-exports it from a `"use client"` module, where it is a client
 * reference: call it through that subpath only from Client Components.
 *
 * @param options - Variant options used to derive the generated class string.
 * @returns The merged class name string for the requested orientation.
 *
 * @example
 * ```tsx
 * const className = buttonGroupVariants({orientation: "vertical"});
 * ```
 */
export function buttonGroupVariants({orientation = "horizontal", className}: Readonly<ButtonGroupVariantOptions> = {}): string {
  return cn(styles.root, orientation === "vertical" ? styles.vertical : styles.horizontal, className);
}
