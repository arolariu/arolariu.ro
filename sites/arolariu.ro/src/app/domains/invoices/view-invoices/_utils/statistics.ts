/**
 * @fileoverview Cross-invoice aggregate statistics utilities.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_utils/statistics
 *
 * @remarks
 * This module provides pure utility functions for computing aggregate analytics
 * across multiple invoices. These functions power the statistics dashboard with
 * KPIs, trends, category breakdowns, and spending patterns.
 *
 * **Design Principles:**
 * - Pure functions with no side effects
 * - TypeScript strict mode with explicit return types
 * - Safe access patterns (optional chaining, nullish coalescing)
 * - Performance-conscious (single-pass aggregations where possible)
 * - Currency-aware (all amounts normalized to RON via yearly average exchange rates)
 *
 * **Performance Considerations:**
 * All functions are O(n) complexity where n is the number of invoices.
 * For large datasets (>10k invoices), consider:
 * - Implementing pagination/windowing
 * - Caching results in Zustand store
 * - Using web workers for background computation
 *
 * **Date Handling:**
 * All date operations use native Date API and are timezone-aware.
 * Months are formatted using Intl.DateTimeFormat for locale support.
 *
 * @example
 * ```typescript
 * import { computeKPIs, computeMonthlySpending } from "./_utils/statistics";
 *
 * const kpis = computeKPIs(invoices);
 * const monthlyData = computeMonthlySpending(invoices);
 * ```
 *
 * @see {@link Invoice} for invoice structure
 * @see {@link Product} for product structure
 * @see {@link PaymentInformation} for payment details
 */

import type {Invoice} from "@/types/invoices";
import {getTransactionYear, toRON} from "@/lib/currency";

/**
 * Extracts the RON-normalized amount from an invoice.
 *
 * @remarks
 * Converts the invoice's `totalCostAmount` to RON using the yearly average
 * exchange rate for the invoice's transaction year. RON invoices pass through
 * unchanged. Unknown currencies are returned as-is.
 *
 * @param invoice - The invoice to extract the amount from
 * @returns The amount in RON (or original amount if currency is unknown)
 */
function getAmountInRON(invoice: Invoice): number {
  const amount = invoice.paymentInformation?.totalCostAmount ?? 0;
  const currencyCode = invoice.paymentInformation?.currency?.code ?? "RON";
  const year = getTransactionYear(invoice.paymentInformation?.transactionDate, invoice.createdAt);
  return toRON(amount, currencyCode, year);
}

/**
 * Key Performance Indicator data for dashboard summary row.
 *
 * @remarks
 * Provides high-level metrics computed from all invoices.
 * These metrics give users a quick overview of their spending behavior.
 *
 * **Calculation Notes:**
 * - `totalSpending`: Sum of all invoice totals
 * - `averagePerInvoice`: Mean invoice value (totalSpending / invoiceCount)
 * - `mostFrequentMerchant`: Merchant with highest invoice count
 * - `averageItemsPerInvoice`: Mean number of products per invoice
 * - `currency`: Extracted from first invoice, assumes homogeneous currency
 *
 * @example
 * ```typescript
 * const kpis = computeKPIs(invoices);
 * console.log(`Total: ${kpis.currency} ${kpis.totalSpending}`);
 * console.log(`Average per invoice: ${kpis.averagePerInvoice.toFixed(2)}`);
 * ```
 */
export type KPIData = {
  /** Total spending across all invoices */
  totalSpending: number;
  /** Number of invoices analyzed */
  invoiceCount: number;
  /** Average amount per invoice */
  averagePerInvoice: number;
  /** Most frequently used merchant */
  mostFrequentMerchant: {id: string; count: number} | null;
  /** Average number of items per invoice */
  averageItemsPerInvoice: number;
  /** Total number of items across all invoices */
  totalItems: number;
  /** Currency code used (assumes homogeneous currency) */
  currency: string;
};

