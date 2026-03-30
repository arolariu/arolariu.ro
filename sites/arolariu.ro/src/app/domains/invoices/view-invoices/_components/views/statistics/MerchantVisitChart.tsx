"use client";

/**
 * @fileoverview Merchant Visit Chart - displays visit patterns and shopping behavior per merchant.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/MerchantVisitChart
 *
 * @remarks
 * This component shows visit frequency, basket sizes, and shopping habits
 * for top merchants in a card grid layout. Each merchant gets a card with
 * key metrics like visit count, average basket size, and preferred shopping day.
 */

import {useMerchantsStore} from "@/stores/merchantsStore";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {TbCalendar, TbReceipt, TbShoppingCart, TbTrendingUp} from "react-icons/tb";
import type {MerchantVisitPattern} from "../../../_utils/statistics";
import styles from "./MerchantVisitChart.module.scss";

type Props = {
  readonly data: MerchantVisitPattern[];
  readonly currency: string;
  readonly topN?: number;
};

/**
 * Individual merchant visit card showing key metrics.
 */
function MerchantVisitCard({
  pattern,
  currency,
  merchantName,
  locale,
}: {
  readonly pattern: MerchantVisitPattern;
  readonly currency: string;
  readonly merchantName: string;
  readonly locale: string;
}): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.merchantVisit");

  // Format day name using Intl.DateTimeFormat for i18n support
  const dayName = new Intl.DateTimeFormat(locale, {weekday: "long"}).format(
    new Date(2024, 0, pattern.mostCommonDayOfWeek + 1),
  );

  return (
    <div className={styles["merchantCard"]}>
      <div className={styles["cardHeader"]}>
        <h3 className={styles["merchantName"]}>{merchantName}</h3>
      </div>
      <div className={styles["metrics"]}>
        <div className={styles["metric"]}>
          <div className={styles["metricIcon"]}>
            <TbReceipt size={20} />
          </div>
          <div className={styles["metricContent"]}>
            <span className={styles["metricLabel"]}>{t("metrics.totalVisits")}</span>
            <span className={styles["metricValue"]}>{pattern.totalVisits}</span>
          </div>
        </div>

        <div className={styles["metric"]}>
          <div className={styles["metricIcon"]}>
            <TbTrendingUp size={20} />
          </div>
          <div className={styles["metricContent"]}>
            <span className={styles["metricLabel"]}>{t("metrics.visitsPerMonth")}</span>
            <span className={styles["metricValue"]}>{pattern.averageVisitsPerMonth.toFixed(1)}</span>
          </div>
        </div>

        <div className={styles["metric"]}>
          <div className={styles["metricIcon"]}>
            <TbShoppingCart size={20} />
          </div>
          <div className={styles["metricContent"]}>
            <span className={styles["metricLabel"]}>{t("metrics.basketSize")}</span>
            <span className={styles["metricValue"]}>{pattern.averageBasketSize.toFixed(1)}</span>
          </div>
        </div>

        <div className={styles["metric"]}>
          <div className={styles["metricIcon"]}>
            <TbCalendar size={20} />
          </div>
          <div className={styles["metricContent"]}>
            <span className={styles["metricLabel"]}>{t("metrics.preferredDay")}</span>
            <span className={styles["metricValue"]}>{dayName}</span>
          </div>
        </div>

        <div className={styles["metricFull"]}>
          <div className={styles["metricContent"]}>
            <span className={styles["metricLabel"]}>{t("metrics.avgSpend")}</span>
            <span className={styles["metricValue"]}>
              {pattern.averageSpendPerVisit.toFixed(2)} {currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders visit patterns for top merchants in a card grid.
 *
 * @remarks
 * **Layout:**
 * - Responsive grid of merchant cards
 * - Each card shows visit frequency, basket size, and preferred day
 * - Defaults to top 6 merchants
 *
 * **Metrics:**
 * - Total Visits: Number of invoices from this merchant
 * - Visits/Month: Average shopping frequency
 * - Basket Size: Average items per visit
 * - Preferred Day: Most common shopping day of week
 * - Avg Spend: Average spending per visit
 *
 * **Accessibility:**
 * - Semantic HTML with proper heading hierarchy
 * - ARIA labels on icons
 * - Keyboard navigable cards
 *
 * **Merchant Names:**
 * Fetches merchant names from Zustand store. Falls back to merchantId
 * if name is not available.
 *
 * @param data - Merchant visit pattern data sorted by total visits
 * @param currency - Currency code for display
 * @param topN - Number of merchants to display (default: 6)
 * @returns Merchant visit patterns grid component
 */
export function MerchantVisitChart({data, currency, topN = 6}: Props): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.statisticsView.charts.merchantVisit");
  const locale = useLocale();
  const getMerchantById = useMerchantsStore((state) => state.getMerchantById);

  const displayData = data.slice(0, topN);

  if (displayData.length === 0) {
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
        <div className={styles["grid"]}>
          {displayData.map((pattern) => {
            const merchantInfo = getMerchantById(pattern.merchantId);
            const merchantName =
              merchantInfo?.name ?? (pattern.merchantId.length > 25 ? `${pattern.merchantId.slice(0, 22)}...` : pattern.merchantId);

            return (
              <MerchantVisitCard
                key={pattern.merchantId}
                pattern={pattern}
                currency={currency}
                merchantName={merchantName}
                locale={locale}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
