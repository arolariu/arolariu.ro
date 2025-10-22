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
