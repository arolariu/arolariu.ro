/**
 * @fileoverview Locale loader and subject resolver for React Email templates.
 * @module emails/_i18n
 *
 * @remarks
 * Templates use 
ext-intl's createTranslator directly with messages loaded
 * via {@link loadMessages}. The {@link getEmailSubject} helper is used by the
 * central email service to resolve a template's subject string.
 *
 * Implementation note: loadMessages uses a hard-coded switch over dynamic
 * imports so the bundler resolves exactly the three locale JSON files (rather
 * than the entire messages/ glob, which would also pull in any .bak files).
 */

import {createTranslator} from "next-intl";

export type EmailLocale = "en" | "ro" | "fr";

export const SUPPORTED_LOCALES = ["en", "ro", "fr"] as const satisfies readonly EmailLocale[];

export const DEFAULT_LOCALE: EmailLocale = "en";

/** Loads the full message bundle for a locale. */
export async function loadMessages(locale: EmailLocale = DEFAULT_LOCALE): Promise<Record<string, unknown>> {
  switch (locale) {
    case "ro":
      return (await import("../../messages/ro.json")).default as Record<string, unknown>;
    case "fr":
      return (await import("../../messages/fr.json")).default as Record<string, unknown>;
    case "en":
    default:
      return (await import("../../messages/en.json")).default as Record<string, unknown>;
  }
}

/**
 * Resolves the localized subject string for an email namespace.
 *
 * @param namespace - e.g. "email.welcome" — must contain a subject key.
 * @param locale - defaults to "en".
 * @param vars - ICU variables for interpolation.
 */
export async function getEmailSubject(
  namespace: string,
  locale: EmailLocale = DEFAULT_LOCALE,
  vars: Record<string, string | number> = {},
): Promise<string> {
  const messages = await loadMessages(locale);
  const t = createTranslator({locale, messages, namespace});
  return t("subject", vars);
}
