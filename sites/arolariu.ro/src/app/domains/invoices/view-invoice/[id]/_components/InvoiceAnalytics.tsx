"use client";

import {useUserInformation} from "@/hooks";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
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
  const {invoice, merchant} = useInvoiceContext();
  const {
    userInformation: {userIdentifier},
  } = useUserInformation();

  const isOwner = invoice.userIdentifier === userIdentifier;
  const currency = invoice.paymentInformation.currency.symbol;
  const categoryData = getCategorySpending(invoice.items);
  const priceData = getPriceDistribution(invoice.items);
  const quantityData = getQuantityAnalysis(invoice.items);
  const summary = getInvoiceSummary(invoice);
  const trendData = getSpendingTrend();
  const comparisonStats = getComparisonStats();
  const categoryComparison = getCategoryComparison();
  const merchantBreakdown = getMerchantBreakdown();

  return (
    <main className={styles["container"]}>
      <Tabs
        defaultValue='current'
        className='w-full'>
        <main className={styles["tabHeader"]}>
          <main className={styles["sectionTitle"]}>
            <TbChartBar className='text-muted-foreground h-5 w-5' />
            <h2 className={styles["sectionTitleText"]}>Analytics & Insights</h2>
          </main>
          <TabsList className='grid w-full grid-cols-2 sm:w-auto'>
            <TabsTrigger
              value='current'
              className='text-xs sm:text-sm'>
              <TbChartBar className='mr-1.5 h-3.5 w-3.5' />
              This Invoice
            </TabsTrigger>
            {Boolean(isOwner) && (
              <TabsTrigger
                value='compare'
                className='text-xs sm:text-sm'>
                <TbTrendingUp className='mr-1.5 h-3.5 w-3.5' />
                Comparison
              </TabsTrigger>
            )}
          </TabsList>
        </main>

        {/* Current Invoice Analytics */}
        <TabsContent
          value='current'
          className='mt-0'>
          <main className={styles["analyticsGrid"]}>
            {/* Summary Stats */}
            <main className={styles["gridItem"]}>
              <SummaryStatsCard
                summary={summary}
                currency={currency}
              />
            </main>

            {/* Spending by Category */}
            <main className={styles["gridItem"]}>
              <SpendingByCategoryChart
                data={categoryData}
                currency={currency}
              />
            </main>

            {/* Price Distribution */}
            <main className={styles["gridItem"]}>
              <PriceDistributionChart
                data={priceData}
                currency={currency}
              />
            </main>

            {/* Items Breakdown - Full Width on larger screens */}
            <main className={styles["gridItemFullWidth"]}>
              <ItemsBreakdownChart
                data={quantityData}
                currency={currency}
              />
            </main>
          </main>
        </TabsContent>

        {/* Comparison Analytics */}
        {Boolean(isOwner) && (
          <TabsContent
            value='compare'
            className='mt-0'>
            <main className={styles["analyticsGrid"]}>
              {/* Comparison Stats */}
              <main className={styles["gridItem"]}>
                <ComparisonStatsCard
                  stats={comparisonStats}
                  currency={currency}
                />
              </main>

              {/* Spending Trend */}
              <main className={styles["gridItemWide"]}>
                <SpendingTrendChart
                  data={trendData}
                  currency={currency}
                />
              </main>

              {/* Category Comparison */}
              <main className={styles["gridItemWide"]}>
                <CategoryComparisonChart
                  data={categoryComparison}
                  currency={currency}
                />
              </main>

              {/* Merchant Breakdown */}
              <main className={styles["gridItem"]}>
                <MerchantBreakdownChart
                  data={merchantBreakdown}
                  currency={currency}
                  currentMerchant={merchant.name}
                />
              </main>
            </main>
          </TabsContent>
        )}
      </Tabs>
    </main>
  );
}
