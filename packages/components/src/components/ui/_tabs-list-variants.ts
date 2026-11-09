/**
 * Private, directive-free home of the public `tabsListVariants` class helper; not a package subpath.
 *
 * @remarks
 * The root barrel re-exports the helper from here, so `@arolariu/components` hands Server Components the function itself.
 * `tabs.tsx` re-exports it too, which keeps the `@arolariu/components/tabs` subpath API unchanged. Keep this module free
 * of `"use client"` and of runtime React imports: its whole runtime graph is the CSS Module and `cn()`.
 */

import {cn} from "@/lib/utilities";
import type {TabsList, TabsListVariant, TabsListVariantOptions} from "./tabs";
import styles from "./tabs.module.css";

const listVariantStyles = {
  default: styles.default,
  line: styles.line,
} satisfies Record<TabsListVariant, string | undefined>;

/**
 * Returns the CSS Module classes for a tab list presentation.
 *
 * @remarks
 * {@link TabsList} applies these classes itself. Use the helper to give another list-like element the
 * same chrome: the muted, padded surface of `default` or the bottom (inline-end when vertical) border of
 * `line`. It styles only the container; tab classes, the indicator and keyboard behaviour belong to
 * the Tabs parts, so the element keeps its own semantics.
 *
 * **Rendering Context**: Server-callable. This pure function lives in a directive-free module that loads no React, so a
 * Server Component can call it when it imports it from the package root (`@arolariu/components`). The
 * `@arolariu/components/tabs` subpath re-exports it from a `"use client"` module, where it is a client reference: call
 * it through that subpath only from Client Components.
 *
 * @param options - The presentation (`variant`, `"default"` when omitted) and extra `className` merged last.
 * @returns The merged class string: the base list class, the variant class and `className`.
 *
 * @example
 * ```tsx
 * // A view switcher that matches the tab list chrome but keeps toggle-button semantics.
 * <ToggleGroup aria-label='View' className={tabsListVariants({variant: "default"})}>
 *   <ToggleGroupItem value='list'>List</ToggleGroupItem>
 *   <ToggleGroupItem value='grid'>Grid</ToggleGroupItem>
 * </ToggleGroup>
 * ```
 */
export function tabsListVariants({variant = "default", className}: Readonly<TabsListVariantOptions> = {}): string {
  return cn(styles.list, listVariantStyles[variant], className);
}