/**
 * Monthly spending data point for trend charts.
 *
 * @remarks
 * Aggregates spending by calendar month for temporal analysis.
 * Useful for identifying spending trends, seasonal patterns, and anomalies.
 *
 * **Format:**
 * - `month`: Human-readable month label (e.g., "Jan 2025")
 * - `monthKey`: Machine-readable sortable key (e.g., "2025-01")
 * - `amount`: Total spending for the month
 * - `invoiceCount`: Number of invoices in the month
 *
 * @example
 * ```typescript
 * const monthlyData = computeMonthlySpending(invoices);
 * const chartData = monthlyData.map(m => ({
 *   x: m.month,
 *   y: m.amount
 * }));
 * ```
 */
export type MonthlySpending = {
  /** Human-readable month label (e.g., "Jan 2025") */
  month: string;
  /** Machine-readable month key for sorting (e.g., "2025-01") */
  monthKey: string;
  /** Total spending amount for the month */
  amount: number;
  /** Number of invoices in the month */
  invoiceCount: number;
};

/**
 * Category spending aggregate for pie/bar charts.
 *
 * @remarks
 * Groups spending by invoice category to show where money goes.
 * Categories are defined by the InvoiceCategory enum.
 *
 * **Percentage Calculation:**
 * Percentage is computed as (category amount / total spending) * 100
 *
 * @example
 * ```typescript
 * const categories = computeCategoryAggregates(invoices);
 * const grocerySpend = categories.find(c => c.category === "Grocery");
 * console.log(`Grocery: ${grocerySpend?.percentage.toFixed(1)}%`);
 * ```
 */
export type CategoryAggregate = {
  /** Human-readable category name */
  category: string;
  /** Numeric category ID from enum */
  categoryId: number;
  /** Total spending in this category */
  amount: number;
  /** Number of invoices in this category */
  count: number;
  /** Percentage of total spending */
  percentage: number;
};

/**
 * Merchant spending aggregate for top merchants analysis.
 *
 * @remarks
 * Identifies where users spend most frequently and how much.
 * Useful for loyalty program optimization and spending awareness.
 *
 * @example
 * ```typescript
 * const merchants = computeMerchantAggregates(invoices);
 * const topMerchant = merchants[0]; // Sorted by totalSpend descending
 * console.log(`Top merchant: ${topMerchant.totalSpend} total`);
 * ```
 */
export type MerchantAggregate = {
  /** Merchant unique identifier */
  merchantId: string;
  /** Total spending at this merchant */
  totalSpend: number;
  /** Number of invoices from this merchant */
  invoiceCount: number;
  /** Average spending per visit */
  averageSpend: number;
};

/**
 * Daily spending data for heatmap visualizations.
 *
 * @remarks
 * Provides granular day-by-day spending data for calendar heatmaps.
 * Useful for identifying spending patterns by day of week or month.
 *
 * **Date Format:**
 * ISO 8601 date string (YYYY-MM-DD) for consistency and sorting.
 *
 * @example
 * ```typescript
 * const dailyData = computeDailySpending(invoices);
 * const heatmapData = dailyData.map(d => ({
 *   date: d.date,
 *   value: d.amount
 * }));
 * ```
 */
export type DailySpending = {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Total spending on this date */
  amount: number;
  /** Number of invoices on this date */
  invoiceCount: number;
};

/**
 * Price bucket for distribution histogram.
 *
 * @remarks
 * Groups invoices into price ranges to show spending distribution.
 * Helps identify typical transaction sizes and outliers.
 *
 * **Default Buckets:**
 * - 0-5, 5-10, 10-25, 25-50, 50-100, 100+
 *
 * @example
 * ```typescript
 * const distribution = computePriceDistribution(invoices);
 * distribution.forEach(bucket => {
 *   console.log(`${bucket.range}: ${bucket.count} invoices`);
 * });
 * ```
 */
