"use client";

/**
 * @fileoverview Spending Calendar Heatmap - yearly spending calendar visualization.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/SpendingCalendarHeatmap
 *
 * @remarks
 * This component displays a full year as twelve traditional month calendars,
 * where each numbered day is shaded by its spending intensity:
 * - Grey indicates no spending
 * - Green (light to dark) indicates low to high spending intensity
 *
 * **Features:**
 * - Interactive tooltips showing date, amount, and invoice count
 * - Year navigation with arrow buttons
 * - Twelve numbered month grids (Jan→Dec) laid out as a responsive grid
 * - Color scale based on spending percentiles
 * - Day-of-week column headers per month
 *
 * **Color Scale:**
 * Uses the `--success` CSS variable (green: `hsl(142 71% 35%)`) with opacity levels:
 * - Level 0: Grey (no spending) - `color('muted')` with opacity 0.3
 * - Level 1 (1-25%): Light green - `color('success')` with opacity 0.3
 * - Level 2 (25-50%): Medium-light green - `color('success')` with opacity 0.5
 * - Level 3 (50-75%): Medium-dark green - `color('success')` with opacity 0.75
 * - Level 4 (75-100%): Dark green - `color('success')` with opacity 1.0
 */

import {formatAmount, formatDate as formatDateGeneric} from "@/lib/utils.generic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {useCallback, useMemo, useState} from "react";
import {TbChevronLeft, TbChevronRight} from "react-icons/tb";
import type {DailySpending} from "../../../_utils/statistics";
import styles from "./SpendingCalendarHeatmap.module.scss";

type Props = {
  readonly data: DailySpending[];
  readonly currency: string;
};

type DayCell = {
  date: string;
  dayNumber: number;
  amount: number;
  invoiceCount: number;
  level: number;
};

type WeekRow = DayCell[];

type MonthGrid = {
  monthLabel: string;
  weeks: WeekRow[];
};

/**
 * Gets color class based on spending intensity level (0-4).
 *
 * @param level - Intensity level from 0 (no spending) to 4 (highest spending)
 * @returns CSS class name for the color
 */
function getColorClass(level: number): string {
  switch (level) {
    case 0:
      return styles["levelEmpty"] ?? "";
    case 1:
      return styles["level1"] ?? "";
    case 2:
      return styles["level2"] ?? "";
    case 3:
      return styles["level3"] ?? "";
    case 4:
      return styles["level4"] ?? "";
    default:
      return styles["levelEmpty"] ?? "";
  }
}

/**
 * Calculates the spending intensity level based on amount and max spending.
 *
 * @param amount - Daily spending amount
 * @param maxSpending - Maximum daily spending across all days
 * @returns Intensity level from 0 (no spending) to 4 (highest spending)
 */
function calculateLevel(amount: number, maxSpending: number): number {
  if (amount === 0 || maxSpending === 0) return 0;
  const percentage = (amount / maxSpending) * 100;
  if (percentage <= 25) return 1;
  if (percentage <= 50) return 2;
  if (percentage <= 75) return 3;
  return 4;
}

/**
 * Formats a date string (YYYY-MM-DD) to a localized date display.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @param locale - Locale for formatting (e.g., "en", "ro")
 * @returns Formatted date string
 */
