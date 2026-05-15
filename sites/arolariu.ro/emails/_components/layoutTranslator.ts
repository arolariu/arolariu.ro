import {createEmailTranslator, type EmailLocale, type EmailTranslator, loadMessages} from "../_i18n";

/**
 * @fileoverview Memoised `email.layout`-scoped translator per locale.
 * @module emails/_components/layoutTranslator
 *
 * @remarks
 * The layout's strings (tagline, footer, fallbacks) live in the
 * `email.layout` next-intl namespace. Resolving them on every render
 * would mean a redundant `loadMessages` + `createEmailTranslator` pair
 * per email — the template has already done that work for its own
 * namespace.
 *
 * This module's cache is bounded by {@link EmailLocale} (currently 3
 * entries: en / ro / fr). It never invalidates — message-tree updates
 * require a deploy, which reloads the module and zeroes the map. In
 * Node.js runtime, the cache is process-wide and survives across
 * requests served by the same warm function instance.
 *
 * A first-render-per-locale double-construct race is harmless: both
 * concurrent callers compute the same value, the last writer wins, and
 * subsequent callers hit the cache. No `inflight` Promise is needed —
 * the work is purely synchronous plus a cached `import()`, so there's
 * no real I/O to dedupe. (Patterns that DO need `inflight` deduplication
 * are connection-pooling singletons over network I/O, e.g., the upcoming
 * Resend client in `lib/email/resendClient.ts`.)
 */

const _layoutTranslatorByLocale = new Map<EmailLocale, EmailTranslator>();

/**
 * Get the memoised `email.layout`-scoped translator for a locale.
 *
 * @param locale - Resolved locale to translate for.
 * @returns The cached or newly-constructed translator.
 *
 * @example
 * ```tsx
 * // Inside an async server component (e.g., EmailLayout):
 * const tLayout = await getLayoutTranslator(locale);
 * <Text>{tLayout("tagline")}</Text>
 * ```
 */
export async function getLayoutTranslator(locale: EmailLocale): Promise<EmailTranslator> {
  const cached = _layoutTranslatorByLocale.get(locale);
  if (cached) return cached;
  const messages = await loadMessages(locale);
  const t = createEmailTranslator({locale, messages, namespace: "email.layout"});
  _layoutTranslatorByLocale.set(locale, t);
  return t;
}

/**
 * Test-only: clear the cached layout translators.
 *
 * Production code MUST NOT call this — invalidating the cache mid-request
 * defeats the memoisation and re-incurs the `loadMessages` cost.
 *
 * @internal
 */
export function __resetLayoutTranslatorCache(): void {
  _layoutTranslatorByLocale.clear();
}
