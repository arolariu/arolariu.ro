/**
 * @fileoverview Analytics and derived data helpers for invoice views.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_utils/analytics
 */

import {getTransactionYear, toRON} from "@/lib/currency";
import {formatEnum} from "@/lib/utils.generic";
import {type Invoice, type PaymentInformation, type Product, ProductCategory} from "@/types/invoices";

// Spending by category data
export type CategorySpending = {
  category: string;
  amount: number;
  count: number;
  fill: string;
};

// Chart color mapping
const CATEGORY_COLORS: Record<number, string> = {
  [ProductCategory.DAIRY]: "var(--chart-1)",
  [ProductCategory.BAKED_GOODS]: "var(--chart-2)",
  [ProductCategory.FRUITS]: "var(--chart-3)",
  [ProductCategory.VEGETABLES]: "var(--chart-4)",
  [ProductCategory.BEVERAGES]: "var(--chart-5)",
  [ProductCategory.CLEANING_SUPPLIES]: "var(--chart-1)",
  [ProductCategory.MEAT]: "var(--chart-2)",
  [ProductCategory.FISH]: "var(--chart-3)",
  [ProductCategory.GROCERIES]: "var(--chart-4)",
  [ProductCategory.OTHER]: "var(--chart-5)",
};

export function getCategorySpending(items: Product[]): CategorySpending[] {
  const categoryMap = new Map<ProductCategory, {amount: number; count: number}>();

  items.forEach((item) => {
    const existing = categoryMap.get(item.category) || {amount: 0, count: 0};
    categoryMap.set(item.category, {
      amount: existing.amount + item.totalPrice,
      count: existing.count + 1,
    });
  });

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category: formatEnum(ProductCategory, category),
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
      fill: CATEGORY_COLORS[category] || "var(--chart-1)",
    }))
    .toSorted((a, b) => b.amount - a.amount);
}

// Price distribution data - simplified ranges
export type PriceRange = {
  range: string;
  count: number;
  fill: string;
};

export function getPriceDistribution(items: Product[]): PriceRange[] {
  const ranges = [
    {min: 0, max: 10, label: "Under 10"},
    {min: 10, max: 25, label: "10-25"},
    {min: 25, max: 50, label: "25-50"},
    {min: 50, max: Number.POSITIVE_INFINITY, label: "50+"},
  ];

  const distribution = ranges.map((range, index) => ({
    range: range.label,
    count: items.filter((item) => item.totalPrice >= range.min && item.totalPrice < range.max).length,
    fill: `var(--chart-${(index % 5) + 1})`,
  }));

  return distribution.filter((d) => d.count > 0);
}

// Quantity analysis data - limit to top 5 items
export type QuantityData = {
  name: string;
  quantity: number;
  unit: string;
  price: number;
};

export function getQuantityAnalysis(items: Product[]): QuantityData[] {
  return items
    .map((item) => ({
      name: item.genericName.length > 15 ? `${item.genericName.slice(0, 12)}...` : item.genericName,
      fullName: item.genericName,
      quantity: item.quantity,
      unit: item.quantityUnit,
      price: item.totalPrice,
    }))
    .toSorted((a, b) => b.price - a.price)
    .slice(0, 5); // Only top 5 items
}

// Summary statistics
export type InvoiceSummary = {
  totalItems: number;
  uniqueCategories: number;
  averageItemPrice: number;
  highestItem: {name: string; price: number};
  lowestItem: {name: string; price: number};
  taxPercentage: number;
  totalAmount: number;
  taxAmount: number;
};

export function getInvoiceSummary(invoice: Invoice): InvoiceSummary {
  const {items, paymentInformation} = invoice;
  const {totalCostAmount, totalTaxAmount} = paymentInformation;
  const categories = new Set(items.map((item) => item.category));
  const sortedByPrice = items.toSorted((a, b) => b.totalPrice - a.totalPrice);

  return {
    totalItems: items.length,
    uniqueCategories: categories.size,
    averageItemPrice: items.length > 0 ? Math.round((totalCostAmount / items.length) * 100) / 100 : 0,
    highestItem: sortedByPrice[0] ? {name: sortedByPrice[0].genericName, price: sortedByPrice[0].totalPrice} : {name: "N/A", price: 0},
    lowestItem: sortedByPrice.at(-1)
      ? {
          name: sortedByPrice.at(-1)!.genericName,
          price: sortedByPrice.at(-1)!.totalPrice,
        }
      : {name: "N/A", price: 0},
    taxPercentage: totalCostAmount > 0 ? Math.round((totalTaxAmount / totalCostAmount) * 10_000) / 100 : 0,
    totalAmount: totalCostAmount,
    taxAmount: totalTaxAmount,
  };
}