export type PriceBucket = {
  /** Human-readable range label (e.g., "0-5") */
  range: string;
  /** Minimum value (inclusive) */
  min: number;
  /** Maximum value (exclusive, except for last bucket) */
  max: number;
  /** Number of invoices in this bucket */
  count: number;
  /** Total spending in this bucket */
  totalAmount: number;
};

/**
 * Time-of-day spending segment for behavioral analysis.
 *
 * @remarks
 * Segments spending by time of day to identify shopping patterns.
 * Useful for understanding user behavior and optimizing features.
 *
 * **Segments:**
 * - Morning: 6:00-12:00
 * - Afternoon: 12:00-17:00
 * - Evening: 17:00-21:00
 * - Night: 21:00-6:00
 *
 * @example
 * ```typescript
 * const timeData = computeTimeOfDay(invoices);
 * const morningSpend = timeData.find(t => t.segment === "Morning");
 * ```
 */
export type TimeOfDaySegment = {
  /** Time segment name */
  segment: string;
  /** Number of invoices in this segment */
  invoiceCount: number;
  /** Total spending in this segment */
  totalAmount: number;
  /** Average spending per invoice in this segment */
  averageAmount: number;
};

/**
 * Month-over-month comparison for trend analysis.
 *
 * @remarks
 * Compares current month spending with previous month to show trends.
 * Includes delta calculations and new merchant discovery metrics.
 *
 * **Delta Calculations:**
 * - `spendingDelta`: Absolute difference (current - previous)
 * - `spendingDeltaPercent`: Percentage change ((current - previous) / previous * 100)
 * - `invoiceCountDelta`: Change in number of invoices
 * - `newMerchantCount`: Number of new merchants in current month
 *
 * @example
 * ```typescript
 * const comparison = computeMonthComparison(invoices);
 * if (comparison.spendingDeltaPercent > 10) {
 *   console.warn("Spending increased by >10%!");
 * }
 * ```
 */
export type MonthComparison = {
  /** Current month spending data */
  currentMonth: MonthlySpending;
  /** Previous month spending data (null if not available) */
  previousMonth: MonthlySpending | null;
  /** Absolute spending change */
  spendingDelta: number;
  /** Percentage spending change */
  spendingDeltaPercent: number;
  /** Change in invoice count */
  invoiceCountDelta: number;
  /** Number of new merchants in current month */
  newMerchantCount: number;
};

/**
 * Computes Key Performance Indicators from invoices.
 *
 * @param invoices - Array of invoices to analyze
 * @returns KPI data with spending metrics
 *
 * @remarks
 * **Performance:** O(n) where n is the number of invoices.
 * Performs a single pass through the data to compute all metrics.
 *
 * **Edge Cases:**
 * - Empty array: Returns zeroed metrics with "RON" default currency
 * - Missing payment info: Uses 0 for amounts
 * - No merchant: Returns null for mostFrequentMerchant
 *
 * @example
 * ```typescript
 * const kpis = computeKPIs(invoices);
 * console.log(`Total: ${kpis.totalSpending} ${kpis.currency}`);
 * console.log(`Avg per invoice: ${kpis.averagePerInvoice.toFixed(2)}`);
 * ```
 */
