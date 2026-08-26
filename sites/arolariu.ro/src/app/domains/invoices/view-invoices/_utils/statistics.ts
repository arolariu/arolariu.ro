/** @fileoverview Pure, RON-normalized cross-invoice aggregate statistics. */

import {formatDate, toSafeDate} from "@/lib/utils.generic";
import type {Invoice, Product} from "@/types/invoices";
import {AllergenAssessmentStatus, type AllergenCode} from "@/types/invoices/Allergen";
import {getTransactionYear, toRON} from "../../../../../lib/currency";
import {getClassificationGroup} from "../../_utils/labelUtilities";

/** Empty GUID used to filter placeholder merchant references. */
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

/** Determines whether a merchant reference is non-empty and non-placeholder. */
function isValidMerchantRef(ref: string | undefined | null): boolean {
  return ref !== null && ref !== undefined && ref !== EMPTY_GUID && ref.length > 0;
}

/** Returns an invoice amount normalized to RON for its transaction year. */
function getAmountInRON(invoice: Invoice): number {
  const amount = invoice.paymentInformation?.totalCostAmount ?? 0;
  const currencyCode = invoice.paymentInformation?.currency?.code ?? "RON";
  const year = getTransactionYear(invoice.paymentInformation?.transactionDate, invoice.createdAt);
  return toRON(amount, currencyCode, year);
}

/** Key performance indicators for the statistics summary. */
export type KPIData = {
  totalSpending: number;
  invoiceCount: number;
  averagePerInvoice: number;
  mostFrequentMerchant: {id: string; count: number} | null;
  averageItemsPerInvoice: number;
  totalItems: number;
  currency: string;
};

/** Calendar-month spending aggregate for trend charts. */
export type MonthlySpending = {
  month: string;
  monthKey: string;
  amount: number;
  invoiceCount: number;
  invoices: ReadonlyArray<{id: string; name: string; amount: number}>;
};

/** Invoice spending grouped by canonical taxonomy root. */
export type ClassificationGroupAggregate = {
  category: string;
  amount: number;
  count: number;
  percentage: number;
};

/** Spending and visit aggregate for one merchant. */
export type MerchantAggregate = {
  merchantId: string;
  totalSpend: number;
  invoiceCount: number;
  averageSpend: number;
};

/** Daily spending aggregate for calendar heatmaps. */
export type DailySpending = {
  date: string;
  amount: number;
  invoiceCount: number;
};

/** One histogram bucket in the invoice price distribution. */
export type PriceBucket = {
  range: string;
  min: number;
  max: number;
  count: number;
  totalAmount: number;
};

/** Spending aggregate for one time-of-day segment. */
export type TimeOfDaySegment = {
  segment: string;
  invoiceCount: number;
  totalAmount: number;
  averageAmount: number;
};

/** Current-versus-previous-month spending comparison. */
export type MonthComparison = {
  currentMonth: MonthlySpending;
  previousMonth: MonthlySpending | null;
  spendingDelta: number;
  spendingDeltaPercent: number;
  invoiceCountDelta: number;
  newMerchantCount: number;
};

/** Original and RON-normalized totals for one currency. */
export type CurrencyDistribution = {
  currencyCode: string;
  currencySymbol: string;
  invoiceCount: number;
  totalOriginal: number;
  totalInRON: number;
  percentage: number;
};

/** Computes RON-normalized key performance indicators. */
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

/** Computes chronological calendar-month spending aggregates. */
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

/** Groups invoice spending by canonical taxonomy root, including unclassified invoices. */
export function computeClassificationGroupAggregates(invoices: ReadonlyArray<Invoice>): ClassificationGroupAggregate[] {
  const groupMap = new Map<string, {amount: number; count: number}>();
  let totalSpending = 0;

  for (const invoice of invoices) {
    const group = getClassificationGroup(invoice.classification ?? null) ?? "unclassified";
    const amount = getAmountInRON(invoice);
    totalSpending += amount;

    const existing = groupMap.get(group) ?? {amount: 0, count: 0};
    groupMap.set(group, {
      amount: existing.amount + amount,
      count: existing.count + 1,
    });
  }

  const result: ClassificationGroupAggregate[] = [];
  for (const [group, data] of groupMap.entries()) {
    const percentage = totalSpending > 0 ? (data.amount / totalSpending) * 100 : 0;

    result.push({
      category: group,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
      percentage: Math.round(percentage * 10) / 10,
    });
  }

  return result.toSorted((a, b) => b.amount - a.amount);
}

/** Computes merchant aggregates sorted by total spend. */
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

