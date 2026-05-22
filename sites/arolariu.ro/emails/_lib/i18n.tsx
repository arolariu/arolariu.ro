/**
 * @fileoverview Single source of truth for email internationalization — locale data, message loading, translator construction, and shared rich-message renderers.
 * @module emails/_lib/i18n
 *
 * @remarks
 * This module consolidates the email i18n surface into one location:
 * - Locale types and constants (EmailLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES)
 * - Message bundle loading via {@link loadMessages}
 * - Translator factory {@link createEmailTranslator} (thin wrapper around next-intl)
 * - Reusable `t.rich()` render functions ({@link renderStrong}, {@link renderSupportLink}, {@link createLinkRenderer})
 *
 * **Why one file?**
 * - Single import for all email i18n needs — templates import once from `"../_lib/i18n"`
 * - Shared render functions live alongside the translator factory they're used with
 * - Easier to evolve the i18n strategy (e.g., add new locales, change message format) in one place
 *
 * **Type safety without `any`:**
 * The deep-key inference from next-intl is sidestepped by supplying explicit
 * `<AbstractIntlMessages, string>` type arguments to `createTranslator`, not by
 * casting through `any`. The `as unknown as EmailTranslator` widening at the
 * end is the deliberate cast — necessary because next-intl's return type still
 * ties back to the (now-erased) key tree generic.
 *
 * **loadMessages path update:**
 * Now that this file lives in `emails/_lib/` instead of `emails/_i18n/`, the
 * dynamic imports reach `../messages/*.json` (one level up from `_lib/`).
 */

import {createTranslator, type AbstractIntlMessages} from "next-intl";
import type {ReactNode} from "react";
import {Link} from "react-email";
import {BRAND, EmailLinkStyles} from "../_components";

// ============================================================================
// LOCALE DATA & CONSTANTS
// ============================================================================

export type EmailLocale = "en" | "ro" | "fr";

export const SUPPORTED_LOCALES = ["en", "ro", "fr"] as const satisfies readonly EmailLocale[];

export const DEFAULT_LOCALE: EmailLocale = "en";

/** Loaded message tree (untyped — templates address keys by string). */
export type EmailMessages = Record<string, unknown>;

/**
 * Loosely-typed translator returned by {@link createEmailTranslator}.
 *
 * Mirrors the shape of `next-intl`'s callable translator (with a `.rich`
 * method) but without the deep key inference that would otherwise
 * propagate the entire message tree's type.
 *
 * `.rich` accepts a mix of scalar ICU vars (`string | number`) and tag
 * callbacks (`(chunks?) => ReactNode`), matching next-intl's runtime
 * contract.
 */
export type EmailTranslator = ((key: string, vars?: Readonly<Record<string, string | number>>) => string) & {
  readonly rich: (key: string, replacements?: Readonly<Record<string, string | number | ((chunks?: ReactNode) => ReactNode)>>) => ReactNode;
};

// ============================================================================
// MESSAGE LOADING
// ============================================================================

/**
 * Loads the full message bundle for a locale.
 *
 * @remarks
 * Uses a hard-coded `switch` over dynamic imports so the bundler resolves
 * exactly the three locale JSON files (rather than the entire `messages/`
 * glob, which would also pull in any `.bak` files).
 *
 * **Path note:** This file lives in `emails/_lib/`, so the relative path to
 * `messages/` is `../messages/` (one level up from `_lib/`).
 */
export async function loadMessages(locale: EmailLocale = DEFAULT_LOCALE): Promise<EmailMessages> {
  switch (locale) {
    case "ro": {
      const roModule = await import("../../messages/ro.json");
      return roModule.default as EmailMessages;
    }
    case "fr": {
      const frModule = await import("../../messages/fr.json");
      return frModule.default as EmailMessages;
    }
    default: {
      const enModule = await import("../../messages/en.json");
      return enModule.default as EmailMessages;
    }
  }
}

// ============================================================================
// TRANSLATOR FACTORY
// ============================================================================

/**
 * Creates a translator scoped to a specific email namespace (e.g.
 * `"email.welcome"`).
 *
 * @remarks
 * Explicit `<AbstractIntlMessages, string>` type arguments on
 * `createTranslator` short-circuit the deep key-path inference that
 * previously triggered V8's Map-size limit during `next build`. The
 * `as unknown as EmailTranslator` widening is the deliberate cast —
 * necessary because next-intl's return type still ties back to the
 * (now-erased) key tree generic. No `any` anywhere.
 *
 * @example
 * ```ts
 * const messages = await loadMessages("ro");
 * const t = createEmailTranslator({locale: "ro", messages, namespace: "email.welcome"});
 * t("greeting", {name: "Alex"}); // → "Salut, Alex"
 * ```
 */
export function createEmailTranslator(opts: {
  readonly locale: EmailLocale;
  readonly messages: EmailMessages;
  readonly namespace: string;
}): EmailTranslator {
  return createTranslator<AbstractIntlMessages, string>({
    locale: opts.locale,
    messages: opts.messages as AbstractIntlMessages,
    namespace: opts.namespace,
  }) as unknown as EmailTranslator;
}

// ============================================================================
// SHARED RICH-MESSAGE RENDERERS
// ============================================================================

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
