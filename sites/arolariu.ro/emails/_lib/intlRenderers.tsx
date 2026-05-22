/**
 * @fileoverview Reusable next-intl `t.rich(...)` render functions for email templates.
 * @module emails/_lib/intlRenderers
 *
 * @remarks
 * The `react/no-unstable-nested-components` lint rule requires that the
 * inline render-functions passed to `t.rich(...)` are defined at module scope
 * (not inside the component) so each render does not allocate a fresh function
 * identity. This module centralises the closure-free renderers that multiple
 * email templates share, so each template can `import {renderStrong, renderSupportLink}`
 * instead of redeclaring identical helpers.
 *
 * **Why a dedicated file?**
 * - Keeps the email templates focused on layout — the rendering glue lives
 *   one level down in `_lib/` alongside `defineEmailTemplate.ts`.
 * - Single source of truth for the support-link styling — if the brand
 *   support address or the link style ever changes, only this file changes.
 * - Renderers that close over per-template props (e.g., a dashboard URL)
 *   stay in their respective templates; this file only exports the
 *   reusable, closure-free ones plus a small factory helper.
 *
 * **What does NOT belong here:**
 * - Renderers that close over component props or state. Those must live
 *   inside the template (use `useCallback` in client components, or a
 *   module-level factory like {@link createLinkRenderer} that takes the
 *   prop as an argument).
 * - Renderers used by exactly one template — keep them next to their
 *   single consumer for locality. Promote to this file the moment a
 *   second template needs the same shape.
 */

import {Link} from "react-email";
import {BRAND, EmailLinkStyles} from "../_components";

/**
 * Renders the supplied chunks wrapped in a `<strong>` element.
 *
 * @remarks
 * Used by `t.rich(key, {strong: renderStrong})` (and equivalent placeholder
 * names like `count`, `bold`, etc.) to bold-emphasise spans within a
 * translated string. Defined at module scope so the render-function identity
 * is stable across renders — required by `react/no-unstable-nested-components`.
 *
 * @param chunks - The translated React children to wrap.
 * @returns A `<strong>` element containing `chunks`.
 *
 * @example
 * ```tsx
 * <Text>{t.rich("intro", {strong: renderStrong})}</Text>
 * // where `intro` is the translation key `"Welcome <strong>back</strong>!"`
 * ```
 */
export const renderStrong = (chunks: React.ReactNode): React.JSX.Element => <strong>{chunks}</strong>;

/**
 * Renders the supplied chunks as a `mailto:` link to the brand support address.
 *
 * @remarks
 * Used by `t.rich(key, {link: renderSupportLink})` to embed an inline link to
 * `support@arolariu.ro` (or whatever {@link BRAND.supportEmail} resolves to).
 * Applies the shared {@link EmailLinkStyles} so the link matches the rest of
 * the email-template look.
 *
 * @param chunks - The translated link text to wrap.
 * @returns A `<Link>` element pointing at `mailto:${BRAND.supportEmail}`.
 *
 * @example
 * ```tsx
 * <Text>{t.rich("supportPrompt", {link: renderSupportLink})}</Text>
 * // where `supportPrompt` is `"Contact <link>support</link> for help."`
 * ```
 */
export const renderSupportLink = (chunks: React.ReactNode): React.JSX.Element => (
  <Link
    href={`mailto:${BRAND.supportEmail}`}
    style={EmailLinkStyles}>
    {chunks}
  </Link>
);

/**
 * Factory: builds a closure-free renderer that wraps chunks in a styled
 * `<Link>` pointing at the supplied URL.
 *
 * @remarks
 * Use this when a template needs to render a link to a per-template URL
 * (e.g., a dashboard URL passed in via props): create the renderer ONCE
 * at module scope using a module-level constant, OR at component scope
 * inside a `useMemo` keyed on the URL.
 *
 * Without `chunks` (zero-arg form), the rendered link uses static text
 * — pair with `t.rich(key, {link: () => createLinkRenderer(url)()})` only
 * when the translation key expects a callable with no arguments. The
 * common form (`{link: createLinkRenderer(url)}`) wraps the translated
 * chunks.
 *
 * @param href - The destination URL the link should point at.
 * @returns A renderer suitable for `t.rich(key, {link: renderer})`.
 *
 * @example
 * ```tsx
 * // At module scope, when the URL is a constant:
 * const renderDashboardLink = createLinkRenderer("https://arolariu.ro/domains/invoices");
 *
 * // Or inside a component when the URL is dynamic:
 * const renderDashboardLink = useMemo(() => createLinkRenderer(effectiveUrl), [effectiveUrl]);
 * ```
 */
export const createLinkRenderer =
  (href: string) =>
  (chunks: React.ReactNode): React.JSX.Element => (
    <Link
      href={href}
      style={EmailLinkStyles}>
      {chunks}
    </Link>
  );
