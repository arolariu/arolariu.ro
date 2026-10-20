/**
 * Private, directive-free home of the public `buttonVariants` class helper; not a package subpath.
 *
 * @remarks
 * The root barrel re-exports the helper from here, so `@arolariu/components` hands Server Components the function itself.
 * `button.tsx` re-exports it too, which keeps the `@arolariu/components/button` subpath API unchanged. Keep this module
 * free of `"use client"` and of runtime React imports: its whole runtime graph is the CSS Module and `cn()`.
 */

import {cn} from "@/lib/utilities";
import type {Button, ButtonSize, ButtonVariant, ButtonVariantOptions} from "./button";
import styles from "./button.module.css";

const variantStyles: Record<ButtonVariant, string> = {
  default: styles.default!,
  destructive: styles.destructive!,
  outline: styles.outline!,
  secondary: styles.secondary!,
  ghost: styles.ghost!,
  link: styles.link!,
};

const sizeStyles: Record<ButtonSize, string> = {
  default: styles.sizeDefault!,
  xs: styles.sizeXs!,
  sm: styles.sizeSm!,
  lg: styles.sizeLg!,
  icon: styles.sizeIcon!,
  "icon-xs": styles.sizeIconXs!,
  "icon-sm": styles.sizeIconSm!,
  "icon-lg": styles.sizeIconLg!,
};

/**
 * Builds the composed class list for the shared button component.
 *
 * @remarks
 * Use this helper to give a native link the button appearance. A link must stay an `<a href>`
 * element so assistive technology announces it as a link and lists it with the page's links,
 * and so it follows only on Enter (not Space); style the anchor directly instead of rendering
 * it through {@link Button}. With `variant: "link"`, a real link keeps an underline at rest as a
 * non-colour cue (WCAG 1.4.1), while `<Button variant="link">` underlines only on hover; the other
 * variants never underline. The classes carry no accessible name: an icon-only link (an `icon*`
 * size) still needs its own name, for example `aria-label` or visually hidden text.
 *
 * **Rendering Context**: Server-callable. This pure function lives in a directive-free module that loads no React, so a
 * Server Component can call it when it imports it from the package root (`@arolariu/components`). The
 * `@arolariu/components/button` subpath re-exports it from a `"use client"` module, where it is a client reference: call
 * it through that subpath only from Client Components.
 *
 * @param options - The `variant` and `size` (both `"default"` when omitted) and extra `className` merged last.
 * @returns The merged class string: the base button class, the variant class, the size class and `className`.
 *
 * @example
 * ```tsx
 * // app/page.tsx: a Server Component imports the helper from the package root.
 * import {buttonVariants} from "@arolariu/components";
 *
 * export default function Page() {
 *   return (
 *     <a href="/dashboard" className={buttonVariants({variant: "outline", size: "sm"})}>
 *       Go to dashboard
 *     </a>
 *   );
 * }
 * ```
 *
 * @see {@link Button}
 */
export function buttonVariants({variant = "default", size = "default", className}: Readonly<ButtonVariantOptions> = {}): string {
  return cn(styles.button, variantStyles[variant], sizeStyles[size], className);
}