export type SpendingTrendData = {
  date: string;
  amount: number;
  isCurrent: boolean;
  name: string;
};

/**
 * Computes spending trend data from user's invoices, grouping by month.
 *
 * @param currentInvoice - The invoice being viewed
 * @param allInvoices - All cached invoices from the Zustand store
 * @returns Array of monthly spending data with current month highlighted
 *
 * @remarks
 * - Groups invoices by month using transactionDate (falls back to createdAt)
 * - Normalizes all amounts to RON using yearly average exchange rates
 * - Highlights the month containing the current invoice
 * - Returns empty array if allInvoices has fewer than 2 invoices
 */
export function getSpendingTrend(currentInvoice: Invoice, allInvoices: ReadonlyArray<Invoice>): SpendingTrendData[] {
  // Need at least 2 invoices for meaningful trend data
  if (allInvoices.length < 2) {
    return [];
  }

  // Group invoices by month
  const monthlyData = new Map<
    string,
    {
      amount: number;
      count: number;
      invoiceIds: Set<string>;
      names: string[];
      date: Date;
    }
  >();

  allInvoices.forEach((inv) => {
    const transactionDate = inv.paymentInformation?.transactionDate ?? inv.createdAt;
    const date = new Date(transactionDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    // Normalize amount to RON
    const amount = inv.paymentInformation?.totalCostAmount ?? 0;
    const currencyCode = inv.paymentInformation?.currency?.code ?? "RON";
    const year = getTransactionYear(inv.paymentInformation?.transactionDate, inv.createdAt);
    const amountInRON = toRON(amount, currencyCode, year);

    const existing = monthlyData.get(monthKey);
    if (existing) {
      existing.amount += amountInRON;
      existing.count += 1;
      existing.invoiceIds.add(inv.id);
      existing.names.push(inv.name);
    } else {
      monthlyData.set(monthKey, {
        amount: amountInRON,
        count: 1,
        invoiceIds: new Set([inv.id]),
        names: [inv.name],
        date,
      });
    }
  });

  // Determine which month contains the current invoice
  const currentTransactionDate = currentInvoice.paymentInformation?.transactionDate ?? currentInvoice.createdAt;
  const currentDate = new Date(currentTransactionDate);
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  // Convert to array and sort by date
  return Array.from(monthlyData.entries())
    .toSorted(([keyA, dataA], [keyB, dataB]) => dataA.date.getTime() - dataB.date.getTime())
    .map(([monthKey, data]) => ({
      date: data.date.toLocaleDateString("en-US", {month: "short", year: "numeric"}),
      amount: Math.round(data.amount * 100) / 100,
      isCurrent: monthKey === currentMonthKey,
      name: `${data.count} invoice${data.count > 1 ? "s" : ""}`,
    }));
}

export type ComparisonStats = {
  currentAmount: number;
  averageAmount: number;
  percentageDiff: number;
  isAboveAverage: boolean;
  minAmount: number;
  maxAmount: number;
  totalInvoices: number;
  currentItemCount: number;
  averageItemCount: number;
  itemCountDiff: number;
  sameMerchantAvg: number;
  sameMerchantDiff: number;
};

/**
 * Computes comparison statistics for the current invoice against all user invoices.
 *
 * @param currentInvoice - The invoice being viewed
 * @param allInvoices - All cached invoices from the Zustand store
 * @returns Comparison statistics including averages and percentage differences
 *
 * @remarks
 * - Normalizes all amounts to RON using yearly average exchange rates
 * - Compares against overall average and same-merchant average
 * - Returns default values if allInvoices has fewer than 2 invoices
 * - Handles edge cases (empty arrays, missing merchant references)
 */
export function getComparisonStats(currentInvoice: Invoice, allInvoices: ReadonlyArray<Invoice>): ComparisonStats {
  // Default stats if not enough data
  const currentAmount = currentInvoice.paymentInformation?.totalCostAmount ?? 0;
  const currentCurrency = currentInvoice.paymentInformation?.currency?.code ?? "RON";
  const currentYear = getTransactionYear(currentInvoice.paymentInformation?.transactionDate, currentInvoice.createdAt);
  const currentAmountInRON = toRON(currentAmount, currentCurrency, currentYear);
  const currentItemCount = currentInvoice.items?.length ?? 0;

  if (allInvoices.length < 2) {
    return {
      currentAmount: currentAmountInRON,
      averageAmount: currentAmountInRON,
      percentageDiff: 0,
      isAboveAverage: false,
      minAmount: currentAmountInRON,
      maxAmount: currentAmountInRON,
      totalInvoices: allInvoices.length,
      currentItemCount,
      averageItemCount: currentItemCount,
      itemCountDiff: 0,
      sameMerchantAvg: currentAmountInRON,
      sameMerchantDiff: 0,
    };
  }

  // Filter out current invoice to avoid self-comparison
  const otherInvoices = allInvoices.filter((inv) => inv.id !== currentInvoice.id);

  // Calculate overall statistics with RON normalization
  const amounts = otherInvoices.map((inv) => {
    const amount = inv.paymentInformation?.totalCostAmount ?? 0;
    const currency = inv.paymentInformation?.currency?.code ?? "RON";
    const year = getTransactionYear(inv.paymentInformation?.transactionDate, inv.createdAt);
    return toRON(amount, currency, year);
  });

  const totalAmount = amounts.reduce((sum, amt) => sum + amt, 0);
  const averageAmount = otherInvoices.length > 0 ? totalAmount / otherInvoices.length : currentAmountInRON;
  const percentageDiff = averageAmount > 0 ? ((currentAmountInRON - averageAmount) / averageAmount) * 100 : 0;

  const minAmount = amounts.length > 0 ? Math.min(...amounts) : currentAmountInRON;
  const maxAmount = amounts.length > 0 ? Math.max(...amounts) : currentAmountInRON;

  // Calculate item count statistics
  const totalItems = otherInvoices.reduce((sum, inv) => sum + (inv.items?.length ?? 0), 0);
  const averageItemCount = otherInvoices.length > 0 ? totalItems / otherInvoices.length : currentItemCount;
  const itemCountDiff = averageItemCount > 0 ? ((currentItemCount - averageItemCount) / averageItemCount) * 100 : 0;

  // Same merchant comparison
  const currentMerchant = currentInvoice.merchantReference;
  const sameMerchantInvoices = otherInvoices.filter((inv) => inv.merchantReference === currentMerchant);

  let sameMerchantAvg = averageAmount;
  let sameMerchantDiff = percentageDiff;

  if (sameMerchantInvoices.length > 0) {
    const sameMerchantAmounts = sameMerchantInvoices.map((inv) => {
      const amount = inv.paymentInformation?.totalCostAmount ?? 0;
      const currency = inv.paymentInformation?.currency?.code ?? "RON";
      const year = getTransactionYear(inv.paymentInformation?.transactionDate, inv.createdAt);
      return toRON(amount, currency, year);
    });
    const sameMerchantTotal = sameMerchantAmounts.reduce((sum, amt) => sum + amt, 0);
    sameMerchantAvg = sameMerchantTotal / sameMerchantInvoices.length;
    sameMerchantDiff = sameMerchantAvg > 0 ? ((currentAmountInRON - sameMerchantAvg) / sameMerchantAvg) * 100 : 0;
  }

  return {
    currentAmount: Math.round(currentAmountInRON * 100) / 100,
    averageAmount: Math.round(averageAmount * 100) / 100,
    percentageDiff: Math.round(percentageDiff * 10) / 10,
    isAboveAverage: percentageDiff > 0,
    minAmount: Math.round(minAmount * 100) / 100,
    maxAmount: Math.round(maxAmount * 100) / 100,
    totalInvoices: allInvoices.length,
    currentItemCount,
    averageItemCount: Math.round(averageItemCount * 10) / 10,
    itemCountDiff: Math.round(itemCountDiff * 10) / 10,
    sameMerchantAvg: Math.round(sameMerchantAvg * 100) / 100,
    sameMerchantDiff: Math.round(sameMerchantDiff * 10) / 10,
  };
}

export type MerchantBreakdown = {
  name: string;
  count: number;
  total: number;
  average: number;
};

/**
 * Computes merchant spending breakdown from user's invoices.
 *
 * @param allInvoices - All cached invoices from the Zustand store
 * @returns Array of merchant spending data sorted by total spend (descending)
 *
 * @remarks
 * - Groups invoices by merchantReference
 * - Normalizes all amounts to RON using yearly average exchange rates
 * - Returns empty array if allInvoices is empty
 * - Handles missing merchantReference gracefully (groups as "Unknown")
 */
export function getMerchantBreakdown(allInvoices: ReadonlyArray<Invoice>): MerchantBreakdown[] {
  if (allInvoices.length === 0) {
    return [];
  }

  const merchantMap = new Map<string, {count: number; total: number}>();

  allInvoices.forEach((inv) => {
    const merchantRef = inv.merchantReference || "Unknown";
    const amount = inv.paymentInformation?.totalCostAmount ?? 0;
    const currency = inv.paymentInformation?.currency?.code ?? "RON";
    const year = getTransactionYear(inv.paymentInformation?.transactionDate, inv.createdAt);
    const amountInRON = toRON(amount, currency, year);

    const existing = merchantMap.get(merchantRef);
    if (existing) {
      existing.count += 1;
      existing.total += amountInRON;
    } else {
      merchantMap.set(merchantRef, {
        count: 1,
        total: amountInRON,
      });
    }
  });

  return Array.from(merchantMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      total: Math.round(data.total * 100) / 100,
      average: Math.round((data.total / data.count) * 100) / 100,
    }))
    .toSorted((a, b) => b.total - a.total);
}