export function computeKPIs(invoices: ReadonlyArray<Invoice>): KPIData {
  if (invoices.length === 0) {
    return {
      totalSpending: 0,
      invoiceCount: 0,
      averagePerInvoice: 0,
      mostFrequentMerchant: null,
      averageItemsPerInvoice: 0,
      totalItems: 0,
      currency: "RON",
    };
  }

  let totalSpending = 0;
  let totalItems = 0;
  const merchantCounts = new Map<string, number>();

  // Single pass aggregation
  for (const invoice of invoices) {
    const amount = getAmountInRON(invoice);
    totalSpending += amount;
    totalItems += invoice.items?.length ?? 0;

    const merchantId = invoice.merchantReference;
    if (merchantId) {
      merchantCounts.set(merchantId, (merchantCounts.get(merchantId) ?? 0) + 1);
    }
  }

  // Find most frequent merchant
  let mostFrequentMerchant: {id: string; count: number} | null = null;
  for (const [merchantId, count] of merchantCounts.entries()) {
    if (!mostFrequentMerchant || count > mostFrequentMerchant.count) {
      mostFrequentMerchant = {id: merchantId, count};
    }
  }

  // Extract currency — always RON since amounts are now normalized
  const currency = "RON";

  return {
    totalSpending: Math.round(totalSpending * 100) / 100,
    invoiceCount: invoices.length,
    averagePerInvoice: Math.round((totalSpending / invoices.length) * 100) / 100,
    mostFrequentMerchant,
    averageItemsPerInvoice: Math.round((totalItems / invoices.length) * 100) / 100,
    totalItems,
    currency,
  };
}

/**
 * Computes monthly spending aggregates for trend visualization.
 *
 * @param invoices - Array of invoices to analyze
 * @returns Array of monthly spending data, sorted chronologically
 *
 * @remarks
 * **Performance:** O(n log n) due to sorting, where n is the number of unique months.
 *
 * **Date Extraction:**
 * Uses `paymentInformation.transactionDate` for grouping.
 * Falls back to invoice creation date if transaction date is unavailable.
 *
 * **Locale:**
 * Month labels are formatted using `Intl.DateTimeFormat` for internationalization.
 *
 * @example
 * ```typescript
 * const monthlyData = computeMonthlySpending(invoices);
 * // Returns: [
 * //   { month: "Dec 2024", monthKey: "2024-12", amount: 1234.56, invoiceCount: 15 },
 * //   { month: "Jan 2025", monthKey: "2025-01", amount: 1567.89, invoiceCount: 18 }
 * // ]
 * ```
 */
export function computeMonthlySpending(invoices: ReadonlyArray<Invoice>): MonthlySpending[] {
  const monthMap = new Map<string, {amount: number; count: number}>();

  for (const invoice of invoices) {
    const transactionDate = invoice.paymentInformation?.transactionDate ?? invoice.createdAt ?? new Date();
    const date = new Date(transactionDate);

    // Create month key (YYYY-MM)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const monthKey = `${year}-${month}`;

    const amount = getAmountInRON(invoice);

    const existing = monthMap.get(monthKey) ?? {amount: 0, count: 0};
    monthMap.set(monthKey, {
      amount: existing.amount + amount,
      count: existing.count + 1,
    });
  }

  // Convert to array and sort chronologically
  const result: MonthlySpending[] = [];
  for (const [monthKey, data] of monthMap.entries()) {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);

    // Format month label (e.g., "Jan 2025")
    const monthLabel = new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(date);

    result.push({
      month: monthLabel,
      monthKey,
      amount: Math.round(data.amount * 100) / 100,
      invoiceCount: data.count,
    });
  }

  return result.toSorted((a, b) => a.monthKey.localeCompare(b.monthKey));
}

/**
 * Maps InvoiceCategory enum values to human-readable labels.
 *
 * @param categoryId - Numeric category ID from InvoiceCategory enum
 * @returns Human-readable category label
 *
 * @remarks
 * **Category Mappings:**
 * - 0 (NOT_DEFINED) → "Uncategorized"
 * - 100 (GROCERY) → "Grocery"
 * - 200 (FAST_FOOD) → "Dining"
 * - 300 (HOME_CLEANING) → "Home"
 * - 400 (CAR_AUTO) → "Auto"
 * - 9999 (OTHER) → "Other"
 * - Unknown → "Unknown"
 *
 * @example
 * ```typescript
 * const label = getCategoryLabel(100); // "Grocery"
 * const label2 = getCategoryLabel(200); // "Dining"
 * ```
 */
