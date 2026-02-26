"use client";

import {generateRandomInvoices} from "@/data/mocks/invoice";
import {formatCurrency, formatEnum} from "@/lib/utils.generic";
import {ProductCategory, type Invoice} from "@/types/invoices";
import {Card, CardContent, CardHeader, CardTitle, Progress} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
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

/**
 * Calculate category spending totals from invoice items.
 */
function calculateCategorySpending(invoice: Invoice): Record<ProductCategory, number> {
  const categorySpending: Record<ProductCategory, number> = {} as Record<ProductCategory, number>;
  for (const item of invoice.items) {
    categorySpending[item.category] = (categorySpending[item.category] || 0) + item.totalPrice;
  }
  return categorySpending;
}

/**
 * Calculate historical average spending by category.
 */
function calculateHistoricalAverage(): Record<ProductCategory, {total: number; count: number}> {
  const historicalInvoices: Invoice[] = generateRandomInvoices(50);
  const historicalAvg: Record<ProductCategory, {total: number; count: number}> = {} as Record<
    ProductCategory,
    {total: number; count: number}
  >;
  for (const inv of historicalInvoices) {
    for (const [cat, amount] of Object.entries(inv.items)) {
      const category = Number.parseInt(cat, 10) as ProductCategory;
      if (!historicalAvg[category]) {
        historicalAvg[category] = {total: 0, count: 0};
      }
      historicalAvg[category].total += amount.totalPrice;
      historicalAvg[category].count += 1;
    }
  }
  return historicalAvg;
}

/**
 * Detect spending spikes compared to historical averages.
 */
function detectSpendingSpikes(
  categorySpending: Record<ProductCategory, number>,
  historicalAvg: Record<ProductCategory, {total: number; count: number}>,
  t: ReturnType<typeof useTranslations>,
): Insight[] {
  const insights: Insight[] = [];
  for (const [cat, amount] of Object.entries(categorySpending)) {
    const category = Number.parseInt(cat, 10) as ProductCategory;
    const avg = historicalAvg[category];
    const hasValidAverage = avg && avg.count > 0;

    if (hasValidAverage) {
      const avgAmount = avg.total / avg.count;
      const percentChange = ((amount - avgAmount) / avgAmount) * 100;
      const isSignificantSpike = percentChange > 100;

      if (isSignificantSpike) {
        insights.push({
          id: `spike-${category}`,
          icon: <TbTrendingUp className='h-4 w-4' />,
          title: t("insights.spike.title", {category: formatEnum(ProductCategory, category)}),
          description: t("insights.spike.description", {percent: percentChange.toFixed(0)}),
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
function getDecemberInsights(date: Date, t: ReturnType<typeof useTranslations>): Insight[] {
  const insights: Insight[] = [
    {
      id: "holiday-season",
      icon: <TbSparkles className='h-4 w-4' />,
      title: t("insights.holidaySeason.title"),
      description: t("insights.holidaySeason.description"),
      type: "info",
    },
  ];

  const isEarlyDecember = date.getDate() < 15;
  if (isEarlyDecember) {
    insights.push({
      id: "stock-up-tip",
      icon: <TbBulb className='h-4 w-4' />,
      title: t("insights.stockUpTip.title"),
      description: t("insights.stockUpTip.description"),
      type: "success",
    });
  }
  return insights;
}

/**
 * Get the default insight when no specific patterns are detected.
 */
function getDefaultInsight(t: ReturnType<typeof useTranslations>): Insight {
  return {
    id: "normal-pattern",
    icon: <TbShoppingBag className='h-4 w-4' />,
    title: t("insights.normalPattern.title"),
    description: t("insights.normalPattern.description"),
    type: "success",
  };
}

function detectSeasonalInsights(invoice: Invoice, t: ReturnType<typeof useTranslations>): Insight[] {
  const insights: Insight[] = [];
  const date = new Date(invoice.paymentInformation.transactionDate);
  const month = date.getMonth();

  const categorySpending = calculateCategorySpending(invoice);
  const historicalAvg = calculateHistoricalAverage();
  const spendingSpikes = detectSpendingSpikes(categorySpending, historicalAvg, t);
  insights.push(...spendingSpikes);

  const isDecember = month === 11;
  if (isDecember) {
    const decemberInsights = getDecemberInsights(date, t);
    insights.push(...decemberInsights);
  }

  if (insights.length === 0) {
    insights.push(getDefaultInsight(t));
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
  const t = useTranslations("I18nConsolidation.Invoices.SeasonalInsightsCard");
  const {invoice} = useInvoiceContext();
  const insights = detectSeasonalInsights(invoice, t);
  const date = new Date(invoice.paymentInformation.transactionDate);
  const monthName = new Intl.DateTimeFormat(locale, {month: "long"}).format(date);
  const {currency} = invoice.paymentInformation;

  // Simulated December spending data
  const decemberAverage = 1800;
  const currentDecemberSpending = 1245;
  const percentOfAverage = (currentDecemberSpending / decemberAverage) * 100;

  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbSparkles className='text-muted-foreground h-4 w-4' />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Month comparison */}
        <div className={styles["monthSection"]}>
          <div className={styles["monthRow"]}>
            <span className={styles["monthLabel"]}>{t("month.spendingSoFar", {month: monthName})}</span>
            <span className={styles["monthValue"]}>{formatCurrency(currentDecemberSpending, {currencyCode: currency.code, locale})}</span>
          </div>
          <Progress
            value={percentOfAverage}
            className='h-2'
          />
          <div className={styles["monthMeta"]}>
            <span>
              {t("month.vsAverage", {
                month: monthName,
                amount: formatCurrency(decemberAverage, {currencyCode: currency.code, locale}),
              })}
            </span>
            <span>{percentOfAverage.toFixed(0)}%</span>
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
      </CardContent>
    </Card>
  );
}
