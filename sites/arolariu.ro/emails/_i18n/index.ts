/**
 * @fileoverview Locale loader, translator factory, and subject resolver for React Email templates.
 * @module emails/_i18n
 *
 * @remarks
 * Templates use {@link createEmailTranslator} (a thin wrapper around
 * `next-intl`'s `createTranslator`) with messages loaded via
 * {@link loadMessages}. The wrapper returns a loosely-typed translator so
 * the full message-tree type doesn't have to flow through every template —
 * the generated `messages/en.d.json.ts` is large enough that next-intl's
 * deep key inference can exceed V8's internal Map size during `next build`.
 *
 * **No `any`.** The deep-key inference is sidestepped by supplying explicit
 * `<AbstractIntlMessages, string>` type arguments to `createTranslator`,
 * not by casting through `any`. The `as unknown as EmailTranslator`
 * widening at the end is the deliberate cast — necessary because
 * next-intl's return type still ties back to the (now-erased) key tree
 * generic.
 *
 * Implementation note: `loadMessages` uses a hard-coded `switch` over
 * dynamic imports so the bundler resolves exactly the three locale JSON
 * files (rather than the entire `messages/` glob, which would also pull
 * in any `.bak` files).
 */

import {createTranslator, type AbstractIntlMessages} from "next-intl";
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

/** Loads the full message bundle for a locale. */
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