export function getCategoryLabel(categoryId: number): string {
  const labels: Record<number, string> = {
    0: "Uncategorized",
    100: "Grocery",
    200: "Dining",
    300: "Home",
    400: "Auto",
    9999: "Other",
  };

  return labels[categoryId] ?? "Unknown";
}

/**
 * Computes spending aggregates by invoice category.
 *
 * @param invoices - Array of invoices to analyze
 * @returns Array of category aggregates, sorted by amount descending
 *
 * @remarks
 * **Performance:** O(n) where n is the number of invoices.
 *
 * **Percentage Calculation:**
 * Each category's percentage is computed as (category total / grand total) * 100.
 *
 * **Category Mapping:**
 * Uses {@link getCategoryLabel} to convert enum values to human-readable names.
 *
 * @example
 * ```typescript
 * const categories = computeCategoryAggregates(invoices);
 * // Returns: [
 * //   { category: "Grocery", categoryId: 100, amount: 3456.78, count: 23, percentage: 45.2 },
 * //   { category: "Dining", categoryId: 200, amount: 2123.45, count: 18, percentage: 27.8 }
 * // ]
 * ```
 */
export function computeCategoryAggregates(invoices: ReadonlyArray<Invoice>): CategoryAggregate[] {
  const categoryMap = new Map<number, {amount: number; count: number}>();
  let totalSpending = 0;

  for (const invoice of invoices) {
    const category = invoice.category ?? 0;
    const amount = getAmountInRON(invoice);
    totalSpending += amount;

    const existing = categoryMap.get(category) ?? {amount: 0, count: 0};
    categoryMap.set(category, {
      amount: existing.amount + amount,
      count: existing.count + 1,
    });
  }

  const result: CategoryAggregate[] = [];
  for (const [categoryId, data] of categoryMap.entries()) {
    const percentage = totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0;

    result.push({
      category: getCategoryLabel(categoryId),
      categoryId,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
      percentage: Math.round(percentage * 10) / 10,
    });
  }

  return result.toSorted((a, b) => b.amount - a.amount);
}

/**
 * Computes spending aggregates by merchant.
 *
 * @param invoices - Array of invoices to analyze
 * @returns Array of merchant aggregates, sorted by total spend descending
 *
 * @remarks
 * **Performance:** O(n) where n is the number of invoices.
 *
 * **Merchant Identification:**
 * Uses `invoice.merchantReference` as the unique identifier.
 * Skips invoices without merchant references.
 *
 * **Average Calculation:**
 * Average spend = total spend / invoice count
 *
 * @example
 * ```typescript
 * const merchants = computeMerchantAggregates(invoices);
 * const topMerchant = merchants[0]; // Highest spending
 * console.log(`Top: ${topMerchant.totalSpend} across ${topMerchant.invoiceCount} visits`);
 * ```
 */
export function computeMerchantAggregates(invoices: ReadonlyArray<Invoice>): MerchantAggregate[] {
  const merchantMap = new Map<string, {totalSpend: number; count: number}>();

  for (const invoice of invoices) {
    const merchantId = invoice.merchantReference;
    if (merchantId) {
      const amount = getAmountInRON(invoice);
      const existing = merchantMap.get(merchantId) ?? {totalSpend: 0, count: 0};

      merchantMap.set(merchantId, {
        totalSpend: existing.totalSpend + amount,
        count: existing.count + 1,
      });
    }
  }

  const result: MerchantAggregate[] = [];
  for (const [merchantId, data] of merchantMap.entries()) {
    result.push({
      merchantId,
      totalSpend: Math.round(data.totalSpend * 100) / 100,
      invoiceCount: data.count,
      averageSpend: Math.round((data.totalSpend / data.count) * 100) / 100,
    });
  }

  return result.toSorted((a, b) => b.totalSpend - a.totalSpend);
}

