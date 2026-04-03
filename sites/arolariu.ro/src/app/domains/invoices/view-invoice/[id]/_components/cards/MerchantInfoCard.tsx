/**
 * @fileoverview Merchant information card with deep-dive analytics for the invoice view page.
 * @module domains/invoices/view-invoice/[id]/components/cards/MerchantInfoCard
 *
 * @remarks
 * Displays comprehensive merchant details and analytics:
 * - Basic contact information and address
 * - Spending history sparkline chart showing monthly totals
 * - Visit statistics (count, average spend, last visit)
 * - Category distribution for multi-invoice merchants
 * - Google Maps integration for physical locations
 * - Quick navigation to all invoices from this merchant
 *
 * **Rendering Context**: Client Component (requires hooks and interactivity).
 *
 * **Data Sources:**
 * - Invoice context: current merchant and invoice
 * - Invoices store: historical data for analytics
 *
 * **Performance:**
 * - All computed stats are memoized with `useMemo`
 * - Chart data computation only runs when invoices change
 */

"use client";

import {formatAmount, formatEnum, toSafeDate} from "@/lib/utils.generic";
import {useInvoicesStore} from "@/stores/invoicesStore";
import type {Invoice} from "@/types/invoices";
import {MerchantCategory} from "@/types/invoices";
import {
  Area,
  AreaChart,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  ResponsiveContainer,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useMemo} from "react";
import {TbCalendar, TbChartBar, TbGlobe, TbMapPin, TbPhone, TbReceipt, TbShoppingBag} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./MerchantInfoCard.module.scss";

/**
 * Type for monthly spending data point used in the sparkline chart.
 */
type MonthlySpending = {
  /** Month label (e.g., "Jan", "Feb") */
  readonly month: string;
  /** Total spending amount for the month */
  readonly amount: number;
};

/**
 * Type for category distribution data used in stacked bar visualization.
 */
type CategoryDistribution = {
  /** Category enum value */
  readonly category: MerchantCategory;
  /** Category display label */
  readonly label: string;
  /** Number of invoices in this category */
  readonly count: number;
  /** Percentage of total invoices */
  readonly percentage: number;
};

/**
 * Merchant information card component with rich analytics.
 *
 * @remarks
 * **Features:**
 * 1. Basic merchant info (name, address, phone, website, category)
 * 2. Spending history sparkline showing last 6 months of activity
 * 3. Visit statistics: total visits, average spend, days since last visit
 * 4. Category distribution for merchants with multiple invoice categories
 * 5. Google Maps link for physical address
 * 6. "View all invoices" CTA linking to filtered invoice list
 *
 * **Performance:**
 * - Memoized computations prevent unnecessary recalculations
 * - Efficient filtering of invoices by merchant reference
 * - Lightweight Recharts sparkline for visual feedback
 *
 * @returns React component displaying merchant analytics
 *
 * @example
 * ```tsx
 * // Used within InvoiceContextProvider
 * <InvoiceContextProvider invoice={invoice} merchant={merchant}>
 *   <MerchantInfoCard />
 * </InvoiceContextProvider>
 * ```
 */
