"use client";

import {useUserInformation} from "@/hooks";
import {useInvoicesStore} from "@/stores";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useMemo} from "react";
import {TbChartBar, TbTrendingUp} from "react-icons/tb";
import {useInvoiceContext} from "../_context/InvoiceContext";
import {
  getCategoryComparison,
  getCategorySpending,
  getComparisonStats,
  getInvoiceSummary,
  getMerchantBreakdown,
  getPriceDistribution,
  getQuantityAnalysis,
  getSpendingTrend,
} from "../_utils/analytics";
import {ComparisonStatsCard} from "./cards/ComparisonStatsCard";
import {SummaryStatsCard} from "./cards/SummaryStatsCard";
import {CategoryComparisonChart} from "./charts/CategoryComparisonChart";
import {ItemsBreakdownChart} from "./charts/ItemsBreakdownChart";
import {MerchantBreakdownChart} from "./charts/MerchantBreakdownChart";
import {PriceDistributionChart} from "./charts/PriceDistributionChart";
import {SpendingByCategoryChart} from "./charts/SpendingByCategoryChart";
import {SpendingTrendChart} from "./charts/SpendingTrendChart";
import styles from "./InvoiceAnalytics.module.scss";

export function InvoiceAnalytics(): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoice.invoiceAnalytics");
  const {invoice, merchant} = useInvoiceContext();
  const {
    userInformation: {userIdentifier},
  } = useUserInformation();

  // Get all invoices from Zustand store for comparison analytics
  const allInvoices = useInvoicesStore((state) => state.invoices);

  const isOwner = invoice.userIdentifier === userIdentifier;
  const currency = invoice.paymentInformation.currency.symbol;
  const categoryData = getCategorySpending(invoice.items);
  const priceData = getPriceDistribution(invoice.items);
  const quantityData = getQuantityAnalysis(invoice.items);
  const summary = getInvoiceSummary(invoice);

  // Memoize comparison analytics (computed from all cached invoices)
  const trendData = useMemo(() => getSpendingTrend(invoice, allInvoices), [invoice, allInvoices]);
  const comparisonStats = useMemo(() => getComparisonStats(invoice, allInvoices), [invoice, allInvoices]);
  const categoryComparison = useMemo(() => getCategoryComparison(invoice, allInvoices), [invoice, allInvoices]);
  const merchantBreakdown = useMemo(() => getMerchantBreakdown(allInvoices), [allInvoices]);

  // Check if we have enough data for meaningful comparisons
  const hasComparisonData = allInvoices.length >= 2;

  return (
    <div className={styles["container"]}>
      <Tabs
        defaultValue='current'
        className={styles["tabsFullWidth"]}>
        <div className={styles["tabHeader"]}>
          <div className={styles["sectionTitle"]}>
            <TbChartBar className={styles["sectionIcon"]} />
            <h2 className={styles["sectionTitleText"]}>{t("title")}</h2>
          </div>
          <TabsList className={styles["tabsList"]}>
            <TabsTrigger
              value='current'
              className={styles["tabsTrigger"]}>
              <TbChartBar className={styles["tabIcon"]} />
              {t("tabs.current")}
            </TabsTrigger>
            {Boolean(isOwner) && (
              <TabsTrigger
                value='compare'
                className={styles["tabsTrigger"]}>
                <TbTrendingUp className={styles["tabIcon"]} />
                {t("tabs.compare")}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Current Invoice Analytics */}
        <TabsContent
          value='current'
          className={styles["tabContent"]}>
          <div className={styles["analyticsGrid"]}>
            {/* Summary Stats */}
            <div className={styles["gridItem"]}>
              <SummaryStatsCard
                summary={summary}
                currency={currency}
              />
            </div>

            {/* Spending by Category */}
            <div className={styles["gridItem"]}>
              <SpendingByCategoryChart
                data={categoryData}
                currency={currency}
              />
            </div>

            {/* Price Distribution */}
            <div className={styles["gridItem"]}>
              <PriceDistributionChart
                data={priceData}
                currency={currency}
              />
            </div>

            {/* Items Breakdown - Full Width on larger screens */}
            <div className={styles["gridItemFullWidth"]}>
              <ItemsBreakdownChart
                data={quantityData}
                currency={currency}
              />
            </div>
          </div>
        </TabsContent>

        {/* Comparison Analytics */}
        {Boolean(isOwner) && (
          <TabsContent
            value='compare'
            className={styles["tabContent"]}>
            {hasComparisonData ? (
              <div className={styles["analyticsGrid"]}>
                {/* Comparison Stats */}
                <div className={styles["gridItem"]}>
                  <ComparisonStatsCard
                    stats={comparisonStats}
                    currency={currency}
                  />
                </div>

                {/* Spending Trend */}
                <div className={styles["gridItemWide"]}>
                  <SpendingTrendChart
                    data={trendData}
                    currency={currency}
                  />
                </div>

                {/* Category Comparison */}
                <div className={styles["gridItemWide"]}>
                  <CategoryComparisonChart
                    data={categoryComparison}
                    currency={currency}
                  />
                </div>

                {/* Merchant Breakdown */}
                <div className={styles["gridItem"]}>
                  <MerchantBreakdownChart
                    data={merchantBreakdown}
                    currency={currency}
                    currentMerchant={merchant?.name ?? ""}
                  />
                </div>
              </div>
            ) : (
              <div className={styles["emptyState"]}>
                <TbTrendingUp className={styles["emptyIcon"]} />
                <h3 className={styles["emptyTitle"]}>{t("emptyState.title")}</h3>
                <p className={styles["emptyDescription"]}>{t("emptyState.description")}</p>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