/** Computes chronological daily spending for calendar heatmaps. */
export function computeDailySpending(invoices: ReadonlyArray<Invoice>): DailySpending[] {
  const dayMap = new Map<string, {amount: number; count: number}>();

  for (const invoice of invoices) {
    // Use toSafeDate for robust parsing with fallback to createdAt
    let date = toSafeDate(invoice.paymentInformation?.transactionDate);

    // If transaction date is invalid, fall back to createdAt
    if (date.getTime() === 0) {
      date = toSafeDate(invoice.createdAt);
    }

    // Skip invoice if both dates are invalid
    if (date.getTime() !== 0) {
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

/** Computes fixed RON price-distribution buckets. */
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

/** Maps an hour to its statistics time-of-day segment. */
function getTimeSegment(hour: number): "Morning" | "Afternoon" | "Evening" | "Night" {
  if (hour >= 6 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

/** Computes spending aggregates for fixed time-of-day segments. */
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

    const segment = getTimeSegment(hour);

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

/** Creates an empty month comparison. */
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

/** Calculates spending deltas between two months. */
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

/** Counts merchants appearing for the first time in the current month. */
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

/** Compares the latest calendar month with its predecessor. */
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

/** Maps payment-type wire values to their legacy statistics labels. */
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

/** Monthly spending trend for one merchant. */
export type MerchantTrend = {
  merchantId: string;
  monthlyData: Array<{
    monthKey: string;
    amount: number;
  }>;
  totalSpend: number;
};

/** Visit frequency and basket averages for one merchant. */
export type MerchantVisitPattern = {
  merchantId: string;
  totalVisits: number;
  averageVisitsPerMonth: number;
  mostCommonDayOfWeek: number;
  averageBasketSize: number;
  averageSpendPerVisit: number;
};

type MerchantVisitData = {
  visits: number;
  dates: Date[];
  dayOfWeekCounts: Map<number, number>;
  totalItems: number;
  totalSpend: number;
};

function getMerchantVisitData(merchantData: Map<string, MerchantVisitData>, merchantId: string): MerchantVisitData {
  const existing = merchantData.get(merchantId);
  if (existing !== undefined) return existing;
  const created: MerchantVisitData = {
    visits: 0,
    dates: [],
    dayOfWeekCounts: new Map(),
    totalItems: 0,
    totalSpend: 0,
  };
  merchantData.set(merchantId, created);
  return created;
}

function addMerchantVisit(merchantData: Map<string, MerchantVisitData>, invoice: Invoice): void {
  const merchantId = invoice.merchantReference;
  if (!isValidMerchantRef(merchantId)) return;
  const transactionDate = invoice.paymentInformation?.transactionDate ?? invoice.createdAt ?? new Date();
  const date = new Date(transactionDate);
  const data = getMerchantVisitData(merchantData, merchantId);
  data.visits += 1;
  data.dates.push(date);
  data.dayOfWeekCounts.set(date.getDay(), (data.dayOfWeekCounts.get(date.getDay()) ?? 0) + 1);
  data.totalItems += invoice.items?.length ?? 0;
  data.totalSpend += getAmountInRON(invoice);
}

function calculateMonthsSpan(dates: readonly Date[]): number {
  const sortedDates = dates.toSorted((left, right) => left.getTime() - right.getTime());
  const [firstDate] = sortedDates;
  const lastDate = sortedDates.at(-1);
  if (firstDate === undefined || lastDate === undefined || sortedDates.length <= 1) return 1;
  const millisecondsPerMonth = 30.44 * 24 * 60 * 60 * 1000;
  return Math.max(1, (lastDate.getTime() - firstDate.getTime()) / millisecondsPerMonth);
}

function findMostCommonDay(dayOfWeekCounts: ReadonlyMap<number, number>): number {
  let mostCommonDay = 0;
  let maximumCount = 0;
  for (const [day, count] of dayOfWeekCounts) {
    if (count > maximumCount) {
      maximumCount = count;
      mostCommonDay = day;
    }
  }
  return mostCommonDay;
}

function createMerchantVisitPattern(merchantId: string, data: MerchantVisitData): MerchantVisitPattern {
  const averageVisitsPerMonth = data.visits / calculateMonthsSpan(data.dates);
  const averageBasketSize = data.visits > 0 ? data.totalItems / data.visits : 0;
  const averageSpendPerVisit = data.visits > 0 ? data.totalSpend / data.visits : 0;
  return {
    merchantId,
    totalVisits: data.visits,
    averageVisitsPerMonth: Math.round(averageVisitsPerMonth * 100) / 100,
    mostCommonDayOfWeek: findMostCommonDay(data.dayOfWeekCounts),
    averageBasketSize: Math.round(averageBasketSize * 100) / 100,
    averageSpendPerVisit: Math.round(averageSpendPerVisit * 100) / 100,
  };
}

/** Computes monthly trends for the top merchants by total spend. */
export function computeMerchantTrends(invoices: ReadonlyArray<Invoice>, topN: number = 5): MerchantTrend[] {
  // Step 1: Compute total spending per merchant
  const merchantTotals = new Map<string, number>();

  for (const invoice of invoices) {
    const merchantId = invoice.merchantReference;
    if (isValidMerchantRef(merchantId)) {
      const amount = getAmountInRON(invoice);
      merchantTotals.set(merchantId, (merchantTotals.get(merchantId) ?? 0) + amount);
    }
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
    if (isValidMerchantRef(merchantId) && topMerchantIds.has(merchantId)) {
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

/** Computes merchant visit patterns sorted by total visits. */
export function computeMerchantVisitFrequency(invoices: ReadonlyArray<Invoice>): MerchantVisitPattern[] {
  const merchantData = new Map<string, MerchantVisitData>();
  for (const invoice of invoices) {
    addMerchantVisit(merchantData, invoice);
  }

  const result: MerchantVisitPattern[] = [];
  for (const [merchantId, data] of merchantData.entries()) {
    result.push(createMerchantVisitPattern(merchantId, data));
  }

  return result.toSorted((a, b) => b.totalVisits - a.totalVisits);
}

/** Product spending grouped by canonical taxonomy root. */
export type ProductClassificationSpending = {
  category: string;
  totalSpent: number;
  productCount: number;
  percentage: number;
};

/** Purchase and price aggregate for one product name. */
export type TopProduct = {
  name: string;
  totalQuantity: number;
  totalSpent: number;
  purchaseCount: number;
  averagePrice: number;
};

/** EU-14 frequency using assessed products as the denominator. */
export type AllergenFrequency = {
  code: AllergenCode;
  productCount: number;
  percentage: number;
};

/** Groups non-deleted product spending by canonical taxonomy root. */
export function computeProductClassificationSpending(invoices: ReadonlyArray<Invoice>): ProductClassificationSpending[] {
  const groupMap = new Map<string, {totalSpent: number; productCount: number}>();
  let grandTotal = 0;

  for (const invoice of invoices) {
    const currencyCode = invoice.paymentInformation?.currency?.code ?? "RON";
    const year = getTransactionYear(invoice.paymentInformation?.transactionDate, invoice.createdAt);

    const items = invoice.items ?? [];
    for (const product of items) {
      if (!product.metadata?.isSoftDeleted) {
        const group = getClassificationGroup(product.classification ?? null) ?? "unclassified";
        const productPriceRON = toRON(product.totalPrice, currencyCode, year);

        const existing = groupMap.get(group) ?? {totalSpent: 0, productCount: 0};
        groupMap.set(group, {
          totalSpent: existing.totalSpent + productPriceRON,
          productCount: existing.productCount + 1,
        });

        grandTotal += productPriceRON;
      }
    }
  }

  const result: ProductClassificationSpending[] = [];
  for (const [group, data] of groupMap.entries()) {
    const percentage = grandTotal > 0 ? (data.totalSpent / grandTotal) * 100 : 0;

    result.push({
      category: group,
      totalSpent: Math.round(data.totalSpent * 100) / 100,
      productCount: data.productCount,
      percentage: Math.round(percentage * 10) / 10,
    });
  }

  return result.toSorted((a, b) => b.totalSpent - a.totalSpent);
}

/** Computes the top non-deleted products by RON-normalized spend. */
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
      // Skip soft-deleted products and products without names
      if (!product.metadata?.isSoftDeleted && product.name) {
        const productName = product.name;
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

function countProductAllergens(product: Product, allergenMap: Map<AllergenCode, number>): boolean {
  const {allergenAssessment} = product;
  if (product.metadata?.isSoftDeleted || allergenAssessment === null) return false;
  if (allergenAssessment.status === AllergenAssessmentStatus.Detected) {
    const productAllergenCodes = new Set(allergenAssessment.signals.map((signal) => signal.code));
    for (const code of productAllergenCodes) {
      allergenMap.set(code, (allergenMap.get(code) ?? 0) + 1);
    }
  }
  return true;
}

/** Computes EU-14 frequencies across assessed, non-deleted products. */
export function computeAllergenFrequency(invoices: ReadonlyArray<Invoice>): AllergenFrequency[] {
  const allergenMap = new Map<AllergenCode, number>();
  let assessedProducts = 0; // Denominator: only products with allergenAssessment !== null

  for (const invoice of invoices) {
    const items = invoice.items ?? [];
    for (const product of items) {
      if (countProductAllergens(product, allergenMap)) assessedProducts++;
    }
  }

  const result: AllergenFrequency[] = [];
  for (const [code, count] of allergenMap.entries()) {
    const percentage = assessedProducts > 0 ? (count / assessedProducts) * 100 : 0;
    result.push({
      code,
      productCount: count,
      percentage: Math.round(percentage * 10) / 10,
    });
  }

  return result.toSorted((a, b) => b.productCount - a.productCount);
}

/** Counts non-deleted products carrying an allergen assessment. */
export function countAssessedProducts(invoices: ReadonlyArray<Invoice>): number {
  let assessedProducts = 0;

  for (const invoice of invoices) {
    const items = invoice.items ?? [];
    for (const product of items) {
      if (!product.metadata?.isSoftDeleted && product.allergenAssessment !== null) assessedProducts++;
    }
  }

  return assessedProducts;
}

/** Computes currency totals sorted by RON-normalized spend. */
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
