/**
 * Private, directive-free home of the public `navigationMenuTriggerStyle` class helper; not a package subpath.
 *
 * @remarks
 * The root barrel re-exports the helper from here, so `@arolariu/components` hands Server Components the function itself.
 * `navigation-menu.tsx` re-exports it too, which keeps the `@arolariu/components/navigation-menu` subpath API unchanged.
 * Keep this module free of `"use client"` and of runtime React imports: its whole runtime graph is the CSS Module and
 * `cn()`.
 */

import {cn} from "@/lib/utilities";
import styles from "./navigation-menu.module.css";

/**
 * Returns the CSS classes used by a navigation trigger or a trigger-styled link.
 *
 * @remarks
 * A pure class-name helper: it gives a top-level `NavigationMenuLink` (or another link) the look of
 * `NavigationMenuTrigger` without adding behavior, so keyboard support, focus and ARIA still come from the element that
 * receives the classes. Mark the current page's link with `active` so it keeps a non-color indicator.
 *
 * **Rendering Context**: Server-callable. This pure function lives in a directive-free module that loads no React, so a
 * Server Component can call it when it imports it from the package root (`@arolariu/components`). The
 * `@arolariu/components/navigation-menu` subpath re-exports it from a `"use client"` module, where it is a client
 * reference: call it through that subpath only from Client Components.
 *
 * @param className - Optional caller classes, merged after the trigger classes.
 * @returns The merged class string to pass as a `className` prop.
 *
 * @example
 * ```tsx
 * <NavigationMenuItem>
 *   <NavigationMenuLink href='/pricing' className={navigationMenuTriggerStyle()} active>
 *     Pricing
 *   </NavigationMenuLink>
 * </NavigationMenuItem>
 * ```
 */
export function navigationMenuTriggerStyle(className?: string): string {
  return cn(styles.trigger, className);
}
