/**
 * @fileoverview Single source of truth for email internationalization — locale data, message loading, and translator construction.
 * @module emails/_lib/i18n
 *
 * @remarks
 * This module consolidates the email i18n surface into one location:
 * - Locale types and constants (EmailLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES)
 * - Message bundle loading via {@link loadMessages}
 * - Translator factory {@link createEmailTranslator} (thin wrapper around next-intl)
 *
 * **Why one file?**
 * - Single import for all email i18n needs — templates import once from `"../_lib/i18n"`
 * - Easier to evolve the i18n strategy (e.g., add new locales, change message format) in one place
 *
 * **No shared `t.rich()` render helpers.** Earlier revisions of this file
 * exported `renderStrong`, `renderSupportLink`, and `createLinkRenderer`
 * to share rendering glue across email templates and satisfy
 * `react/no-unstable-nested-components`. That rule is irrelevant for
 * react-email templates — they're rendered server-side to static HTML
 * and never mount into a React DOM tree, so unstable function identity
 * has no observable effect. Templates inline their own `t.rich()`
 * renderers with a scoped `// eslint-disable-next-line react/no-unstable-nested-components`.
 *
 * **Type safety without `any`:**
 * The deep-key inference from next-intl is sidestepped by supplying explicit
 * `<AbstractIntlMessages, string>` type arguments to `createTranslator`, not by
 * casting through `any`. The `as unknown as EmailTranslator` widening at the
 * end is the deliberate cast — necessary because next-intl's return type still
 * ties back to the (now-erased) key tree generic.
 *
 * **loadMessages path:**
 * This file lives in `emails/_lib/`, so the dynamic imports reach
 * `../../messages/*.json` (two levels up from `_lib/`).
 */

import {type AbstractIntlMessages} from "next-intl";
import {createTranslator, type SelectorTranslator} from "next-intl-selector";

// ============================================================================
// LOCALE DATA & CONSTANTS
// ============================================================================

export type EmailLocale = "en" | "ro" | "fr";

export const SUPPORTED_LOCALES = ["en", "ro", "fr"] as const satisfies readonly EmailLocale[];

export const DEFAULT_LOCALE: EmailLocale = "en";

/** Loaded message tree used by selector translators. */
export type EmailMessages = Record<string, unknown>;

/**
 * Selector translator returned by {@link createEmailTranslator}.
 *
 * @remarks
 * Email templates use full selector paths, matching the website runtime.
 */
export type EmailTranslator = SelectorTranslator;

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
 * Creates a selector translator for email messages.
 *
 * @remarks
 * The `namespace` option is accepted for existing template configuration
 * compatibility, but selectors always encode the full message path.
 *
 * @example
 * ```ts
 * const messages = await loadMessages("ro");
 * const t = createEmailTranslator({locale: "ro", messages, namespace: "emails.welcome"});
 * t(selectorFromPath("emails.welcome.greeting"), {name: "Alex"}); // → "Salut, Alex"
 * ```
 */
export function createEmailTranslator(opts: {
  readonly locale: EmailLocale;
  readonly messages: EmailMessages;
  readonly namespace: string;
}): EmailTranslator {
  return createTranslator({
    locale: opts.locale,
    messages: opts.messages as AbstractIntlMessages,
  });
}
