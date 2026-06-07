"use client";

import {formatDate} from "@/lib/utils.generic";
import {Button, Calendar, Popover, PopoverContent, PopoverTrigger} from "@arolariu/components";
import {useLocale} from "next-intl";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {useCallback, useMemo} from "react";
import {TbCalendar} from "react-icons/tb";
import type {FilterState} from "../../_hooks/useInvoiceFilters";
import {computePresetRange, deriveActivePreset, type DatePresetKey} from "../../_utils/datePresets";
import styles from "./DateFilterCard.module.scss";
import {FilterCardFrame} from "./FilterCardFrame";

type Props = Readonly<{
  readonly filters: FilterState;
  readonly onFiltersChange: (filters: Partial<FilterState>) => void;
}>;

const DATE_PRESETS = ["30d", "90d", "ytd", "all"] as const satisfies ReadonlyArray<DatePresetKey>;

const DATE_INPUT_FORMAT_OPTIONS = {
  locale: "en-CA",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
} as const;

function getDatePresetLabelKey(preset: DatePresetKey): string {
  return preset === "30d" || preset === "90d" ? `value${preset}` : preset;
}

/**
 * Date-range card for invoice filters.
 *
 * @param props - Current filter state and URL-backed filter updater.
 * @returns The rendered date filter card.
 */
export function DateFilterCard({filters, onFiltersChange}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const locale = useLocale();
  const isDateActive = filters.dateFrom !== null || filters.dateTo !== null;
  const activeDatePreset = useMemo(
    () => deriveActivePreset(filters.dateFrom, filters.dateTo, new Date()),
    [filters.dateFrom, filters.dateTo],
  );

  const activeValue = useMemo((): string | null => {
    if (!isDateActive) return null;
    if (activeDatePreset === "30d") return t((m) => m.forms.invoices.filters.datePresets.value30d);
    if (activeDatePreset === "90d") return t((m) => m.forms.invoices.filters.datePresets.value90d);
    if (activeDatePreset === "ytd") return t((m) => m.forms.invoices.filters.datePresets.ytd);
    if (filters.dateFrom && filters.dateTo) return `${formatDate(filters.dateFrom, {locale})} – ${formatDate(filters.dateTo, {locale})}`;
    if (filters.dateFrom) return `≥ ${formatDate(filters.dateFrom, {locale})}`;
    if (filters.dateTo) return `≤ ${formatDate(filters.dateTo, {locale})}`;
    return null;
  }, [activeDatePreset, filters.dateFrom, filters.dateTo, isDateActive, locale, t]);

  const handleDateFromChange = useCallback(
    (date: Date | undefined) => {
      onFiltersChange({dateFrom: date ? formatDate(date, DATE_INPUT_FORMAT_OPTIONS) : null});
    },
    [onFiltersChange],
  );

  const handleDateToChange = useCallback(
    (date: Date | undefined) => {
      onFiltersChange({dateTo: date ? formatDate(date, DATE_INPUT_FORMAT_OPTIONS) : null});
    },
    [onFiltersChange],
  );

  const handlePresetClick = useCallback(
    (preset: DatePresetKey) => {
      const range = computePresetRange(preset, new Date());
      onFiltersChange({dateFrom: range.from, dateTo: range.to});
    },
    [onFiltersChange],
  );

  return (
    <FilterCardFrame
      title={
        <>
          <TbCalendar /> {t((m) => m.forms.invoices.filters.dateRange)}
        </>
      }
      active={isDateActive}
      activeValue={activeValue}
      inactiveLabel={t((m) => m.forms.invoices.filters.anyValue)}>
      <div className={styles["presetRow"]}>
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset}
            type='button'
            aria-pressed={activeDatePreset === preset}
            className={`${styles["presetButton"]} ${activeDatePreset === preset ? styles["presetButtonActive"] : ""}`}
            // eslint-disable-next-line react/jsx-no-bind -- preset is a stable literal from DATE_PRESETS
            onClick={() => handlePresetClick(preset)}>
            {t(selectorFromPath(`forms.invoices.filters.datePresets.${getDatePresetLabelKey(preset)}`))}
          </button>
        ))}
      </div>
      <div className={styles["dateRangeInputs"]}>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant='outline'
                className={styles["dateButton"]}>
                <TbCalendar className={styles["dateIcon"]} />
                {filters.dateFrom ? formatDate(filters.dateFrom, {locale}) : t((m) => m.forms.invoices.filters.dateFrom)}
              </Button>
            }
          />
          <PopoverContent className={styles["calendarPopover"]}>
            <Calendar
              mode='single'
              selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
              onSelect={handleDateFromChange}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant='outline'
                className={styles["dateButton"]}>
                <TbCalendar className={styles["dateIcon"]} />
                {filters.dateTo ? formatDate(filters.dateTo, {locale}) : t((m) => m.forms.invoices.filters.dateTo)}
              </Button>
            }
          />
          <PopoverContent className={styles["calendarPopover"]}>
            <Calendar
              mode='single'
              selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
              onSelect={handleDateToChange}
            />
          </PopoverContent>
        </Popover>
      </div>
    </FilterCardFrame>
  );
}
