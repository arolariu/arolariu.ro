"use client";

/**
 * @fileoverview Spending Calendar Heatmap - GitHub-style daily spending visualization.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/SpendingCalendarHeatmap
 *
 * @remarks
 * This component displays a calendar heatmap showing daily spending intensity
 * over the last 3 months. Each day is represented as a colored square where:
 * - Grey indicates no spending
 * - Green (light to dark) indicates low to high spending intensity
 *
 * **Features:**
 * - Interactive tooltips showing date, amount, and invoice count
 * - Month navigation with arrow buttons
 * - Responsive design with horizontal scroll on mobile
 * - Color scale based on spending percentiles
 * - Day-of-week labels and month labels
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
import {useLocale, useTranslations} from "next-intl";
import {useMemo, useState} from "react";
import {TbChevronLeft, TbChevronRight} from "react-icons/tb";
import type {DailySpending} from "../../../_utils/statistics";
import styles from "./SpendingCalendarHeatmap.module.scss";

type Props = {
  readonly data: DailySpending[];
  readonly currency: string;
};

type DayCell = {
  date: string;
  amount: number;
  invoiceCount: number;
  level: number;
};

type WeekRow = DayCell[];

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
 * Gets the day of week (0=Sunday, 6=Saturday) for a date string.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Day of week number
 */
/**
 * Generates a 3-month calendar grid of spending data.
 *
 * @param data - Array of daily spending data
 * @param monthOffset - Number of months to offset from current month (0 = current)
 * @returns Array of week rows, each containing 7 day cells
 */
function generateCalendarGrid(data: DailySpending[], monthOffset: number): {weeks: WeekRow[]; monthLabel: string} {
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();

  // Get first and last day of the target month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Calculate max spending for level calculation
  const maxSpending = Math.max(...data.map((d) => d.amount), 0);

  // Create a map for quick lookup
  const dataMap = new Map<string, DailySpending>();
  for (const item of data) {
    dataMap.set(item.date, item);
  }

  // Build weeks array
  const weeks: WeekRow[] = [];
  let currentWeek: DayCell[] = [];

  // Add padding for days before the first day of month
  const firstDayOfWeek = firstDay.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({
      date: "",
      amount: 0,
      invoiceCount: 0,
      level: 0,
    });
  }

  // Add all days in the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayData = dataMap.get(dateStr);
    const amount = dayData?.amount ?? 0;
    const invoiceCount = dayData?.invoiceCount ?? 0;
    const level = calculateLevel(amount, maxSpending);

    currentWeek.push({
      date: dateStr,
      amount,
      invoiceCount,
      level,
    });

    // If week is complete (Sunday), push to weeks array
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Add padding for remaining days in last week
  while (currentWeek.length > 0 && currentWeek.length < 7) {
    currentWeek.push({
      date: "",
      amount: 0,
      invoiceCount: 0,
      level: 0,
    });
  }
  if (currentWeek.length === 7) {
    weeks.push(currentWeek);
  }

  const monthLabel = formatDateGeneric(targetMonth, {locale: "en", month: "long", year: "numeric"});

  return {weeks, monthLabel};
}

/**
 * Individual day cell component with tooltip.
 */
function DayCell({day, currency, locale}: {day: DayCell; currency: string; locale: string}): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.calendarHeatmap.tooltip");

  if (!day.date) {
    return <div className={`${styles["dayCell"]} ${styles["dayCellEmpty"]}`} />;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`${styles["dayCell"]} ${getColorClass(day.level)}`}
            role='gridcell'
            aria-label={`${formatDate(day.date, locale)}: ${formatAmount(day.amount)} ${currency}`}
          />
        </TooltipTrigger>
        <TooltipContent className={styles["tooltipContent"]}>
          <div className={styles["tooltipDate"]}>{formatDate(day.date, locale)}</div>
          {day.amount > 0 ? (
            <>
              <div className={styles["tooltipAmount"]}>
                {t("amount")}: {formatAmount(day.amount)} {currency}
              </div>
              <div className={styles["tooltipInvoices"]}>{t("invoices", {count: String(day.invoiceCount)})}</div>
            </>
          ) : (
            <div className={styles["tooltipNoSpending"]}>{t("noSpending")}</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Renders a GitHub-style calendar heatmap showing daily spending intensity.
 *
 * @remarks
 * This component provides a visual overview of spending patterns across days.
 * Users can navigate between months to see historical data. The heatmap uses
 * a color scale to indicate spending intensity, making it easy to spot
 * high-spending days at a glance.
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
 * @returns Calendar heatmap JSX element
 */
export default function SpendingCalendarHeatmap({data, currency}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.calendarHeatmap");
  const locale = useLocale();
  const [monthOffset, setMonthOffset] = useState(0);

  const {weeks, monthLabel} = useMemo(() => generateCalendarGrid(data, monthOffset), [data, monthOffset]);

  const dayLabels = [t("days.sun"), t("days.mon"), t("days.tue"), t("days.wed"), t("days.thu"), t("days.fri"), t("days.sat")];

  const handlePreviousMonth = (): void => {
    setMonthOffset((prev) => prev + 1);
  };

  const handleNextMonth = (): void => {
    setMonthOffset((prev) => Math.max(0, prev - 1));
  };

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <div className={styles["headerRow"]}>
          <div>
            <CardTitle className={styles["cardTitle"]}>{t("title")}</CardTitle>
            <CardDescription className={styles["cardDescription"]}>{t("description")}</CardDescription>
          </div>
          <div className={styles["navigationButtons"]}>
            <button
              onClick={handlePreviousMonth}
              className={styles["navButton"]}
              aria-label={t("navigation.previous")}
              type='button'>
              <TbChevronLeft size={20} />
            </button>
            <span className={styles["monthLabel"]}>{monthLabel}</span>
            <button
              onClick={handleNextMonth}
              className={styles["navButton"]}
              disabled={monthOffset === 0}
              aria-label={t("navigation.next")}
              type='button'>
              <TbChevronRight size={20} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <div
          className={styles["calendarContainer"]}
          role='grid'
          aria-label={t("aria.calendarGrid")}>
          {/* Day of week labels */}
          <div className={styles["dayLabelsColumn"]}>
            <div className={styles["dayLabelEmpty"]} />
            {dayLabels.map((label, idx) => (
              <div
                key={`day-label-${idx}`}
                className={styles["dayLabel"]}>
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className={styles["weeksContainer"]}>
            {weeks.map((week, weekIdx) => (
              <div
                key={`week-${weekIdx}`}
                className={styles["weekRow"]}
                role='row'>
                {week.map((day, dayIdx) => (
                  <DayCell
                    key={`day-${weekIdx}-${dayIdx}`}
                    day={day}
                    currency={currency}
                    locale={locale}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className={styles["legend"]}>
          <span className={styles["legendLabel"]}>{t("legend.less")}</span>
          <div className={styles["legendColors"]}>
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={`legend-${level}`}
                className={`${styles["legendCell"]} ${getColorClass(level)}`}
                aria-label={`Level ${level}`}
              />
            ))}
          </div>
          <span className={styles["legendLabel"]}>{t("legend.more")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
