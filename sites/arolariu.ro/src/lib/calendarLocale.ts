import {enUS, fr, ro, type CalendarLocale} from "@arolariu/components/calendar-locales";

const CALENDAR_LOCALES: Readonly<Record<string, CalendarLocale>> = {en: enUS, ro, fr};

/**
 * Resolves the `@arolariu/components` Calendar locale for a next-intl locale code.
 *
 * @remarks
 * `@arolariu/components` v3 `Calendar` renders DayPicker's `en-US` default unless a `locale` is passed, so
 * every calendar forwards this value to keep month, weekday, and day-button labels in the active site language.
 * The returned DayPicker locale also carries translated navigation and grid labels, so the calendar's
 * accessible names follow the site language.
 *
 * @param locale - The active next-intl locale code (`en`, `ro`, or `fr`).
 * @returns The matching Calendar locale, or `enUS` for an unsupported code.
 *
 * @example
 * ```tsx
 * const locale = useLocale();
 * <Calendar mode='single' locale={getCalendarLocale(locale)} />;
 * ```
 */
export function getCalendarLocale(locale: string): CalendarLocale {
  return CALENDAR_LOCALES[locale] ?? enUS;
}
