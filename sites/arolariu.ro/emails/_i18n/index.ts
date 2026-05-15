/**
 * @fileoverview Locale loader, translator factory, and subject resolver for React Email templates.
 * @module emails/_i18n
 *
 * @remarks
 * Templates use {@link createEmailTranslator} (a thin wrapper around
 * `next-intl`'s `createTranslator`) with messages loaded via
 * {@link loadMessages}. The wrapper returns a loosely-typed translator so the
 * full message-tree type doesn't have to flow through every template — the
 * generated `messages/en.d.json.ts` is large enough that next-intl's deep key
 * inference can exceed V8's internal Map size during `next build`.
 *
 * The {@link getEmailSubject} helper is used by the central email service to
 * resolve a template's `subject` string.
 *
 * Implementation note: `loadMessages` uses a hard-coded `switch` over dynamic
 * imports so the bundler resolves exactly the three locale JSON files (rather
 * than the entire `messages/` glob, which would also pull in any `.bak` files).
 */

import {createTranslator} from "next-intl";
import type {ReactNode} from "react";

export type EmailLocale = "en" | "ro" | "fr";

export const SUPPORTED_LOCALES = ["en", "ro", "fr"] as const satisfies readonly EmailLocale[];

export const DEFAULT_LOCALE: EmailLocale = "en";

/** Loaded message tree (untyped — templates address keys by string). */
export type EmailMessages = Record<string, unknown>;

/**
 * Loosely-typed translator returned by {@link createEmailTranslator}.
 *
 * Mirrors the shape of `next-intl`'s callable translator (with a `.rich`
 * method) but without the deep key inference that would otherwise propagate
 * the entire message tree's type.
 *
 * `.rich` accepts a mix of scalar ICU vars (`string | number`) and tag
 * callbacks (`(chunks?) => ReactNode`), matching next-intl's runtime contract.
 */
export type EmailTranslator = ((key: string, vars?: Record<string, string | number>) => string) & {
  rich: (key: string, replacements?: Record<string, string | number | ((chunks?: ReactNode) => ReactNode)>) => ReactNode;
};

/** Loads the full message bundle for a locale. */
export async function loadMessages(locale: EmailLocale = DEFAULT_LOCALE): Promise<EmailMessages> {
  switch (locale) {
    case "ro":
      return (await import("../../messages/ro.json")).default as EmailMessages;
    case "fr":
      return (await import("../../messages/fr.json")).default as EmailMessages;
    case "en":
    default:
      return (await import("../../messages/en.json")).default as EmailMessages;
  }
}

/**
 * Creates a translator scoped to a specific email namespace (e.g.
 * `"email.welcome"`). The returned function is loosely typed to keep build-
 * time TypeScript work cheap; runtime behavior is identical to a plain
 * `createTranslator({locale, messages, namespace})` call.
 */
export function createEmailTranslator(opts: {
  readonly locale: EmailLocale;
  readonly messages: EmailMessages;
  readonly namespace: string;
}): EmailTranslator {
  // The cast trades the deep-key generic for a uniform `(key: string) => string`
  // contract. Necessary to keep `tsc` from materialising a 5000+ line message
  // tree type at every callsite (which exceeds V8's Map limit during build).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createTranslator(opts as any) as unknown as EmailTranslator;
}

/**
 * Resolves the localized `subject` string for an email namespace.
 *
 * @param namespace - e.g. `"email.welcome"` — must contain a `subject` key.
 * @param locale - defaults to `"en"`.
 * @param vars - ICU variables for interpolation.
 */
export async function getEmailSubject(
  namespace: string,
  locale: EmailLocale = DEFAULT_LOCALE,
  vars: Record<string, string | number> = {},
): Promise<string> {
  const messages = await loadMessages(locale);
  const t = createEmailTranslator({locale, messages, namespace});
  return t("subject", vars);
}
