"use client";

import {toRON} from "@/lib/currency";
import {formatCurrency, toSafeDate} from "@/lib/utils.generic";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useLocale, type TranslationValues} from "next-intl";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {useMemo} from "react";
import {TbBulb, TbShoppingBag, TbSparkles, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./SeasonalInsightsCard.module.scss";

type Insight = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  type: "info" | "warning" | "success";
};

type SeasonalTranslateFn = (key: string, values?: TranslationValues) => string;

/**
 * Calculates canonical GPC group spending totals from invoice items.
 */
function calculateCategorySpending(invoice: Invoice): Map<string, {label: string; amount: number}> {
  const categorySpending = new Map<string, {label: string; amount: number}>();
  for (const item of invoice.items) {
    const group =
      item.classification?.hierarchy.find((node) => node.level.toLocaleLowerCase("en-US") === "segment")
      ?? item.classification?.hierarchy.find((node) => node.level.toLocaleLowerCase("en-US") === "family")
      ?? item.classification?.hierarchy[0];
    const key = group === undefined || item.classification === null ? "unclassified" : `${item.classification.system}:${group.code}`;
    const existing = categorySpending.get(key) ?? {label: group?.officialLabel ?? "Unclassified", amount: 0};
    categorySpending.set(key, {...existing, amount: existing.amount + item.totalPrice});
  }
  return categorySpending;
}

/**
 * Calculate historical average spending by category from real invoices.
 */
function calculateHistoricalAverage(invoices: ReadonlyArray<Invoice>): Map<string, {total: number; count: number}> {
  const historicalAvg = new Map<string, {total: number; count: number}>();

  for (const inv of invoices) {
    for (const item of inv.items) {
      if (item.metadata.isSoftDeleted) {
        // Skip soft-deleted items
      } else {
        const group =
          item.classification?.hierarchy.find((node) => node.level.toLocaleLowerCase("en-US") === "segment")
          ?? item.classification?.hierarchy.find((node) => node.level.toLocaleLowerCase("en-US") === "family")
          ?? item.classification?.hierarchy[0];
        const key = group === undefined || item.classification === null ? "unclassified" : `${item.classification.system}:${group.code}`;
        const existing = historicalAvg.get(key) ?? {total: 0, count: 0};
        historicalAvg.set(key, {total: existing.total + item.totalPrice, count: existing.count + 1});
      }
    }
  }
  return historicalAvg;
}

/**
 * Detect spending spikes compared to historical averages.
 */
function detectSpendingSpikes(
  categorySpending: ReadonlyMap<string, {label: string; amount: number}>,
  historicalAvg: ReadonlyMap<string, {total: number; count: number}>,
  translate: SeasonalTranslateFn,
): Insight[] {
  const insights: Insight[] = [];
  for (const [classificationKey, data] of categorySpending.entries()) {
    const avg = historicalAvg.get(classificationKey);
    const hasValidAverage = avg && avg.count > 0;

    if (hasValidAverage) {
      const avgAmount = avg.total / avg.count;
      const percentChange = ((data.amount - avgAmount) / avgAmount) * 100;
      const isSignificantSpike = percentChange > 100;

      if (isSignificantSpike) {
        insights.push({
          id: `spike-${classificationKey}`,
          icon: <TbTrendingUp className={styles["iconSm"]} />,
          title: translate("insights.spike.title", {category: data.label}),
          description: translate("insights.spike.description", {percent: percentChange.toFixed(0)}),
          type: "warning",
        });
      }
    }
  }
  return insights;
}

/**
 * Get December-specific seasonal insights.
 */
function getDecemberInsights(date: Date, translate: SeasonalTranslateFn): Insight[] {
  const insights: Insight[] = [
    {
      id: "holiday-season",
      icon: <TbSparkles className={styles["iconSm"]} />,
      title: translate("insights.holidaySeason.title"),
      description: translate("insights.holidaySeason.description"),
      type: "info",
    },
  ];

  const isEarlyDecember = date.getDate() < 15;
  if (isEarlyDecember) {
    insights.push({
      id: "stock-up-tip",
      icon: <TbBulb className={styles["iconSm"]} />,
      title: translate("insights.stockUpTip.title"),
      description: translate("insights.stockUpTip.description"),
      type: "success",
    });
  }
  return insights;
}

/**
 * Get the default insight when no specific patterns are detected.
 */
function getDefaultInsight(translate: SeasonalTranslateFn): Insight {
  return {
    id: "normal-pattern",
    icon: <TbShoppingBag className={styles["iconSm"]} />,
    title: translate("insights.normalPattern.title"),
    description: translate("insights.normalPattern.description"),
    type: "success",
  };
}

function detectSeasonalInsights(invoice: Invoice, allInvoices: ReadonlyArray<Invoice>, translate: SeasonalTranslateFn): Insight[] {
  const insights: Insight[] = [];
  const date = toSafeDate(invoice.paymentInformation.transactionDate);
  const month = date.getMonth();

  const categorySpending = calculateCategorySpending(invoice);
  const historicalAvg = calculateHistoricalAverage(allInvoices);
  const spendingSpikes = detectSpendingSpikes(categorySpending, historicalAvg, translate);
  insights.push(...spendingSpikes);

  const isDecember = month === 11;
  if (isDecember) {
    const decemberInsights = getDecemberInsights(date, translate);
    insights.push(...decemberInsights);
  }

  if (insights.length === 0) {
    insights.push(getDefaultInsight(translate));
  }

  return insights.slice(0, 3);
}