function formatDate(dateStr: string, locale: string): string {
  return formatDateGeneric(dateStr, {
    locale,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Builds the Mon→Sun week rows for a single month.
 *
 * @param year - Calendar year
 * @param month - Zero-based month index (0 = January)
 * @param dataMap - Lookup of daily spending keyed by `YYYY-MM-DD`
 * @param maxSpending - Maximum daily spend across the year, used for intensity levels
 * @returns The month label and its week rows
 */
function buildMonthGrid(year: number, month: number, dataMap: Map<string, DailySpending>, maxSpending: number): MonthGrid {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const emptyCell = (): DayCell => ({date: "", dayNumber: 0, amount: 0, invoiceCount: 0, level: 0});

  const weeks: WeekRow[] = [];
  let currentWeek: DayCell[] = [];

  // Pad days before the first of the month so weeks line up Mon→Sun.
  // `getDay()` is 0=Sun..6=Sat; shift so Monday becomes the first column.
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(emptyCell());
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayData = dataMap.get(dateStr);
    const amount = dayData?.amount ?? 0;
    const invoiceCount = dayData?.invoiceCount ?? 0;
    const level = calculateLevel(amount, maxSpending);

    currentWeek.push({date: dateStr, dayNumber: day, amount, invoiceCount, level});

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  while (currentWeek.length > 0 && currentWeek.length < 7) {
    currentWeek.push(emptyCell());
  }
  if (currentWeek.length === 7) {
    weeks.push(currentWeek);
  }

  const monthLabel = formatDateGeneric(firstDay, {locale: "en", month: "long"});

  return {monthLabel, weeks};
}

/**
 * Generates the twelve month grids for a full year of spending data.
 *
 * @param data - Array of daily spending data
 * @param yearOffset - Number of years to offset from the current year (0 = current)
 * @returns The twelve month grids and the year label
 */
function generateYearGrid(data: DailySpending[], yearOffset: number): {months: MonthGrid[]; periodLabel: string} {
  const now = new Date();
  const targetYear = now.getFullYear() - yearOffset;

  // Calculate max spending across the whole year for consistent level shading.
  const maxSpending = Math.max(...data.map((d) => d.amount), 0);

  const dataMap = new Map<string, DailySpending>();
  for (const item of data) {
    dataMap.set(item.date, item);
  }

  const months: MonthGrid[] = [];
  for (let month = 0; month < 12; month++) {
    months.push(buildMonthGrid(targetYear, month, dataMap, maxSpending));
  }

  return {months, periodLabel: String(targetYear)};
}

/**
 * Individual day cell component with tooltip.
 */
function DayCell({day, currency, locale}: Readonly<{day: DayCell; currency: string; locale: string}>): React.JSX.Element {
  const t = useTranslations();

  if (!day.date) {
    return <div className={`${styles["dayCell"]} ${styles["dayCellEmpty"]}`} />;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger
          render={
            <div
              className={`${styles["dayCell"]} ${getColorClass(day.level)}`}
              role='gridcell'
              aria-label={`${formatDate(day.date, locale)}: ${formatAmount(day.amount)} ${currency}`}>
              <span className={styles["dayNumber"]}>{day.dayNumber}</span>
            </div>
          }
        />
        <TooltipContent className={styles["tooltipContent"]}>
          <div className={styles["tooltipDate"]}>{formatDate(day.date, locale)}</div>
          {day.amount > 0 ? (
            <>
              <div className={styles["tooltipAmount"]}>
                {t((m) => m.cards.invoices.statistics.calendarHeatmap.tooltip.amount)}: {formatAmount(day.amount)} {currency}
              </div>
              <div className={styles["tooltipInvoices"]}>
                {t((m) => m.cards.invoices.statistics.calendarHeatmap.tooltip.invoices, {count: String(day.invoiceCount)})}
              </div>
            </>
          ) : (
            <div className={styles["tooltipNoSpending"]}>{t((m) => m.cards.invoices.statistics.calendarHeatmap.tooltip.noSpending)}</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Renders a yearly spending calendar as twelve month grids.
 *
 * @remarks
 * This component provides a visual overview of spending patterns across a full
 * year. Users can navigate between years to see historical data. Each day cell
 * is shaded by spending intensity, making high-spending days easy to spot.
 *
 * **Accessibility:**
 * - Semantic HTML with proper ARIA labels
 * - Keyboard navigation support through native button elements
 * - Screen reader friendly with descriptive labels
 *
 * **Performance:**
 * - Grid computation is memoized to prevent unnecessary recalculations
 * - Efficient data structure using Map for O(1) lookups
 *
 * @param data - Array of daily spending data
 * @param currency - Currency code for display
 * @returns Yearly calendar JSX element
 */
export default function SpendingCalendarHeatmap({data, currency}: Props): React.JSX.Element {
  const t = useTranslations();
  const locale = useLocale();
  const [yearOffset, setYearOffset] = useState(0);

  const {months, periodLabel} = useMemo(() => generateYearGrid(data, yearOffset), [data, yearOffset]);

  const dayLabels = [
    t((m) => m.cards.invoices.statistics.calendarHeatmap.days.mon),
    t((m) => m.cards.invoices.statistics.calendarHeatmap.days.tue),
    t((m) => m.cards.invoices.statistics.calendarHeatmap.days.wed),
    t((m) => m.cards.invoices.statistics.calendarHeatmap.days.thu),
    t((m) => m.cards.invoices.statistics.calendarHeatmap.days.fri),
    t((m) => m.cards.invoices.statistics.calendarHeatmap.days.sat),
    t((m) => m.cards.invoices.statistics.calendarHeatmap.days.sun),
  ];

  /** Navigates to the previous year in the calendar. */
  const handlePreviousYear = useCallback((): void => {
    setYearOffset((prev) => prev + 1);
  }, []);

  /** Navigates to the next year in the calendar (bounded at the current year). */
  const handleNextYear = useCallback((): void => {
    setYearOffset((prev) => Math.max(0, prev - 1));
  }, []);

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <div className={styles["headerRow"]}>
          <div>
            <CardTitle className={styles["cardTitle"]}>{t((m) => m.cards.invoices.statistics.calendarHeatmap.title)}</CardTitle>
            <CardDescription className={styles["cardDescription"]}>
              {t((m) => m.cards.invoices.statistics.calendarHeatmap.description)}
            </CardDescription>
          </div>
          <div className={styles["navigationButtons"]}>
            <button
              onClick={handlePreviousYear}
              className={styles["navButton"]}
              aria-label={t((m) => m.cards.invoices.statistics.calendarHeatmap.navigation.previous)}
              type='button'>
              <TbChevronLeft size={20} />
            </button>
            <span className={styles["monthLabel"]}>{periodLabel}</span>
            <button
              onClick={handleNextYear}
              className={styles["navButton"]}
              disabled={yearOffset === 0}
              aria-label={t((m) => m.cards.invoices.statistics.calendarHeatmap.navigation.next)}
              type='button'>
              <TbChevronRight size={20} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <div className={styles["yearGrid"]}>
          {months.map((month) => (
            <section
              key={month.monthLabel}
              className={styles["monthCard"]}
              aria-label={month.monthLabel}>
              <h3 className={styles["monthTitle"]}>{month.monthLabel}</h3>
              <div
                className={styles["calendarContainer"]}
                role='grid'
                aria-label={month.monthLabel}>
                {/* Day of week header row */}
                <div
                  className={styles["weekdayHeader"]}
                  role='row'>
                  {dayLabels.map((label) => (
                    <div
                      key={label}
                      className={styles["weekdayLabel"]}
                      role='columnheader'>
                      {label.charAt(0)}
                    </div>
                  ))}
                </div>

                {/* Calendar weeks */}
                <div className={styles["weeksContainer"]}>
                  {month.weeks.map((week, weekIdx) => (
                    <div
                      key={`${month.monthLabel}-week-${weekIdx}`}
                      className={styles["weekRow"]}
                      role='row'>
                      {week.map((day) => (
                        <DayCell
                          key={day.date ? day.date : `${month.monthLabel}-empty-${weekIdx}-${week.indexOf(day)}`}
                          day={day}
                          currency={currency}
                          locale={locale}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Legend */}
        <div className={styles["legend"]}>
          <span className={styles["legendLabel"]}>{t((m) => m.cards.invoices.statistics.calendarHeatmap.legend.less)}</span>
          <div className={styles["legendColors"]}>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={`legend-${level}`}
                className={`${styles["legendCell"]} ${getColorClass(level)}`}
                aria-label={`Level ${level}`}
              />
            ))}
          </div>
          <span className={styles["legendLabel"]}>{t((m) => m.cards.invoices.statistics.calendarHeatmap.legend.more)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