/**
 * Computes daily spending for calendar heatmap visualization.
 *
 * @param invoices - Array of invoices to analyze
 * @returns Array of daily spending data, sorted by date ascending
 *
 * @remarks
 * **Performance:** O(n log n) due to sorting, where n is the number of unique days.
 *
 * **Date Format:**
 * Dates are formatted as ISO 8601 strings (YYYY-MM-DD) for consistency.
 *
 * **Use Case:**
 * Ideal for calendar heatmaps showing spending intensity by day.
 *
 * @example
 * ```typescript
 * const dailyData = computeDailySpending(invoices);
 * // Returns: [
 * //   { date: "2025-01-15", amount: 234.56, invoiceCount: 3 },
 * //   { date: "2025-01-16", amount: 89.12, invoiceCount: 1 }
 * // ]
 * ```
 */
export function computeDailySpending(invoices: ReadonlyArray<Invoice>): DailySpending[] {
  const dayMap = new Map<string, {amount: number; count: number}>();

  for (const invoice of invoices) {
    const transactionDate = invoice.paymentInformation?.transactionDate ?? invoice.createdAt ?? new Date();
    const date = new Date(transactionDate);

    // Create day key (YYYY-MM-DD)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dayKey = `${year}-${month}-${day}`;

    const amount = getAmountInRON(invoice);
    const existing = dayMap.get(dayKey) ?? {amount: 0, count: 0};

    dayMap.set(dayKey, {
      amount: existing.amount + amount,
      count: existing.count + 1,
    });
  }

  const result: DailySpending[] = [];
  for (const [date, data] of dayMap.entries()) {
    result.push({
      date,
      amount: Math.round(data.amount * 100) / 100,
      invoiceCount: data.count,
    });
  }

  return result.toSorted((a, b) => a.date.localeCompare(b.date));
}

/**
 * Computes invoice price distribution buckets.
 *
 * @param invoices - Array of invoices to analyze
 * @returns Array of price buckets with counts and totals
 *
 * @remarks
 * **Performance:** O(n) where n is the number of invoices.
 *
 * **Buckets:**
 * Default buckets are: 0-5, 5-10, 10-25, 25-50, 50-100, 100+
 *
 * **Use Case:**
 * Useful for histogram visualization showing transaction size distribution.
 *
 * @example
 * ```typescript
 * const distribution = computePriceDistribution(invoices);
 * // Returns: [
 * //   { range: "0-5", min: 0, max: 5, count: 12, totalAmount: 45.67 },
 * //   { range: "5-10", min: 5, max: 10, count: 8, totalAmount: 67.89 }
 * // ]
 * ```
 */
export function computePriceDistribution(invoices: ReadonlyArray<Invoice>): PriceBucket[] {
  // Define buckets
  const buckets: Array<{min: number; max: number; range: string}> = [
    {min: 0, max: 5, range: "0-5"},
    {min: 5, max: 10, range: "5-10"},
    {min: 10, max: 25, range: "10-25"},
    {min: 25, max: 50, range: "25-50"},
    {min: 50, max: 100, range: "50-100"},
    {min: 100, max: Number.POSITIVE_INFINITY, range: "100+"},
  ];

  const bucketData = buckets.map((bucket) => ({
    ...bucket,
    count: 0,
    totalAmount: 0,
  }));

  for (const invoice of invoices) {
    const amount = getAmountInRON(invoice);

    // Find appropriate bucket
    for (const bucket of bucketData) {
      if (amount >= bucket.min && amount < bucket.max) {
        bucket.count++;
        bucket.totalAmount += amount;
        break;
      }
    }
  }

  return bucketData.map((bucket) => ({
    range: bucket.range,
    min: bucket.min,
    max: bucket.max === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : bucket.max,
    count: bucket.count,
    totalAmount: Math.round(bucket.totalAmount * 100) / 100,
  }));
}