export type CategoryTrendData = {
  category: string;
  current: number;
  average: number;
};

/**
 * Computes category spending comparison between current invoice and all invoices.
 *
 * @param currentInvoice - The invoice being viewed
 * @param allInvoices - All cached invoices from the Zustand store
 * @returns Array of category comparison data sorted by current spending (descending)
 *
 * @remarks
 * - Groups products by ProductCategory
 * - Compares current invoice's category spending against historical averages
 * - Normalizes all amounts to RON using yearly average exchange rates
 * - Returns empty array if current invoice has no items
 * - Only includes categories present in the current invoice
 */
export function getCategoryComparison(currentInvoice: Invoice, allInvoices: ReadonlyArray<Invoice>): CategoryTrendData[] {
  const currentItems = currentInvoice.items ?? [];
  if (currentItems.length === 0) {
    return [];
  }

  // Calculate current invoice's spending by category
  const currentCategoryMap = new Map<ProductCategory, number>();
  currentItems.forEach((item) => {
    const existing = currentCategoryMap.get(item.category) ?? 0;
    currentCategoryMap.set(item.category, existing + item.totalPrice);
  });

  // Calculate historical average spending per category (excluding current invoice)
  const otherInvoices = allInvoices.filter((inv) => inv.id !== currentInvoice.id);
  const historicalCategoryMap = new Map<ProductCategory, {total: number; count: number}>();

  otherInvoices.forEach((inv) => {
    const items = inv.items ?? [];
    items.forEach((item) => {
      const existing = historicalCategoryMap.get(item.category) ?? {total: 0, count: 0};
      historicalCategoryMap.set(item.category, {
        total: existing.total + item.totalPrice,
        count: existing.count + 1,
      });
    });
  });

  // Build comparison data
  const result: CategoryTrendData[] = [];

  currentCategoryMap.forEach((currentAmount, category) => {
    const historical = historicalCategoryMap.get(category);
    const averageAmount = historical ? historical.total / Math.max(historical.count, 1) : 0;

    result.push({
      category: formatEnum(ProductCategory, category),
      current: Math.round(currentAmount * 100) / 100,
      average: Math.round(averageAmount * 100) / 100,
    });
  });

  return result.toSorted((a, b) => b.current - a.current);
}

