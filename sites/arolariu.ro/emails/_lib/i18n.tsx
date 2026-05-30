/**
 * @fileoverview Single source of truth for email internationalization — locale data, message loading, and translator construction.
 * @module emails/_lib/i18n
 *
 * @remarks
 * This module consolidates the email i18n surface into one location:
 * - Locale types and constants (EmailLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES)
 * - Message bundle loading via {@link loadMessages}
 * - Translator factory {@link createEmailTranslator} (thin wrapper around next-intl)
 * - Path helper {@link selectorFromPath} for email-only key references
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
 * **Email-only Next Intl usage:**
 * React Email templates render outside an interactive React tree. This module
 * therefore uses Next Intl's non-hook `createTranslator` API and exports a
 * local `selectorFromPath` compatibility helper, avoiding selector packages
 * that import React context at module evaluation time.
 *
 * **loadMessages path:**
 * This file lives in `emails/_lib/`, so the dynamic imports reach
 * `../../messages/*.json` (two levels up from `_lib/`).
 */

import {createTranslator, type AbstractIntlMessages} from "next-intl";
import type {ReactNode} from "react";

// ============================================================================
// LOCALE DATA & CONSTANTS
// ============================================================================

export type EmailLocale = "en" | "ro" | "fr";

export const SUPPORTED_LOCALES = ["en", "ro", "fr"] as const satisfies readonly EmailLocale[];

export const DEFAULT_LOCALE: EmailLocale = "en";

/** Loaded message tree used by selector translators. */
export type EmailMessages = Record<string, unknown>;

/** Values supported by ICU interpolation in email messages. */
export type EmailTranslationValues = Readonly<Record<string, string | number | Date>>;

/** Values supported by rich-text interpolation in email messages. */
export type EmailRichTranslationValues = Readonly<Record<string, string | number | Date | ((chunks: ReactNode) => ReactNode)>>;

/**
 * Translator returned by {@link createEmailTranslator}.
 *
 * @remarks
 * Email templates use full message paths, e.g. `"emails.welcome.greeting"`.
 */
export type EmailTranslator = {
  (key: string, values?: EmailTranslationValues): string;
  readonly rich: (key: string, values?: EmailRichTranslationValues) => ReactNode;
  readonly markup: (key: string, values?: Readonly<Record<string, string | number | Date | ((chunks: string) => string)>>) => string;
  readonly raw: (key: string) => unknown;
  readonly has: (key: string) => boolean;
};

/**
 * Email-local compatibility helper for previous selector-style call sites.
 *
 * @remarks
 * This intentionally returns the path unchanged so email templates can keep
 * using `t(selectorFromPath("emails.example.key"))` without importing
 * `next-intl-selector`'s React-bound runtime entrypoint.
 */
export function selectorFromPath(path: string): string {
  return path;
}

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
 * Creates a translator for email messages.
 *
 * @remarks
 * The `namespace` option is accepted for existing template configuration
 * compatibility, but email templates pass full message paths.
 *
 * @example
 * ```ts
 * const messages = await loadMessages("ro");
 * const t = createEmailTranslator({locale: "ro", messages, namespace: "emails.welcome"});
 * t(selectorFromPath("emails.welcome.greeting"), {name: "Alex"}); // -> "Salut, Alex"
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
  }) as unknown as EmailTranslator;
}