/**
 * Computes spending by time-of-day segments.
 *
 * @param invoices - Array of invoices to analyze
 * @returns Array of time segment data
 *
 * @remarks
 * **Performance:** O(n) where n is the number of invoices.
 *
 * **Segments:**
 * - Morning: 6:00-12:00 (6 hours)
 * - Afternoon: 12:00-17:00 (5 hours)
 * - Evening: 17:00-21:00 (4 hours)
 * - Night: 21:00-6:00 (9 hours)
 *
 * **Use Case:**
 * Identifies user shopping patterns and behavioral trends.
 *
 * @example
 * ```typescript
 * const timeData = computeTimeOfDay(invoices);
 * // Returns: [
 * //   { segment: "Morning", invoiceCount: 34, totalAmount: 1234.56, averageAmount: 36.31 },
 * //   { segment: "Afternoon", invoiceCount: 45, totalAmount: 2345.67, averageAmount: 52.13 }
 * // ]
 * ```
 */
export function computeTimeOfDay(invoices: ReadonlyArray<Invoice>): TimeOfDaySegment[] {
  const segments = {
    Morning: {invoiceCount: 0, totalAmount: 0},
    Afternoon: {invoiceCount: 0, totalAmount: 0},
    Evening: {invoiceCount: 0, totalAmount: 0},
    Night: {invoiceCount: 0, totalAmount: 0},
  };

  for (const invoice of invoices) {
    const transactionDate = invoice.paymentInformation?.transactionDate ?? invoice.createdAt ?? new Date();
    const date = new Date(transactionDate);
    const hour = date.getHours();
    const amount = getAmountInRON(invoice);

    const segment: keyof typeof segments =
      hour >= 6 && hour < 12 ? "Morning" : hour >= 12 && hour < 17 ? "Afternoon" : hour >= 17 && hour < 21 ? "Evening" : "Night";

    segments[segment].invoiceCount++;
    segments[segment].totalAmount += amount;
  }

  return Object.entries(segments).map(([segment, data]) => ({
    segment,
    invoiceCount: data.invoiceCount,
    totalAmount: Math.round(data.totalAmount * 100) / 100,
    averageAmount: data.invoiceCount > 0 ? Math.round((data.totalAmount / data.invoiceCount) * 100) / 100 : 0,
  }));
}

/**
 * Creates an empty month comparison when no data is available.
 */
function createEmptyMonthComparison(): MonthComparison {
  const emptyMonth: MonthlySpending = {
    month: "",
    monthKey: "",
    amount: 0,
    invoiceCount: 0,
  };
  return {
    currentMonth: emptyMonth,
    previousMonth: null,
    spendingDelta: 0,
    spendingDeltaPercent: 0,
    invoiceCountDelta: 0,
    newMerchantCount: 0,
  };
}

/**
 * Calculates spending delta values between two months.
 */
function calculateSpendingDeltas(
  currentMonth: MonthlySpending,
  previousMonth: MonthlySpending | null,
): {spendingDelta: number; spendingDeltaPercent: number; invoiceCountDelta: number} {
  const spendingDelta = previousMonth ? currentMonth.amount - previousMonth.amount : currentMonth.amount;
  const spendingDeltaPercent =
    previousMonth && previousMonth.amount > 0 ? ((currentMonth.amount - previousMonth.amount) / previousMonth.amount) * 100 : 0;
  const invoiceCountDelta = previousMonth ? currentMonth.invoiceCount - previousMonth.invoiceCount : currentMonth.invoiceCount;

  return {spendingDelta, spendingDeltaPercent, invoiceCountDelta};
}

/**
 * Counts new merchants appearing in the current month for the first time.
 */
function countNewMerchants(invoices: ReadonlyArray<Invoice>, currentMonthStart: Date, currentMonthEnd: Date): number {
  const merchantsBeforeCurrent = new Set<string>();
  const merchantsInCurrent = new Set<string>();

  for (const invoice of invoices) {
    const transactionDate = invoice.paymentInformation?.transactionDate ?? invoice.createdAt ?? new Date();
    const date = new Date(transactionDate);
    const merchantId = invoice.merchantReference;

    if (merchantId) {
      if (date >= currentMonthStart && date <= currentMonthEnd) {
        merchantsInCurrent.add(merchantId);
      } else if (date < currentMonthStart) {
        merchantsBeforeCurrent.add(merchantId);
      }
    }
  }

  let newMerchantCount = 0;
  for (const merchantId of merchantsInCurrent) {
    if (!merchantsBeforeCurrent.has(merchantId)) {
      newMerchantCount++;
    }
  }

  return newMerchantCount;
}