// Unit price analysis
export type UnitPriceData = {
  name: string;
  unitPrice: number;
  quantity: number;
  unit: string;
};

export function getUnitPriceAnalysis(items: Product[]): UnitPriceData[] {
  return items
    .map((item) => ({
      name: item.genericName.length > 18 ? `${item.genericName.slice(0, 15)}...` : item.genericName,
      unitPrice: Math.round((item.totalPrice / item.quantity) * 100) / 100,
      quantity: item.quantity,
      unit: item.quantityUnit,
    }))
    .toSorted((a, b) => b.unitPrice - a.unitPrice);
}

export type BudgetImpact = {
  monthName: string;
  monthlyBudget: number;
  spentBeforeThis: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  thisInvoicePercent: number;
  daysRemaining: number;
  dailyAllowance: number;
  isOverBudget: boolean;
  isNearLimit: boolean;
};

export function computeBudgetImpact(paymentInformation: PaymentInformation): BudgetImpact {
  const {totalCostAmount, transactionDate} = paymentInformation;

  // Simulated budget data
  const monthlyBudget = 2000;
  const spentBeforeThis = 1057.55;
  const totalSpent = spentBeforeThis + totalCostAmount;
  const remaining = monthlyBudget - totalSpent;
  const percentUsed = (totalSpent / monthlyBudget) * 100;
  const thisInvoicePercent = (totalCostAmount / monthlyBudget) * 100;

  // Calculate days remaining in month
  const today = new Date(transactionDate);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysRemaining = lastDayOfMonth.getDate() - today.getDate();
  const dailyAllowance = remaining / Math.max(daysRemaining, 1);

  // Determine status
  const isOverBudget = remaining < 0;
  const isNearLimit = percentUsed > 80 && !isOverBudget;
  const monthName = new Intl.DateTimeFormat("en-US", {month: "long"}).format(today);

  return {
    monthName,
    monthlyBudget,
    spentBeforeThis,
    totalSpent,
    remaining,
    percentUsed,
    thisInvoicePercent,
    daysRemaining,
    dailyAllowance,
    isOverBudget,
    isNearLimit,
  };
}

