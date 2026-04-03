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
import {useLocale, useTranslations} from "next-intl";
import {useMemo} from "react";
import type {MerchantTrend} from "../../../_utils/statistics";
import styles from "./MerchantTrendsChart.module.scss";

type Props = {
  readonly data: MerchantTrend[];
  readonly currency: string;
};

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
  const t = useTranslations("IMS--Stats.merchantTrends");
  const locale = useLocale();
  const getMerchantById = useMerchantsStore((state) => state.getMerchantById);

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
    return Array.from(monthSet).toSorted();
  }, [data]);

  // Show only last 6 months for readability
  const displayMonths = allMonthKeys.slice(-6);

  if (data.length === 0) {
    return (
      <Card className={styles["card"]}>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className={styles["emptyState"]}>{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={styles["card"]}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className={styles["content"]}>
        <div className={styles["tableWrapper"]}>
          <table className={styles["table"]}>
            <thead>
              <tr>
                <th className={styles["headerMerchant"]}>{t("labels.merchant")}</th>
                <th className={styles["headerTotal"]}>{t("labels.totalSpend")}</th>
                <th className={styles["headerTrend"]}>{t("labels.trend")}</th>
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
                    <td className={styles["cellTotal"]}>
                      <span className={styles["totalAmount"]}>
                        {formatAmount(merchant.totalSpend)} {currency}
                      </span>
                    </td>
                    <td className={styles["cellTrend"]}>
                      <div
                        className={styles["sparkline"]}
                        aria-label={t("aria.sparkline", {merchant: merchantName})}>
                        {displayMonths.map((monthKey) => {
                          const amount = monthlyMap.get(monthKey) ?? 0;
                          const heightPercent = maxMonthlyAmount > 0 ? (amount / maxMonthlyAmount) * 100 : 0;

                          return (
                            <div
                              key={monthKey}
                              className={styles["bar"]}
                              title={`${formatMonthLabel(monthKey, locale)}: ${formatAmount(amount)} ${currency}`}
                              aria-label={`${formatMonthLabel(monthKey, locale)}: ${formatAmount(amount)} ${currency}`}>
                              <div
                                className={styles["barFill"]}
                                style={{height: `${heightPercent}%`}}
                              />
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