/**
 * Computes month-over-month comparison for current vs previous month.
 *
 * @param invoices - Array of invoices to analyze
 * @returns Month comparison data with delta calculations
 *
 * @remarks
 * **Performance:** O(n) where n is the number of invoices.
 *
 * **Current/Previous Month:**
 * - Current month: Most recent calendar month with data
 * - Previous month: Calendar month immediately before current
 *
 * **Delta Calculations:**
 * - Spending delta: Absolute difference
 * - Spending delta percent: Percentage change
 * - New merchant count: Merchants appearing for first time in current month
 *
 * **Edge Cases:**
 * - No previous month: All previous month fields are null/zero
 * - Same spending: Delta percent is 0
 *
 * @example
 * ```typescript
 * const comparison = computeMonthComparison(invoices);
 * console.log(`Spending ${comparison.spendingDeltaPercent > 0 ? 'up' : 'down'} by ${Math.abs(comparison.spendingDeltaPercent)}%`);
 * ```
 */
export function computeMonthComparison(invoices: ReadonlyArray<Invoice>): MonthComparison {
  const monthlyData = computeMonthlySpending(invoices);

  if (monthlyData.length === 0) {
    return createEmptyMonthComparison();
  }

  const currentMonth = (monthlyData.at(-1) ?? null) as MonthlySpending;
  const previousMonth = monthlyData.length > 1 ? (monthlyData.at(-2) ?? null) : null;

  const {spendingDelta, spendingDeltaPercent, invoiceCountDelta} = calculateSpendingDeltas(currentMonth, previousMonth);

  // Calculate new merchants in current month
  const [currentYear, currentMonthNum] = currentMonth.monthKey.split("-");
  const currentMonthStart = new Date(Number(currentYear), Number(currentMonthNum) - 1, 1);
  const currentMonthEnd = new Date(Number(currentYear), Number(currentMonthNum), 0, 23, 59, 59);

  const newMerchantCount = countNewMerchants(invoices, currentMonthStart, currentMonthEnd);

  return {
    currentMonth,
    previousMonth,
    spendingDelta: Math.round(spendingDelta * 100) / 100,
    spendingDeltaPercent: Math.round(spendingDeltaPercent * 10) / 10,
    invoiceCountDelta,
    newMerchantCount,
  };
}

/**
 * Maps PaymentType enum values to human-readable labels.
 *
 * @param paymentType - Numeric payment type ID from PaymentType enum
 * @returns Human-readable payment type label
 *
 * @remarks
 * **Payment Type Mappings:**
 * - 0 (Unknown) → "Unknown"
 * - 100 (Cash) → "Cash"
 * - 200 (Card) → "Card"
 * - 300 (Transfer) → "Bank Transfer"
 * - 400 (MobilePayment) → "Mobile Payment"
 * - 500 (Voucher) → "Voucher"
 * - 9999 (Other) → "Other"
 * - Unknown → "Unknown"
 *
 * @example
 * ```typescript
 * const label = getPaymentTypeLabel(200); // "Card"
 * const label2 = getPaymentTypeLabel(400); // "Mobile Payment"
 * ```
 */
export function getPaymentTypeLabel(paymentType: number): string {
  const labels: Record<number, string> = {
    0: "Unknown",
    100: "Cash",
    200: "Card",
    300: "Bank Transfer",
    400: "Mobile Payment",
    500: "Voucher",
    9999: "Other",
  };

  return labels[paymentType] ?? "Unknown";
}
