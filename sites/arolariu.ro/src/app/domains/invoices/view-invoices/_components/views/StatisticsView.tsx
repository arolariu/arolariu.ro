"use client";

/**
 * @fileoverview Statistics View - comprehensive analytics dashboard for invoices.
 * @module app/domains/invoices/view-invoices/_components/views/StatisticsView
 *
 * @remarks
 * This component orchestrates all statistics sub-components and computes
 * analytics data from the provided invoices. It uses the Island architecture
 * pattern where this client component receives data from its parent RSC.
 *
 * **Layout Structure:**
 * 1. Header with title and subtitle
 * 2. KPI Summary Row (4 cards)
 * 3. Spending Over Time chart (full width)
 * 4. Category Breakdown and Merchant Leaderboard (2-column)
 * 5. Spending Calendar Heatmap (full width)
 * 6. Month-over-Month Comparison Cards
 * 7. Price Distribution and Time-of-Day Analysis (2-column)
 *
 * **Empty State:**
 * When no invoices exist, displays an encouraging message to upload invoices.
 */

import type {Invoice} from "@/types/invoices";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useMemo} from "react";
import {TbChartBar} from "react-icons/tb";
import {
  computeAllergenFrequency,
  computeCategoryAggregates,
  computeCurrencyDistribution,
  computeDailySpending,
  computeKPIs,
  computeMerchantAggregates,
  computeMerchantTrends,
  computeMerchantVisitFrequency,
  computeMonthComparison,
  computeMonthlySpending,
  computePriceDistribution,
  computeProductCategorySpending,
  computeTimeOfDay,
  computeTopProducts,
} from "../../_utils/statistics";
import {AllergenSummaryChart} from "./statistics/AllergenSummaryChart";
import {CategoryBreakdownChart} from "./statistics/CategoryBreakdownChart";
import {ComparisonCards} from "./statistics/ComparisonCards";
import {CurrencyDistributionChart} from "./statistics/CurrencyDistributionChart";
import {KPISummaryRow} from "./statistics/KPISummaryRow";
import {MerchantLeaderboard} from "./statistics/MerchantLeaderboard";
import {MerchantTrendsChart} from "./statistics/MerchantTrendsChart";
import {MerchantVisitChart} from "./statistics/MerchantVisitChart";
import {PriceDistributionChart} from "./statistics/PriceDistributionChart";
import {ProductCategoryChart} from "./statistics/ProductCategoryChart";
import SpendingCalendarHeatmap from "./statistics/SpendingCalendarHeatmap";
import {SpendingOverTimeChart} from "./statistics/SpendingOverTimeChart";
import {TimeOfDayChart} from "./statistics/TimeOfDayChart";
import {TopProductsChart} from "./statistics/TopProductsChart";
import styles from "./StatisticsView.module.scss";

type Props = {
  invoices: ReadonlyArray<Invoice>;
};

/**
 * Empty state component when no invoices exist.
 */
function EmptyState(): React.JSX.Element {
  const t = useTranslations("IMS--Stats.empty");

  return (
    <motion.div
      className={styles["emptyState"]}
      initial={{opacity: 0, scale: 0.95}}
      animate={{opacity: 1, scale: 1}}
      transition={{duration: 0.4}}>
      <div className={styles["emptyIcon"]}>
        <TbChartBar size={64} />
      </div>
      <h2 className={styles["emptyTitle"]}>{t("title")}</h2>
      <p className={styles["emptySubtitle"]}>{t("subtitle")}</p>
    </motion.div>
  );
}

/**
 * Renders a comprehensive statistics dashboard for invoices.
 *
 * @remarks
 * This component computes all analytics data using memoized utility functions
 * to prevent unnecessary recalculations. The dashboard is fully responsive
 * and includes animated entrance effects for visual polish.
 *
 * **Performance:**
 * - All statistics are computed once and memoized
 * - Empty state is rendered immediately for zero invoices
 * - Charts use lazy loading through dynamic imports (handled by recharts)
 *
 * **Accessibility:**
 * - Semantic HTML structure with proper heading hierarchy
 * - ARIA labels on interactive elements
 * - Keyboard navigation support through Card components
 *
 * @param invoices - Array of invoice aggregates to analyze
 * @returns Statistics dashboard JSX element or empty state
 */
