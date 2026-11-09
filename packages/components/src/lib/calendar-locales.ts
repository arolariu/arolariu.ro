/**
 * @fileoverview Translated DayPicker locales for the Calendar and CalendarDayButton `locale` prop.
 * @module packages/components/lib/calendar-locales
 *
 * @remarks
 * Re-exports `react-day-picker/locale`: every date-fns locale, extended with DayPicker's translated navigation, dropdown, grid and
 * day-button labels where DayPicker ships them. Consumers import locales from this subpath instead of depending on `date-fns` or
 * `react-day-picker` directly, so the locale data always matches the DayPicker version the Calendar renders.
 *
 * This subpath is intentionally not re-exported from the package root: it exposes one named export per locale, and named subpath
 * imports keep every unused locale out of consumer bundles.
 *
 * @example
 * ```tsx
 * import {Calendar} from "@arolariu/components/calendar";
 * import {enUS, fr, ro} from "@arolariu/components/calendar-locales";
 *
 * const calendarLocales = {en: enUS, fr, ro};
 *
 * <Calendar mode='single' locale={calendarLocales[language] ?? enUS} />;
 * ```
 *
 * @see {@link https://daypicker.dev/docs/localization | DayPicker localization}
 */

import type {DayPickerLocale} from "react-day-picker/locale";

export * from "react-day-picker/locale";

/**
 * A translated DayPicker locale accepted by the Calendar and CalendarDayButton `locale` prop.
 *
 * @remarks
 * Alias of DayPicker's `DayPickerLocale`: a date-fns locale plus the optional DayPicker `labels` used for accessible names.
 */
export type CalendarLocale = DayPickerLocale;
