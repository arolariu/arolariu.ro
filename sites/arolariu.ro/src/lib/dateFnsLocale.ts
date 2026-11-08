import type {Locale as DateFnsLocale} from "date-fns";
import {enUS, fr, ro} from "date-fns/locale";

const DATE_FNS_LOCALES: Readonly<Record<string, DateFnsLocale>> = {en: enUS, ro, fr};

/**
 * Resolves the date-fns locale for a next-intl locale code.
 *
 * @remarks
 * `@arolariu/components` v3 `Calendar` renders DayPicker's `en-US` default unless a `locale` is passed, so
 * every calendar forwards this value to keep month, weekday, and day-button labels in the active site language.
 *
 * @param locale - The active next-intl locale code (`en`, `ro`, or `fr`).
 * @returns The matching date-fns locale, or `enUS` for an unsupported code.
 *
 * @example
 * ```tsx
 * const locale = useLocale();
 * <Calendar mode='single' locale={getDateFnsLocale(locale)} />;
 * ```
 */
export function getDateFnsLocale(locale: string): DateFnsLocale {
  return DATE_FNS_LOCALES[locale] ?? enUS;
}