// ============================================================================
// Shopping Calendar Analytics
// ============================================================================

/**
 * Data for a single day in the shopping calendar.
 */
export type DayData = {
  /** Total amount spent on this day */
  amount: number;
  /** Number of invoices on this day */
  count: number;
  /** List of invoice IDs for this day */
  invoiceIds: string[];
  /** List of invoice names for tooltips */
  invoiceNames: string[];
};

/**
 * Historical comparison data for a specific day.
 */
export type DayHistoricalComparison = {
  /** Average amount spent on this day of month across all years */
  historicalAverage: number;
  /** Number of years with data for this day */
  yearsWithData: number;
  /** Percentage difference from historical average */
  percentageDiff: number;
  /** Whether current spending is above historical average */
  isAboveAverage: boolean;
};

/**
 * Complete shopping patterns for calendar display.
 */
export type ShoppingPatterns = {
  /** Spending data by day of month (1-31) */
  spendingByDay: Record<number, DayData>;
  /** Average days between shopping trips */
  avgDaysBetween: number;
  /** Total spent in the month */
  monthTotal: number;
  /** Number of shopping days in the month */
  shoppingDaysCount: number;
  /** Average spend per shopping trip */
  avgPerTrip: number;
  /** Historical comparison by day */
  historicalByDay: Record<number, DayHistoricalComparison>;
  /** Most active shopping day (day of week: 0=Sunday) */
  mostActiveWeekday: number;
  /** Least active shopping day */
  leastActiveWeekday: number;
};

/**
 * Computes historical comparison for spending by day of month.
 */
function computeHistoricalComparison(
  invoices: ReadonlyArray<Invoice>,
  targetMonthIndex: number,
  targetYear: number,
  currentSpending: Record<number, DayData>,
): Record<number, DayHistoricalComparison> {
  const result: Record<number, DayHistoricalComparison> = {};

  // Get all invoices from same month in previous years
  const historicalInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.paymentInformation.transactionDate);
    return invDate.getMonth() === targetMonthIndex && invDate.getFullYear() < targetYear;
  });

  // Group historical spending by day
  const historicalByDay: Record<number, {total: number; years: Set<number>}> = {};
  for (const inv of historicalInvoices) {
    const invDate = new Date(inv.paymentInformation.transactionDate);
    const day = invDate.getDate();
    const year = invDate.getFullYear();

    historicalByDay[day] ??= {total: 0, years: new Set()};
    const dayData = historicalByDay[day];
    if (dayData) {
      dayData.total += inv.paymentInformation.totalCostAmount;
      dayData.years.add(year);
    }
  }

  // Compute comparison for each day that has current spending
  for (const dayStr of Object.keys(currentSpending)) {
    const day = Number(dayStr);
    const currentAmount = currentSpending[day]?.amount ?? 0;
    const historical = historicalByDay[day];

    if (historical && historical.years.size > 0) {
      const historicalAverage = historical.total / historical.years.size;
      const percentageDiff = historicalAverage > 0 ? ((currentAmount - historicalAverage) / historicalAverage) * 100 : 0;

      result[day] = {
        historicalAverage: Math.round(historicalAverage * 100) / 100,
        yearsWithData: historical.years.size,
        percentageDiff: Math.round(percentageDiff * 10) / 10,
        isAboveAverage: currentAmount > historicalAverage,
      };
    }
  }

  return result;
}

/**
 * Computes which weekdays are most/least active for shopping.
 */
