"use client";

/**
 * @fileoverview Merchant Trends Chart - displays spending trends for top merchants over time.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/MerchantTrendsChart
 *
 * @remarks
 * This component visualizes monthly spending patterns for top merchants using
 * a simple table layout with inline bar visualizations (sparkline style).
 * Avoids complex charting libraries in favor of clean, accessible HTML/CSS.
 */

import {formatAmount} from "@/lib/utils.generic";
import {useMerchantsStore} from "@/stores/merchantsStore";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {useCallback, useMemo} from "react";
import type {MerchantTrend} from "../../../_utils/statistics";
import styles from "./MerchantTrendsChart.module.scss";

type Props = {
  readonly data: MerchantTrend[];
  readonly currency: string;
};

type MonthTooltipProps = {
  readonly monthLabel: string;
  readonly amountLabel: string;
};

/**
 * Custom tooltip for a single month's spending in the merchant trends sparkline.
 *
 * @param monthLabel - Formatted month label (e.g., "Jan '25")
 * @param amountLabel - Formatted amount with currency (e.g., "234.19 lei")
 * @returns The rendered tooltip.
 */
function MonthTooltip({monthLabel, amountLabel}: Readonly<MonthTooltipProps>): React.JSX.Element {
  return (
    <div
      role='tooltip'
      className={styles["barTooltip"]}>
      <span className={styles["barTooltipMonth"]}>{monthLabel}</span>
      <span className={styles["barTooltipAmount"]}>{amountLabel}</span>
    </div>
  );
}

/**
 * Formats a month key (YYYY-MM) into a short display format.
 *
 * @param monthKey - Month key in YYYY-MM format
 * @param locale - Locale string for formatting (e.g., "en-US", "ro-RO")
 * @returns Formatted month label (e.g., "Jan '25")
 */
function formatMonthLabel(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  const monthLabel = new Intl.DateTimeFormat(locale, {month: "short"}).format(date);
  const yearShort = year?.slice(-2);
  return `${monthLabel} '${yearShort}`;
}

/**
 * Renders spending trends for top merchants over time.
 *
 * @remarks
 * **Layout:**
 * - Table with merchant name, total spend, and monthly bars
 * - Each bar represents one month's spending
 * - Bar height scaled relative to max monthly amount across all merchants
 *
 * **Accessibility:**
 * - Semantic table structure with proper headers
 * - ARIA labels on visual elements
 * - Keyboard navigable
 *
 * **Merchant Names:**
 * Fetches merchant names from Zustand store. Falls back to merchantId
 * if name is not available.
 *
 * @param data - Merchant trend data sorted by total spend
 * @param currency - Currency code for display
 * @returns Merchant trends visualization component
 */
export function MerchantTrendsChart({data, currency}: Props): React.JSX.Element {
  const t = useTranslations();
  const locale = useLocale();
  const getMerchantById = useMerchantsStore((state) => state.getEntityById);

  // Find max monthly amount for scaling
  const maxMonthlyAmount = useMemo(() => {
    let max = 0;
    for (const merchant of data) {
      for (const month of merchant.monthlyData) {
        if (month.amount > max) {
          max = month.amount;
        }
      }
    }
    return max;
  }, [data]);

  // Collect all unique months across all merchants
  const allMonthKeys = useMemo(() => {
    const monthSet = new Set<string>();
    for (const merchant of data) {
      for (const month of merchant.monthlyData) {
        monthSet.add(month.monthKey);
      }
    }
    return Array.from(monthSet).toSorted((a, b) => a.localeCompare(b));
  }, [data]);

  // Show only last 6 months for readability
  const displayMonths = allMonthKeys.slice(-6);

  /**
   * Render-prop adapter that builds the month tooltip for a given bar. Mirrors
   * the `renderTooltip` pattern used in `MerchantLeaderboard`, keeping tooltip
   * markup in a single dedicated component.
   */
  const renderTooltip = useCallback(
    (monthLabel: string, amountLabel: string) => (
      <MonthTooltip
        monthLabel={monthLabel}
        amountLabel={amountLabel}
      />
    ),
    [],
  );

  if (data.length === 0) {
    return (
      <Card className={styles["card"]}>
        <CardHeader>
          <CardTitle>{t((m) => m.cards.invoices.statistics.merchantTrends.title)}</CardTitle>
          <CardDescription>{t((m) => m.cards.invoices.statistics.merchantTrends.description)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className={styles["emptyState"]}>{t((m) => m.cards.invoices.statistics.merchantTrends.empty)}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={styles["card"]}>
      <CardHeader>
        <CardTitle>{t((m) => m.cards.invoices.statistics.merchantTrends.title)}</CardTitle>
        <CardDescription>{t((m) => m.cards.invoices.statistics.merchantTrends.description)}</CardDescription>
      </CardHeader>
      <CardContent className={styles["content"]}>
        <div className={styles["tableWrapper"]}>
          <table className={styles["table"]}>
            <thead>
              <tr>
                <th className={styles["headerMerchant"]}>{t((m) => m.cards.invoices.statistics.merchantTrends.labels.merchant)}</th>
                <th className={styles["headerTrend"]}>{t((m) => m.cards.invoices.statistics.merchantTrends.labels.trend)}</th>
                <th className={styles["headerTotal"]}>{t((m) => m.cards.invoices.statistics.merchantTrends.labels.totalSpend)}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((merchant) => {
                const merchantInfo = getMerchantById(merchant.merchantId);
                const merchantName =
                  merchantInfo?.name ?? (merchant.merchantId.length > 20 ? `${merchant.merchantId.slice(0, 17)}...` : merchant.merchantId);

                // Create a map for quick lookup
                const monthlyMap = new Map(merchant.monthlyData.map((m) => [m.monthKey, m.amount]));

                return (
                  <tr
                    key={merchant.merchantId}
                    className={styles["row"]}>
                    <td className={styles["cellMerchant"]}>
                      <span className={styles["merchantName"]}>{merchantName}</span>
                    </td>
                    <td className={styles["cellTrend"]}>
                      <div
                        className={styles["sparkline"]}
                        aria-label={t((m) => m.cards.invoices.statistics.merchantTrends.aria.sparkline, {merchant: merchantName})}>
                        {displayMonths.map((monthKey) => {
                          const amount = monthlyMap.get(monthKey) ?? 0;
                          const heightPercent = maxMonthlyAmount > 0 ? (amount / maxMonthlyAmount) * 100 : 0;
                          const monthLabel = formatMonthLabel(monthKey, locale);
                          const amountLabel = `${formatAmount(amount)} ${currency}`;

                          return (
                            <div
                              key={monthKey}
                              className={styles["bar"]}
                              aria-label={`${monthLabel}: ${amountLabel}`}>
                              <div
                                className={styles["barFill"]}
                                style={{height: `${heightPercent}%`}}
                              />
                              {renderTooltip(monthLabel, amountLabel)}
                            </div>
                          );
                        })}
                      </div>
                      <div className={styles["monthLabels"]}>
                        {displayMonths.map((monthKey) => (
                          <span
                            key={monthKey}
                            className={styles["monthLabel"]}>
                            {formatMonthLabel(monthKey, locale)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={styles["cellTotal"]}>
                      <span className={styles["totalAmount"]}>
                        {formatAmount(merchant.totalSpend)} {currency}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
