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

import {formatDate, toSafeDate} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {getTransactionYear, toRON} from "../../../../../lib/currency";

/**
 * Empty GUID constant used to filter invalid merchant references.
 *
 * @remarks
 * Some invoices may have an all-zeros GUID as a placeholder merchantReference.
 * This constant enables consistent filtering across all merchant-related computations.
 */
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

/**
 * Validates whether a merchant reference is valid and non-empty.
 *
 * @param ref - Merchant reference string (may be undefined or null)
 * @returns `true` if the reference is valid, `false` otherwise
 *
 * @remarks
 * A valid merchant reference must:
 * - Be defined (not null/undefined)
 * - Not be the empty GUID (00000000-0000-0000-0000-000000000000)
 * - Have a non-zero length
 */
function isValidMerchantRef(ref: string | undefined | null): boolean {
  return ref != null && ref !== EMPTY_GUID && ref.length > 0;
}

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
  /** List of invoices in the month with id, name, and amount */
  invoices: ReadonlyArray<{id: string; name: string; amount: number}>;
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
 * Currency distribution data for multi-currency analysis.
 *
 * @remarks
 * Provides spending breakdown by currency to help users understand
 * their multi-currency spending patterns. All amounts are converted
 * to RON using yearly average exchange rates for comparison.
 *
 * **Sorting:**
 * Results are sorted by RON total (descending) to show highest-spend currencies first.
 *
 * **Percentage Calculation:**
 * Percentage represents share of total RON-normalized spending.
 *
 * **Single Currency Scenario:**
 * If all invoices use the same currency, returns single entry with 100% share.
 *
 * @example
 * ```typescript
 * const distribution = computeCurrencyDistribution(invoices);
 * distribution.forEach(curr => {
 *   console.log(`${curr.currencyCode}: ${curr.totalInRON.toFixed(2)} RON (${curr.percentage}%)`);
 * });
 * ```
 */