/**
 * Get the SCSS module class for an insight container based on its type.
 */
function getInsightContainerClass(type: Insight["type"]): string {
  if (type === "warning") return styles["insightWarning"] ?? "";
  if (type === "success") return styles["insightSuccess"] ?? "";
  return styles["insightInfo"] ?? "";
}

/**
 * Get the SCSS module class for an insight icon based on its type.
 */
function getInsightIconClass(type: Insight["type"]): string {
  if (type === "warning") return styles["insightIconWarning"] ?? "";
  if (type === "success") return styles["insightIconSuccess"] ?? "";
  return styles["insightIconInfo"] ?? "";
}

export function SeasonalInsightsCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations();
  const translate = useMemo<SeasonalTranslateFn>(
    () => (key, values) => t(selectorFromPath(`cards.invoices.seasonalInsightsCard.${key}`), values),
    [t],
  );
  const {invoice} = useInvoiceContext();
  const allInvoices = useInvoicesStore((state) => state.entities);
  const date = toSafeDate(invoice.paymentInformation.transactionDate);
  const monthName = new Intl.DateTimeFormat(locale, {month: "long"}).format(date);
  const {currency} = invoice.paymentInformation;

  // Calculate real seasonal spending data
  const seasonalData = useMemo(() => {
    const {transactionDate, totalCostAmount, currency: paymentCurrency} = invoice.paymentInformation;
    const currentDate = toSafeDate(transactionDate);
    const currentMonth = currentDate.getMonth();

    // Find invoices from the same month (any year), excluding the current invoice
    const sameMonthInvoices = allInvoices.filter((inv) => {
      if (inv.id === invoice.id) return false;
      const invDate = toSafeDate(inv.paymentInformation.transactionDate);
      return invDate.getMonth() === currentMonth && invDate.getTime() > 0;
    });

    // Compute average spending for this month
    let totalSpending = 0;
    for (const inv of sameMonthInvoices) {
      const year = toSafeDate(inv.paymentInformation.transactionDate).getFullYear();
      totalSpending += toRON(inv.paymentInformation.totalCostAmount, inv.paymentInformation.currency?.code ?? "RON", year);
    }

    const monthAverage = sameMonthInvoices.length > 0 ? totalSpending / sameMonthInvoices.length : 0;

    // Current invoice amount in RON
    const currentYear = currentDate.getFullYear();
    const currentAmount = toRON(totalCostAmount, paymentCurrency?.code ?? "RON", currentYear);

    const percentOfAverage = monthAverage > 0 ? (currentAmount / monthAverage) * 100 : 0;

    return {
      monthAverage: Math.round(monthAverage),
      currentAmount: Math.round(currentAmount),
      percentOfAverage: Math.round(percentOfAverage),
      invoiceCount: sameMonthInvoices.length,
    };
  }, [invoice, allInvoices]);

  const insights = useMemo(() => detectSeasonalInsights(invoice, allInvoices, translate), [invoice, allInvoices, translate]);

  // If we don't have enough historical data, show a placeholder
  const hasInsufficientData = allInvoices.length < 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className={styles["titleRow"]}>
            <TbSparkles className={styles["titleIcon"]} />
            {t((m) => m.cards.invoices.seasonalInsightsCard.title)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasInsufficientData ? (
          <div className={styles["contentSpaced"]}>
            <div className={styles["insightsList"]}>
              <div className={`${styles["insightItem"]} ${styles["insightInfo"]}`}>
                <div className={`${styles["insightIconWrapper"]} ${styles["insightIconInfo"]}`}>
                  <TbBulb className={styles["iconSm"]} />
                </div>
                <div className={styles["insightContent"]}>
                  <p className={styles["insightTitle"]}>
                    {t((m) => m.cards.invoices.seasonalInsightsCard.insights.insufficientData.title)}
                  </p>
                  <p className={styles["insightDescription"]}>
                    {t((m) => m.cards.invoices.seasonalInsightsCard.insights.insufficientData.description)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles["contentSpaced"]}>
            {/* Month comparison */}
            <div className={styles["monthSection"]}>
              <div className={styles["monthRow"]}>
                <span className={styles["monthLabel"]}>
                  {t((m) => m.cards.invoices.seasonalInsightsCard.month.spendingSoFar, {month: monthName})}
                </span>
                <span className={styles["monthValue"]}>
                  {formatCurrency(seasonalData.currentAmount, {currencyCode: currency.code, locale})}
                </span>
              </div>
              <Progress value={seasonalData.percentOfAverage} />
              <div className={styles["monthMeta"]}>
                <span>
                  {t((m) => m.cards.invoices.seasonalInsightsCard.month.vsAverage, {
                    month: monthName,
                    amount: formatCurrency(seasonalData.monthAverage, {currencyCode: currency.code, locale}),
                  })}
                </span>
                <span>{seasonalData.percentOfAverage.toFixed(0)}%</span>
              </div>
            </div>

            {/* Insights list */}
            <div className={styles["insightsList"]}>
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`${styles["insightItem"]} ${getInsightContainerClass(insight.type)}`}>
                  <div className={`${styles["insightIconWrapper"]} ${getInsightIconClass(insight.type)}`}>{insight.icon}</div>
                  <div className={styles["insightContent"]}>
                    <p className={styles["insightTitle"]}>{insight.title}</p>
                    <p className={styles["insightDescription"]}>{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