export function MerchantInfoCard(): React.JSX.Element {
  const {invoice, merchant} = useInvoiceContext();
  const {invoices} = useInvoicesStore();
  const t = useTranslations("IMS--Cards.merchantInfoCard");

  // Early return if merchant is null
  if (!merchant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles["emptyState"]}>
            <p className={styles["emptyStateText"]}>{t("noMerchantLinked")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Filter all invoices for this merchant.
   * Memoized to prevent recalculation on every render.
   */
  const merchantInvoices = useMemo(
    () => invoices.filter((inv: Invoice) => inv.merchantReference === invoice.merchantReference),
    [invoices, invoice.merchantReference],
  );

  /**
   * Compute monthly spending data for the sparkline chart.
   * Groups invoices by month and calculates totals.
   */
  const monthlySpendingData = useMemo<MonthlySpending[]>(() => {
    if (merchantInvoices.length === 0) return [];

    const monthlyTotals = new Map<string, number>();
    merchantInvoices.forEach((inv: Invoice) => {
      const date = toSafeDate(inv.paymentInformation.transactionDate);
      const monthKey = date.toLocaleString("en-US", {month: "short", year: "numeric"});
      const currentTotal = monthlyTotals.get(monthKey) ?? 0;
      monthlyTotals.set(monthKey, currentTotal + inv.paymentInformation.totalCostAmount);
    });

    return Array.from(monthlyTotals.entries())
      .map(([month, amount]) => ({month, amount}))
      .sort((a, b) => {
        const dateA = new Date(`${a.month} 01`);
        const dateB = new Date(`${b.month} 01`);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(-6);
  }, [merchantInvoices]);

  /**
   * Calculate visit statistics: count, average spend, days since last visit.
   */
  const visitStats = useMemo(() => {
    const count = merchantInvoices.length;
    const totalSpent = merchantInvoices.reduce((sum: number, inv: Invoice) => sum + inv.paymentInformation.totalCostAmount, 0);
    const avgSpend = count > 0 ? totalSpent / count : 0;

    const sortedDates = merchantInvoices
      .map((inv: Invoice) => toSafeDate(inv.paymentInformation.transactionDate))
      .sort((a, b) => b.getTime() - a.getTime());

    const lastVisitDate = sortedDates[0];
    const daysAgo = lastVisitDate ? Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {count, avgSpend, daysAgo};
  }, [merchantInvoices]);

  /**
   * Calculate category distribution if merchant has invoices in multiple categories.
   * Shows percentage breakdown across different invoice categories.
   */
  const categoryDistribution = useMemo<CategoryDistribution[]>(() => {
    if (merchantInvoices.length === 0) return [];

    const categoryCounts = new Map<MerchantCategory, number>();
    merchantInvoices.forEach(() => {
      const category = merchant.category;
      const currentCount = categoryCounts.get(category) ?? 0;
      categoryCounts.set(category, currentCount + 1);
    });

    const total = merchantInvoices.length;
    return Array.from(categoryCounts.entries())
      .map(([category, count]) => ({
        category,
        label: formatEnum(MerchantCategory, category),
        count,
        percentage: (count / total) * 100,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [merchantInvoices, merchant.category]);

  /**
   * Generate Google Maps URL for the merchant's address.
   */
  const googleMapsUrl = useMemo(() => {
    if (!merchant.address.address) return null;
    const encodedAddress = encodeURIComponent(merchant.address.address);
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  }, [merchant.address.address]);

  /**
   * Generate URL for viewing all invoices from this merchant.
   * Uses merchant reference as filter parameter.
   */
  const viewAllInvoicesUrl = useMemo(
    () => `/domains/invoices/view-invoices?merchant=${invoice.merchantReference}`,
    [invoice.merchantReference],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{merchant.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={styles["contentSpaced"]}>
          {/* Basic Contact Information */}
          <div className={styles["infoRowStart"]}>
            <TbMapPin className={styles["iconMutedTop"]} />
            <span className={styles["infoText"]}>{merchant.address.address}</span>
          </div>
          <div className={styles["infoRow"]}>
            <TbPhone className={styles["iconMuted"]} />
            <span className={styles["infoText"]}>{merchant.address.phoneNumber}</span>
          </div>
          <div className={styles["infoRow"]}>
            <Badge variant='outline'>{formatEnum(MerchantCategory, merchant.category)}</Badge>
          </div>
          {Boolean(merchant.address.website) && (
            <div className={styles["infoRow"]}>
              <TbGlobe className={styles["iconMuted"]} />
              <a
                href={merchant.address.website}
                target='_blank'
                rel='noopener noreferrer'
                className={styles["websiteLink"]}>
                {merchant.address.website.replace(/^https?:\/\//u, "")}
              </a>
            </div>
          )}

          {/* Spending History Sparkline */}
          {monthlySpendingData.length > 0 && (
            <div className={styles["section"]}>
              <div className={styles["sectionHeader"]}>
                <TbChartBar className={styles["iconMuted"]} />
                <span className={styles["sectionTitle"]}>{t("spendingHistory")}</span>
              </div>
              <div className={styles["sparklineContainer"]}>
                <ResponsiveContainer
                  width='100%'
                  height={100}>
                  <AreaChart
                    data={monthlySpendingData}
                    margin={{top: 5, right: 0, left: 0, bottom: 5}}>
                    <defs>
                      <linearGradient
                        id='merchantSparkline'
                        x1='0'
                        y1='0'
                        x2='0'
                        y2='1'>
                        <stop
                          offset='5%'
                          stopColor='var(--ac-chart-1)'
                          stopOpacity={0.3}
                        />
                        <stop
                          offset='95%'
                          stopColor='var(--ac-chart-1)'
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type='monotone'
                      dataKey='amount'
                      stroke='var(--ac-chart-1)'
                      fill='url(#merchantSparkline)'
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Visit Statistics */}
          {merchantInvoices.length > 0 && (
            <div className={styles["statsRow"]}>
              <div className={styles["statBadge"]}>
                <TbShoppingBag className={styles["statIcon"]} />
                <span className={styles["statValue"]}>{visitStats.count}</span>
                <span className={styles["statLabel"]}>{t("stats.visits")}</span>
              </div>
              <div className={styles["statBadge"]}>
                <TbReceipt className={styles["statIcon"]} />
                <span className={styles["statValue"]}>{formatAmount(visitStats.avgSpend)}</span>
                <span className={styles["statLabel"]}>{t("stats.avgSpend")}</span>
              </div>
              <div className={styles["statBadge"]}>
                <TbCalendar className={styles["statIcon"]} />
                <span className={styles["statValue"]}>{visitStats.daysAgo}</span>
                <span className={styles["statLabel"]}>{t("stats.daysAgo")}</span>
              </div>
            </div>
          )}

          {/* Category Distribution */}
          {categoryDistribution.length > 1 && (
            <div className={styles["section"]}>
              <div className={styles["sectionHeader"]}>
                <span className={styles["sectionTitle"]}>{t("categoryDistribution")}</span>
              </div>
              <div className={styles["categoryBar"]}>
                {categoryDistribution.map((cat) => (
                  <div
                    key={cat.category}
                    className={styles["categorySegment"]}
                    style={{width: `${cat.percentage}%`}}
                    title={`${cat.label}: ${cat.count} (${cat.percentage.toFixed(1)}%)`}
                  />
                ))}
              </div>
              <div className={styles["categoryLabels"]}>
                {categoryDistribution.map((cat) => (
                  <div
                    key={cat.category}
                    className={styles["categoryLabel"]}>
                    <span className={styles["categoryLabelText"]}>{cat.label}</span>
                    <span className={styles["categoryLabelCount"]}>
                      {cat.count} ({cat.percentage.toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Google Maps Link */}
          {googleMapsUrl && (
            <Button
              variant='outline'
              asChild
              className={styles["mapButton"]}>
              <a
                href={googleMapsUrl}
                target='_blank'
                rel='noopener noreferrer'>
                <TbMapPin className={styles["buttonIcon"]} />
                {t("viewOnMap")}
              </a>
            </Button>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant='outline'
          asChild
          className={styles["fullWidth"]}>
          <Link href={viewAllInvoicesUrl}>{t("viewAllInvoices")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