export default function RenderStatisticsView({invoices}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("IMS--Stats");

  // Compute all statistics data with memoization
  const kpiData = useMemo(() => computeKPIs(invoices), [invoices]);
  const monthlySpending = useMemo(() => computeMonthlySpending(invoices), [invoices]);
  const categoryAggregates = useMemo(() => computeCategoryAggregates(invoices), [invoices]);
  const merchantAggregates = useMemo(() => computeMerchantAggregates(invoices), [invoices]);
  const priceDistribution = useMemo(() => computePriceDistribution(invoices), [invoices]);
  const timeOfDaySegments = useMemo(() => computeTimeOfDay(invoices), [invoices]);
  const monthComparison = useMemo(() => computeMonthComparison(invoices), [invoices]);
  const dailySpending = useMemo(() => computeDailySpending(invoices), [invoices]);

  // Product-level analytics
  const productCategorySpending = useMemo(() => computeProductCategorySpending(invoices), [invoices]);
  const topProducts = useMemo(() => computeTopProducts(invoices, 10), [invoices]);
  const allergenFrequency = useMemo(() => computeAllergenFrequency(invoices), [invoices]);

  // Merchant-level analytics
  const merchantTrends = useMemo(() => computeMerchantTrends(invoices, 5), [invoices]);
  const merchantVisitPatterns = useMemo(() => computeMerchantVisitFrequency(invoices), [invoices]);

  // Currency distribution
  const currencyDistribution = useMemo(() => computeCurrencyDistribution(invoices), [invoices]);

  // Determine currency from first invoice's payment info
  const currency = useMemo(() => {
    if (invoices.length === 0) return "RON";
    const [firstInvoice] = invoices;
    return firstInvoice?.paymentInformation.currencyCode ?? "RON";
  }, [invoices]);

  // Handle empty state
  if (invoices.length === 0) {
    return (
      <div className={styles["container"]}>
        <div className={styles["header"]}>
          <div className={styles["headerContent"]}>
            <h1 className={styles["title"]}>{t("title")}</h1>
            <p className={styles["subtitle"]}>{t("subtitle")}</p>
          </div>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={styles["container"]}>
      {/* Header Section */}
      <motion.div
        className={styles["header"]}
        initial={{opacity: 0, y: -20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.5}}>
        <div className={styles["headerContent"]}>
          <h1 className={styles["title"]}>{t("title")}</h1>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </div>
      </motion.div>

      {/* KPI Summary Row */}
      <section className={styles["section"]}>
        <KPISummaryRow
          data={kpiData}
          currency={currency}
        />
      </section>

      {/* Spending Over Time - Full Width */}
      <section className={styles["section"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5, delay: 0.4}}>
          <SpendingOverTimeChart
            data={monthlySpending}
            currency={currency}
          />
        </motion.div>
      </section>

      {/* Category Breakdown & Merchant Leaderboard - 2 Column */}
      <section className={styles["section"]}>
        <div className={styles["twoColumnGrid"]}>
          <motion.div
            initial={{opacity: 0, x: -20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.5, delay: 0.5}}>
            <CategoryBreakdownChart
              data={categoryAggregates}
              currency={currency}
            />
          </motion.div>
          <motion.div
            initial={{opacity: 0, x: 20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.5, delay: 0.5}}>
            <MerchantLeaderboard
              data={merchantAggregates}
              currency={currency}
            />
          </motion.div>
        </div>
      </section>

      {/* Merchant Analytics - Trends & Visit Patterns */}
      <section className={styles["section"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5, delay: 0.52}}>
          <MerchantTrendsChart
            data={merchantTrends}
            currency={currency}
          />
        </motion.div>
      </section>

      <section className={styles["section"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5, delay: 0.54}}>
          <MerchantVisitChart
            data={merchantVisitPatterns}
            currency={currency}
            topN={6}
          />
        </motion.div>
      </section>

      {/* Spending Calendar Heatmap - Full Width */}
      <section className={styles["section"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5, delay: 0.55}}>
          <SpendingCalendarHeatmap
            data={dailySpending}
            currency={currency}
          />
        </motion.div>
      </section>

      {/* Month-over-Month Comparison */}
      <section className={styles["section"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5, delay: 0.6}}>
          <ComparisonCards
            data={monthComparison}
            currency={currency}
          />
        </motion.div>
      </section>

      {/* Currency Distribution - Full Width */}
      <section className={styles["section"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5, delay: 0.65}}>
          <CurrencyDistributionChart data={currencyDistribution} />
        </motion.div>
      </section>

      {/* Price Distribution & Time of Day - 2 Column */}
      <section className={styles["section"]}>
        <div className={styles["twoColumnGrid"]}>
          <motion.div
            initial={{opacity: 0, x: -20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.5, delay: 0.7}}>
            <PriceDistributionChart
              data={priceDistribution}
              currency={currency}
            />
          </motion.div>
          <motion.div
            initial={{opacity: 0, x: 20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.5, delay: 0.7}}>
            <TimeOfDayChart data={timeOfDaySegments} />
          </motion.div>
        </div>
      </section>

      {/* Product-Level Analytics Section */}
      <section className={styles["section"]}>
        <motion.div
          className={styles["sectionHeader"]}
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5, delay: 0.75}}>
          <h2 className={styles["sectionTitle"]}>{t("productAnalytics.title")}</h2>
          <p className={styles["sectionSubtitle"]}>{t("productAnalytics.subtitle")}</p>
        </motion.div>
      </section>

      {/* Product Category Spending & Top Products - 2 Column */}
      <section className={styles["section"]}>
        <div className={styles["twoColumnGrid"]}>
          <motion.div
            initial={{opacity: 0, x: -20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.5, delay: 0.8}}>
            <ProductCategoryChart
              data={productCategorySpending}
              currency={currency}
            />
          </motion.div>
          <motion.div
            initial={{opacity: 0, x: 20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.5, delay: 0.8}}>
            <TopProductsChart
              data={topProducts}
              currency={currency}
            />
          </motion.div>
        </div>
      </section>

      {/* Allergen Summary - Full Width */}
      <section className={styles["section"]}>
        <motion.div
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5, delay: 0.85}}>
          <AllergenSummaryChart data={allergenFrequency} />
        </motion.div>
      </section>
    </div>
  );
}