export type CurrencyDistribution = {
  /** ISO 4217 currency code (e.g., "EUR", "USD", "RON") */
  currencyCode: string;
  /** Currency symbol for display (e.g., "€", "$", "lei") */
  currencySymbol: string;
  /** Number of invoices in this currency */
  invoiceCount: number;
  /** Total spending in original currency */
  totalOriginal: number;
  /** Total spending converted to RON */
  totalInRON: number;
  /** Percentage of total RON spending (0-100) */
  percentage: number;
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
    if (isValidMerchantRef(merchantId)) {
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
  const monthInvoicesMap = new Map<string, Array<{id: string; name: string; amount: number}>>();

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

    // Collect invoice details for tooltip
    const invoiceList = monthInvoicesMap.get(monthKey) ?? [];
    invoiceList.push({
      id: invoice.id,
      name: invoice.name || `Invoice ${invoice.id.slice(0, 8)}`,
      amount: Math.round(amount * 100) / 100,
    });
    monthInvoicesMap.set(monthKey, invoiceList);
  }

  // Convert to array and sort chronologically
  const result: MonthlySpending[] = [];
  for (const [monthKey, data] of monthMap.entries()) {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);

    // Format month label (e.g., "Jan 2025")
    const monthLabel = formatDate(date, {
      locale: "en-US",
      month: "short",
      year: "numeric",
    });

    result.push({
      month: monthLabel,
      monthKey,
      amount: Math.round(data.amount * 100) / 100,
      invoiceCount: data.count,
      invoices: monthInvoicesMap.get(monthKey) ?? [],
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
    if (isValidMerchantRef(merchantId)) {
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
    // Use toSafeDate for robust parsing with fallback to createdAt
    let date = toSafeDate(invoice.paymentInformation?.transactionDate);

    // If transaction date is invalid, fall back to createdAt
    if (date.getTime() === 0) {
      date = toSafeDate(invoice.createdAt);
      // Skip invoice if both dates are invalid
      if (date.getTime() === 0) continue;
    }

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
    invoices: [],
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

    if (isValidMerchantRef(merchantId)) {
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

/**
 * Merchant spending trend data for time-series visualization.
 *
 * @remarks
 * Provides monthly spending breakdown for individual merchants,
 * enabling trend analysis and comparison across merchants.
 *
 * **Use Case:**
 * Display top N merchants' spending patterns over time to identify
 * changes in shopping behavior or merchant preference shifts.
 *
 * @example
 * ```typescript
 * const trends = computeMerchantTrends(invoices, 5);
 * const topMerchant = trends[0];
 * console.log(`${topMerchant.merchantId}: ${topMerchant.totalSpend} total`);
 * ```
 */
export type MerchantTrend = {
  /** Merchant unique identifier */
  merchantId: string;
  /** Monthly spending data points */
  monthlyData: Array<{
    /** Month key in YYYY-MM format */
    monthKey: string;
    /** Spending amount in that month */
    amount: number;
  }>;
  /** Total spending across all months */
  totalSpend: number;
};

/**
 * Merchant visit pattern analysis data.
 *
 * @remarks
 * Provides behavioral insights into shopping frequency and patterns
 * at specific merchants. Useful for understanding habitual shopping
 * behavior and identifying preferred shopping days.
 *
 * **Calculation Notes:**
 * - Visit = one invoice
 * - Day of week uses native JavaScript Date.getDay() (0=Sunday)
 * - Basket size = average number of items per invoice
 *
 * @example
 * ```typescript
 * const patterns = computeMerchantVisitFrequency(invoices);
 * const pattern = patterns[0];
 * console.log(`Shop at ${pattern.merchantId} every ${pattern.averageVisitsPerMonth} times/month`);
 * console.log(`Usually on ${pattern.mostCommonDayOfWeek}`);
 * ```
 */
export type MerchantVisitPattern = {
  /** Merchant unique identifier */
  merchantId: string;
  /** Total number of visits (invoices) */
  totalVisits: number;
  /** Average visits per month */
  averageVisitsPerMonth: number;
  /** Most common shopping day (0=Sunday, 6=Saturday) */
  mostCommonDayOfWeek: number;
  /** Average number of items per visit */
  averageBasketSize: number;
  /** Average spending per visit */
  averageSpendPerVisit: number;
};

/**
 * Computes spending trends for top N merchants over time.
 *
 * @param invoices - Array of invoices to analyze
 * @param topN - Number of top merchants to include (default: 5)
 * @returns Array of merchant trends, sorted by total spend descending
 *
 * @remarks
 * **Algorithm:**
 * 1. Aggregate total spending per merchant
 * 2. Select top N merchants by total spend
 * 3. For each top merchant, compute monthly spending breakdown
 * 4. Sort results by total spend descending
 *
 * **Performance:** O(n) for aggregation + O(m log m) for sorting merchants,
 * where n = invoice count, m = unique merchant count.
 *
 * **Use Case:**
 * Visualize spending trends for favorite merchants to identify
 * seasonal patterns or changes in shopping behavior.
 *
 * @example
 * ```typescript
 * const trends = computeMerchantTrends(invoices, 3);
 * // Returns top 3 merchants with their monthly spending data
 * trends.forEach(trend => {
 *   console.log(`${trend.merchantId}: ${trend.monthlyData.length} months`);
 * });
 * ```
 */
export function computeMerchantTrends(invoices: ReadonlyArray<Invoice>, topN: number = 5): MerchantTrend[] {
  // Step 1: Compute total spending per merchant
  const merchantTotals = new Map<string, number>();

  for (const invoice of invoices) {
    const merchantId = invoice.merchantReference;
    if (!isValidMerchantRef(merchantId)) continue;

    const amount = getAmountInRON(invoice);
    merchantTotals.set(merchantId, (merchantTotals.get(merchantId) ?? 0) + amount);
  }

  // Step 2: Select top N merchants
  const sortedMerchants = Array.from(merchantTotals.entries())
    .toSorted(([, aTotal], [, bTotal]) => bTotal - aTotal)
    .slice(0, topN);

  const topMerchantIds = new Set(sortedMerchants.map(([id]) => id));

  // Step 3: Compute monthly data for top merchants
  const merchantMonthlyData = new Map<string, Map<string, number>>();

  for (const invoice of invoices) {
    const merchantId = invoice.merchantReference;
    if (!isValidMerchantRef(merchantId) || !topMerchantIds.has(merchantId)) continue;

    const transactionDate = invoice.paymentInformation?.transactionDate ?? invoice.createdAt ?? new Date();
    const date = new Date(transactionDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const amount = getAmountInRON(invoice);

    if (!merchantMonthlyData.has(merchantId)) {
      merchantMonthlyData.set(merchantId, new Map());
    }

    const monthlyMap = merchantMonthlyData.get(merchantId)!;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + amount);
  }

  // Step 4: Build result array
  const result: MerchantTrend[] = [];

  for (const [merchantId, totalSpend] of sortedMerchants) {
    const monthlyMap = merchantMonthlyData.get(merchantId);
    const monthlyData = monthlyMap
      ? Array.from(monthlyMap.entries())
          .map(([monthKey, amount]) => ({
            monthKey,
            amount: Math.round(amount * 100) / 100,
          }))
          .toSorted((a, b) => a.monthKey.localeCompare(b.monthKey))
      : [];

    result.push({
      merchantId,
      monthlyData,
      totalSpend: Math.round(totalSpend * 100) / 100,
    });
  }

  return result;
}

/**
 * Computes visit frequency and shopping patterns per merchant.
 *
 * @param invoices - Array of invoices to analyze
 * @returns Array of merchant visit patterns, sorted by total visits descending
 *
 * @remarks
 * **Algorithm:**
 * 1. Group invoices by merchant
 * 2. For each merchant, calculate:
 *    - Total visits (invoice count)
 *    - Date range to determine average visits per month
 *    - Day-of-week frequency distribution
 *    - Average basket size (items per invoice)
 *
 * **Performance:** O(n) where n = invoice count.
 *
 * **Day of Week:**
 * Uses native Date.getDay() where 0=Sunday, 6=Saturday.
 * Converts to human-readable names like "Monday", "Tuesday", etc.
 *
 * @example
 * ```typescript
 * const patterns = computeMerchantVisitFrequency(invoices);
 * const topPattern = patterns[0];
 * console.log(`Visit ${topPattern.merchantId} ~${topPattern.averageVisitsPerMonth.toFixed(1)}x/month`);
 * console.log(`Usually on ${topPattern.mostCommonDayOfWeek}`);
 * console.log(`Avg basket: ${topPattern.averageBasketSize} items`);
 * ```
 */
export function computeMerchantVisitFrequency(invoices: ReadonlyArray<Invoice>): MerchantVisitPattern[] {
  type MerchantData = {
    visits: number;
    dates: Date[];
    dayOfWeekCounts: Map<number, number>;
    totalItems: number;
    totalSpend: number;
  };

  const merchantData = new Map<string, MerchantData>();

  // Aggregate data per merchant
  for (const invoice of invoices) {
    const merchantId = invoice.merchantReference;
    if (!isValidMerchantRef(merchantId)) continue;

    const transactionDate = invoice.paymentInformation?.transactionDate ?? invoice.createdAt ?? new Date();
    const date = new Date(transactionDate);
    const dayOfWeek = date.getDay();

    const itemCount = invoice.items?.length ?? 0;
    const amount = getAmountInRON(invoice);

    if (!merchantData.has(merchantId)) {
      merchantData.set(merchantId, {
        visits: 0,
        dates: [],
        dayOfWeekCounts: new Map(),
        totalItems: 0,
        totalSpend: 0,
      });
    }

    const data = merchantData.get(merchantId)!;
    data.visits += 1;
    data.dates.push(date);
    data.dayOfWeekCounts.set(dayOfWeek, (data.dayOfWeekCounts.get(dayOfWeek) ?? 0) + 1);
    data.totalItems += itemCount;
    data.totalSpend += amount;
  }

  // Build result array
  const result: MerchantVisitPattern[] = [];

  for (const [merchantId, data] of merchantData.entries()) {
    // Calculate average visits per month
    const sortedDates = data.dates.toSorted((a, b) => a.getTime() - b.getTime());
    const [firstDate] = sortedDates;
    const lastDate = sortedDates[sortedDates.length - 1];

    let monthsSpan = 1; // Default to 1 month minimum

    if (firstDate && lastDate && sortedDates.length > 1) {
      const msPerMonth = 30.44 * 24 * 60 * 60 * 1000; // Average days per month
      monthsSpan = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / msPerMonth);
    }

    const averageVisitsPerMonth = data.visits / monthsSpan;

    // Find most common day of week
    let mostCommonDay = 0;
    let maxCount = 0;

    for (const [day, count] of data.dayOfWeekCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonDay = day;
      }
    }

    // Calculate averages
    const averageBasketSize = data.visits > 0 ? data.totalItems / data.visits : 0;
    const averageSpendPerVisit = data.visits > 0 ? data.totalSpend / data.visits : 0;

    result.push({
      merchantId,
      totalVisits: data.visits,
      averageVisitsPerMonth: Math.round(averageVisitsPerMonth * 100) / 100,
      mostCommonDayOfWeek: mostCommonDay,
      averageBasketSize: Math.round(averageBasketSize * 100) / 100,
      averageSpendPerVisit: Math.round(averageSpendPerVisit * 100) / 100,
    });
  }

  return result.toSorted((a, b) => b.totalVisits - a.totalVisits);
}

/**
 * Product category spending aggregate for product-level analytics.
 *
 * @remarks
 * Groups all products across all invoices by ProductCategory enum.
 * Provides spending insights at the product category level (not invoice category).
 *
 * **Calculation:**
 * - Aggregates `product.totalPrice` across all invoices
 * - Normalizes to RON using invoice's transaction year
 * - Computes percentage of total product spending
 *
 * @example
 * ```typescript
 * const categoryData = computeProductCategorySpending(invoices);
 * // Returns: [
 * //   { category: "Dairy", categoryId: 300, totalSpent: 1234.56, productCount: 45, percentage: 15.2 },
 * //   { category: "Meat", categoryId: 400, totalSpent: 987.65, productCount: 32, percentage: 12.1 }
 * // ]
 * ```
 */
export type ProductCategorySpending = {
  /** Human-readable category name */
  category: string;
  /** Numeric category ID from ProductCategory enum */
  categoryId: number;
  /** Total spending in this category (RON) */
  totalSpent: number;
  /** Number of products in this category */
  productCount: number;
  /** Percentage of total product spending */
  percentage: number;
};

/**
 * Top product aggregate for most-purchased items analysis.
 *
 * @remarks
 * Aggregates products by name to identify
 * most frequently purchased items and spending patterns.
 *
 * **Aggregation Key:**
 * Products are grouped by `name`.
 * This handles slight variations in OCR output for the same product.
 *
 * @example
 * ```typescript
 * const topProducts = computeTopProducts(invoices, 10);
 * // Returns: [
 * //   { name: "Milk 2% 1L", totalQuantity: 24, totalSpent: 215.76, purchaseCount: 12, averagePrice: 8.99 },
 * //   { name: "Bread White", totalQuantity: 18, totalSpent: 89.10, purchaseCount: 18, averagePrice: 4.95 }
 * // ]
 * ```
 */
export type TopProduct = {
  /** Product name */
  name: string;
  /** Total quantity purchased across all invoices */
  totalQuantity: number;
  /** Total spending on this product (RON) */
  totalSpent: number;
  /** Number of invoices containing this product */
  purchaseCount: number;
  /** Average price per unit */
  averagePrice: number;
};

/**
 * Allergen frequency aggregate for dietary tracking.
 *
 * @remarks
 * Counts allergen occurrences across all products to help users identify
 * allergen exposure in their purchases.
 *
 * **Use Case:**
 * Useful for dietary restrictions, health tracking, and allergen awareness.
 *
 * @example
 * ```typescript
 * const allergens = computeAllergenFrequency(invoices);
 * // Returns: [
 * //   { name: "Lactose", description: "Found in dairy products", productCount: 34, percentage: 12.3 },
 * //   { name: "Gluten", description: "Found in wheat products", productCount: 28, percentage: 10.1 }
 * // ]
 * ```
 */
export type AllergenFrequency = {
  /** Allergen name */
  name: string;
  /** Allergen description */
  description: string;
  /** Number of products containing this allergen */
  productCount: number;
  /** Percentage of total products */
  percentage: number;
};

/**
 * Maps ProductCategory enum values to human-readable labels.
 *
 * @param categoryId - Numeric category ID from ProductCategory enum
 * @returns Human-readable category label
 *
 * @remarks
 * **Category Mappings:**
 * - 0 (NOT_DEFINED) → "Uncategorized"
 * - 100 (BAKED_GOODS) → "Baked Goods"
 * - 200 (GROCERIES) → "Groceries"
 * - 300 (DAIRY) → "Dairy"
 * - 400 (MEAT) → "Meat"
 * - 500 (FISH) → "Fish"
 * - 600 (FRUITS) → "Fruits"
 * - 700 (VEGETABLES) → "Vegetables"
 * - 800 (BEVERAGES) → "Beverages"
 * - 900 (ALCOHOLIC_BEVERAGES) → "Alcoholic Beverages"
 * - 1000 (TOBACCO) → "Tobacco"
 * - 1100 (CLEANING_SUPPLIES) → "Cleaning Supplies"
 * - 1200 (PERSONAL_CARE) → "Personal Care"
 * - 1300 (MEDICINE) → "Medicine"
 * - 9999 (OTHER) → "Other"
 * - Unknown → "Unknown"
 *
 * @example
 * ```typescript
 * const label = getProductCategoryLabel(300); // "Dairy"
 * const label2 = getProductCategoryLabel(400); // "Meat"
 * ```
 */
export function getProductCategoryLabel(categoryId: number): string {
  const labels: Record<number, string> = {
    0: "Uncategorized",
    100: "Baked Goods",
    200: "Groceries",
    300: "Dairy",
    400: "Meat",
    500: "Fish",
    600: "Fruits",
    700: "Vegetables",
    800: "Beverages",
    900: "Alcoholic Beverages",
    1000: "Tobacco",
    1100: "Cleaning Supplies",
    1200: "Personal Care",
    1300: "Medicine",
    9999: "Other",
  };

  return labels[categoryId] ?? "Unknown";
}

/**
 * Computes spending aggregates by product category.
 *
 * @param invoices - Array of invoices to analyze
 * @returns Array of product category spending data, sorted by totalSpent descending
 *
 * @remarks
 * **Performance:** O(n * m) where n is the number of invoices and m is average items per invoice.
 *
 * **Currency Normalization:**
 * All product prices are converted to RON using the invoice's transaction year
 * exchange rate. This ensures accurate cross-currency aggregation.
 *
 * **Soft Delete Handling:**
 * Products with `metadata.isSoftDeleted = true` are excluded from calculations.
 *
 * @example
 * ```typescript
 * const categorySpending = computeProductCategorySpending(invoices);
 * const dairySpending = categorySpending.find(c => c.categoryId === 300);
 * console.log(`Dairy: ${dairySpending?.totalSpent.toFixed(2)} RON`);
 * ```
 */
export function computeProductCategorySpending(invoices: ReadonlyArray<Invoice>): ProductCategorySpending[] {
  const categoryMap = new Map<number, {totalSpent: number; productCount: number}>();
  let grandTotal = 0;

  for (const invoice of invoices) {
    const currencyCode = invoice.paymentInformation?.currency?.code ?? "RON";
    const year = getTransactionYear(invoice.paymentInformation?.transactionDate, invoice.createdAt);

    const items = invoice.items ?? [];
    for (const product of items) {
      // Skip soft-deleted products
      if (product.metadata?.isSoftDeleted) continue;

      const category = product.category ?? 0;
      const productPriceRON = toRON(product.totalPrice, currencyCode, year);

      const existing = categoryMap.get(category) ?? {totalSpent: 0, productCount: 0};
      categoryMap.set(category, {
        totalSpent: existing.totalSpent + productPriceRON,
        productCount: existing.productCount + 1,
      });

      grandTotal += productPriceRON;
    }
  }

  const result: ProductCategorySpending[] = [];
  for (const [categoryId, data] of categoryMap.entries()) {
    const percentage = grandTotal > 0 ? (data.totalSpent / grandTotal) * 100 : 0;

    result.push({
      category: getProductCategoryLabel(categoryId),
      categoryId,
      totalSpent: Math.round(data.totalSpent * 100) / 100,
      productCount: data.productCount,
      percentage: Math.round(percentage * 10) / 10,
    });
  }

  return result.toSorted((a, b) => b.totalSpent - a.totalSpent);
}

/**
 * Computes top N most purchased products across all invoices.
 *
 * @param invoices - Array of invoices to analyze
 * @param topN - Number of top products to return (default: 10)
 * @returns Array of top products, sorted by totalSpent descending
 *
 * @remarks
 * **Performance:** O(n * m * log(n * m)) where n is invoices and m is items per invoice.
 *
 * **Product Identification:**
 * Products are grouped by `name`.
 * This handles OCR variations for the same product.
 *
 * **Currency Normalization:**
 * All amounts are converted to RON for accurate cross-currency aggregation.
 *
 * **Soft Delete Handling:**
 * Products with `metadata.isSoftDeleted = true` are excluded.
 *
 * @example
 * ```typescript
 * const topProducts = computeTopProducts(invoices, 5);
 * topProducts.forEach(product => {
 *   console.log(`${product.name}: ${product.totalQuantity} units, ${product.totalSpent} RON`);
 * });
 * ```
 */
export function computeTopProducts(invoices: ReadonlyArray<Invoice>, topN = 10): TopProduct[] {
  const productMap = new Map<
    string,
    {
      totalQuantity: number;
      totalSpent: number;
      purchaseCount: number;
      priceSum: number;
      priceCount: number;
    }
  >();

  for (const invoice of invoices) {
    const currencyCode = invoice.paymentInformation?.currency?.code ?? "RON";
    const year = getTransactionYear(invoice.paymentInformation?.transactionDate, invoice.createdAt);

    const items = invoice.items ?? [];
    for (const product of items) {
      // Skip soft-deleted products
      if (product.metadata?.isSoftDeleted) continue;

      // Use product name
      const productName = product.name;
      if (!productName) continue;

      const productPriceRON = toRON(product.totalPrice, currencyCode, year);
      const unitPriceRON = toRON(product.price, currencyCode, year);

      const existing = productMap.get(productName) ?? {
        totalQuantity: 0,
        totalSpent: 0,
        purchaseCount: 0,
        priceSum: 0,
        priceCount: 0,
      };

      productMap.set(productName, {
        totalQuantity: existing.totalQuantity + product.quantity,
        totalSpent: existing.totalSpent + productPriceRON,
        purchaseCount: existing.purchaseCount + 1,
        priceSum: existing.priceSum + unitPriceRON,
        priceCount: existing.priceCount + 1,
      });
    }
  }

  const result: TopProduct[] = [];
  for (const [name, data] of productMap.entries()) {
    const averagePrice = data.priceCount > 0 ? data.priceSum / data.priceCount : 0;

    result.push({
      name,
      totalQuantity: Math.round(data.totalQuantity * 100) / 100,
      totalSpent: Math.round(data.totalSpent * 100) / 100,
      purchaseCount: data.purchaseCount,
      averagePrice: Math.round(averagePrice * 100) / 100,
    });
  }

  // Sort by totalSpent descending and return top N
  return result.toSorted((a, b) => b.totalSpent - a.totalSpent).slice(0, topN);
}

/**
 * Computes allergen frequency across all products.
 *
 * @param invoices - Array of invoices to analyze
 * @returns Array of allergen frequencies, sorted by productCount descending
 *
 * @remarks
 * **Performance:** O(n * m * a) where n is invoices, m is items per invoice,
 * and a is allergens per product (typically small).
 *
 * **Allergen Identification:**
 * Allergens are identified by name and aggregated across all products.
 * The description is taken from the first occurrence of each allergen.
 *
 * **Percentage Calculation:**
 * Percentage is computed as (products with allergen / total products) * 100.
 *
 * **Soft Delete Handling:**
 * Products with `metadata.isSoftDeleted = true` are excluded.
 *
 * @example
 * ```typescript
 * const allergens = computeAllergenFrequency(invoices);
 * allergens.forEach(allergen => {
 *   console.log(`${allergen.name}: ${allergen.productCount} products (${allergen.percentage}%)`);
 * });
 * ```
 */
export function computeAllergenFrequency(invoices: ReadonlyArray<Invoice>): AllergenFrequency[] {
  const allergenMap = new Map<string, {description: string; productCount: number}>();
  let totalProducts = 0;

  for (const invoice of invoices) {
    const items = invoice.items ?? [];
    for (const product of items) {
      // Skip soft-deleted products
      if (product.metadata?.isSoftDeleted) continue;

      totalProducts++;

      const allergens = product.detectedAllergens ?? [];
      for (const allergen of allergens) {
        const existing = allergenMap.get(allergen.name);
        if (existing) {
          allergenMap.set(allergen.name, {
            description: existing.description,
            productCount: existing.productCount + 1,
          });
        } else {
          allergenMap.set(allergen.name, {
            description: allergen.description,
            productCount: 1,
          });
        }
      }
    }
  }

  const result: AllergenFrequency[] = [];
  for (const [name, data] of allergenMap.entries()) {
    const percentage = totalProducts > 0 ? (data.productCount / totalProducts) * 100 : 0;

    result.push({
      name,
      description: data.description,
      productCount: data.productCount,
      percentage: Math.round(percentage * 10) / 10,
    });
  }

  return result.toSorted((a, b) => b.productCount - a.productCount);
}

/**
 * Computes currency distribution across all invoices.
 *
 * @param invoices - Array of invoices to analyze
 * @returns Array of currency distribution data, sorted by RON total (descending)
 *
 * @remarks
 * **Performance:** O(n) where n is the number of invoices.
 *
 * **Currency Normalization:**
 * - All amounts are converted to RON using `toRON` with transaction year
 * - Original currency amounts are preserved for reference
 * - Uses `paymentInformation.currency` for identification
 *
 * **Edge Cases:**
 * - Empty array: Returns empty array
 * - Missing currency info: Defaults to "RON"
 * - Single currency: Returns one entry with 100% percentage
 *
 * **Percentage Rounding:**
 * Percentages are rounded to one decimal place for display clarity.
 *
 * @example
 * ```typescript
 * const distribution = computeCurrencyDistribution(invoices);
 * // Multi-currency result:
 * // [
 * //   { currencyCode: "EUR", totalInRON: 5000, percentage: 55.5, ... },
 * //   { currencyCode: "USD", totalInRON: 3000, percentage: 33.3, ... },
 * //   { currencyCode: "RON", totalInRON: 1000, percentage: 11.1, ... }
 * // ]
 * ```
 */
export function computeCurrencyDistribution(invoices: ReadonlyArray<Invoice>): CurrencyDistribution[] {
  if (invoices.length === 0) {
    return [];
  }

  // Map: currencyCode -> { symbol, invoiceCount, totalOriginal, totalInRON }
  const currencyMap = new Map<
    string,
    {
      symbol: string;
      invoiceCount: number;
      totalOriginal: number;
      totalInRON: number;
    }
  >();

  // Aggregate spending by currency
  for (const invoice of invoices) {
    const currencyCode = invoice.paymentInformation?.currency?.code ?? "RON";
    const currencySymbol = invoice.paymentInformation?.currency?.symbol ?? "lei";
    const amount = invoice.paymentInformation?.totalCostAmount ?? 0;
    const year = getTransactionYear(invoice.paymentInformation?.transactionDate, invoice.createdAt);
    const amountInRON = toRON(amount, currencyCode, year);

    const existing = currencyMap.get(currencyCode);
    if (existing) {
      currencyMap.set(currencyCode, {
        symbol: existing.symbol,
        invoiceCount: existing.invoiceCount + 1,
        totalOriginal: existing.totalOriginal + amount,
        totalInRON: existing.totalInRON + amountInRON,
      });
    } else {
      currencyMap.set(currencyCode, {
        symbol: currencySymbol,
        invoiceCount: 1,
        totalOriginal: amount,
        totalInRON: amountInRON,
      });
    }
  }

  // Calculate total RON spending for percentage computation
  let grandTotalRON = 0;
  for (const data of currencyMap.values()) {
    grandTotalRON += data.totalInRON;
  }

  // Build result array with percentages
  const result: CurrencyDistribution[] = [];
  for (const [code, data] of currencyMap.entries()) {
    const percentage = grandTotalRON > 0 ? (data.totalInRON / grandTotalRON) * 100 : 0;
    result.push({
      currencyCode: code,
      currencySymbol: data.symbol,
      invoiceCount: data.invoiceCount,
      totalOriginal: Math.round(data.totalOriginal * 100) / 100,
      totalInRON: Math.round(data.totalInRON * 100) / 100,
      percentage: Math.round(percentage * 10) / 10,
    });
  }

  // Sort by RON total (descending)
  return result.toSorted((a, b) => b.totalInRON - a.totalInRON);
}
