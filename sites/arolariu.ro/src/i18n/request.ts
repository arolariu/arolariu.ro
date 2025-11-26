/**
 * @fileoverview Next-intl request configuration for internationalization.
 * @module i18n/request
 *
 * @remarks
 * This module configures next-intl for server-side request handling:
 * - Reads locale from cookie storage
 * - Validates against supported locales
 * - Dynamically imports locale-specific message bundles
 *
 * **Execution Context**: Server-side only (Next.js request configuration)
 *
 * **Supported Locales**: English (en), Romanian (ro)
 *
 * @see {@link https://next-intl-docs.vercel.app/docs/getting-started/app-router Next-intl Documentation}
 * @see RFC 1003 - Internationalization System
 */

import {getCookie} from "@/lib/actions/cookies";
import {Locale} from "next-intl";
import {getRequestConfig} from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = (await getCookie("locale")) ?? "en";

  const supportedLocales = ["en", "ro"] as const;
  if (!supportedLocales.includes(locale as Locale)) {
    throw new Error(`[arolariu.ro::i18n] >>> Locale "${locale}" is not supported.`);
  }

  return {
    locale: locale as Locale,
    // eslint-disable-next-line unicorn/no-await-expression-member -- importing messages dynamically
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