function computeWeekdayActivity(invoices: ReadonlyArray<Invoice>): {mostActive: number; leastActive: number} {
  const weekdayCounts: Record<number, number> = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};

  for (const inv of invoices) {
    const weekday = new Date(inv.paymentInformation.transactionDate).getDay();
    weekdayCounts[weekday] = (weekdayCounts[weekday] ?? 0) + 1;
  }

  let mostActive = 0;
  let leastActive = 0;
  let maxCount = weekdayCounts[0] ?? 0;
  let minCount = weekdayCounts[0] ?? 0;

  for (let i = 1; i < 7; i++) {
    const count = weekdayCounts[i] ?? 0;
    if (count > maxCount) {
      maxCount = count;
      mostActive = i;
    }
    if (count < minCount) {
      minCount = count;
      leastActive = i;
    }
  }

  return {mostActive, leastActive};
}

/**
 * Computes shopping patterns from cached invoices for a specific month.
 *
 * @param invoices - All cached invoices from the store
 * @param targetMonth - The month to compute patterns for
 * @returns Complete shopping patterns with historical comparison
 */
export function computeShoppingPatterns(invoices: ReadonlyArray<Invoice>, targetMonth: Date): ShoppingPatterns {
  const targetYear = targetMonth.getFullYear();
  const targetMonthIndex = targetMonth.getMonth();

  // Filter invoices for the target month
  const monthInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.paymentInformation.transactionDate);
    return invDate.getMonth() === targetMonthIndex && invDate.getFullYear() === targetYear;
  });

  // Create spending map by day
  const spendingByDay: Record<number, DayData> = {};
  let monthTotal = 0;

  for (const inv of monthInvoices) {
    const day = new Date(inv.paymentInformation.transactionDate).getDate();
    spendingByDay[day] ??= {amount: 0, count: 0, invoiceIds: [], invoiceNames: []};
    const dayData = spendingByDay[day];
    if (dayData) {
      dayData.amount += inv.paymentInformation.totalCostAmount;
      dayData.count += 1;
      dayData.invoiceIds.push(inv.id);
      dayData.invoiceNames.push(inv.name);
    }
    monthTotal += inv.paymentInformation.totalCostAmount;
  }

  // Calculate average days between shopping trips
  const shoppingDays = Object.keys(spendingByDay)
    .map(Number)
    .toSorted((a, b) => a - b);
  let totalGap = 0;
  for (let i = 1; i < shoppingDays.length; i++) {
    totalGap += shoppingDays[i]! - shoppingDays[i - 1]!;
  }
  const avgDaysBetween = shoppingDays.length > 1 ? totalGap / (shoppingDays.length - 1) : 0;

  // Compute historical comparison for each day
  const historicalByDay = computeHistoricalComparison(invoices, targetMonthIndex, targetYear, spendingByDay);

  // Compute weekday activity
  const weekdayActivity = computeWeekdayActivity(invoices);

  return {
    spendingByDay,
    avgDaysBetween,
    monthTotal: Math.round(monthTotal * 100) / 100,
    shoppingDaysCount: shoppingDays.length,
    avgPerTrip: shoppingDays.length > 0 ? Math.round((monthTotal / shoppingDays.length) * 100) / 100 : 0,
    historicalByDay,
    mostActiveWeekday: weekdayActivity.mostActive,
    leastActiveWeekday: weekdayActivity.leastActive,
  };
}

/**
 * Gets the intensity class for calendar day coloring based on spending amount.
 *
 * @param amount - The spending amount for the day
 * @param maxAmount - The maximum spending amount in the month (for relative scaling)
 * @returns CSS class string for background color intensity
 */
export function getSpendingIntensityClass(amount: number, maxAmount: number): string {
  if (amount === 0 || maxAmount === 0) return "";

  const ratio = amount / maxAmount;

  if (ratio < 0.2) return "bg-primary/20 hover:bg-primary/30 text-foreground";
  if (ratio < 0.4) return "bg-primary/40 hover:bg-primary/50 text-foreground";
  if (ratio < 0.6) return "bg-primary/60 hover:bg-primary/70 text-primary-foreground";
  if (ratio < 0.8) return "bg-primary/80 hover:bg-primary/90 text-primary-foreground";
  return "bg-primary hover:bg-primary/90 text-primary-foreground";
}

/**
 * Gets a human-readable weekday name.
 */
export function getWeekdayName(weekday: number, locale = "en-US"): string {
  const date = new Date(2024, 0, 7 + weekday); // Jan 7, 2024 is a Sunday
  return new Intl.DateTimeFormat(locale, {weekday: "long"}).format(date);
}


