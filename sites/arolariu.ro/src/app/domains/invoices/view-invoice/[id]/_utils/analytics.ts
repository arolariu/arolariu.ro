/**
 * @fileoverview Analytics and derived data helpers for invoice views.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_utils/analytics
 */

import {generateRandomInvoice, generateRandomInvoices} from "@/data/mocks";
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

export function getSpendingTrend(): SpendingTrendData[] {
  const historicalInvoices = generateRandomInvoices(20); // This would be fetched from user data
  const currentInvoiceSummary = generateRandomInvoice(); // This would be the current invoice
  const allInvoices = [...historicalInvoices, currentInvoiceSummary];
  return allInvoices.map((inv) => ({
    date: inv.createdAt.toLocaleDateString("en-US", {month: "short", day: "numeric"}),
    amount: inv.paymentInformation.totalCostAmount,
    isCurrent: inv.id === currentInvoiceSummary.id,
    name: inv.name,
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

export function getComparisonStats(): ComparisonStats {
  const current = generateRandomInvoice(); // This would be the current invoice
  const historical = generateRandomInvoices(20); // This would be fetched from user data

  const totalAmount = historical.reduce((sum, inv) => sum + inv.paymentInformation.totalCostAmount, 0);
  const averageAmount = totalAmount / historical.length;
  const percentageDiff = ((current.paymentInformation.totalCostAmount - averageAmount) / averageAmount) * 100;

  const totalItems = historical.reduce((sum, inv) => sum + inv.items.length, 0);
  const averageItemCount = totalItems / historical.length;
  const itemCountDiff = ((current.items.length - averageItemCount) / averageItemCount) * 100;

  // Same merchant comparison
  const sameMerchant = historical.filter((inv) => inv.merchantReference === current.merchantReference);
  const sameMerchantAvg =
    sameMerchant.length > 0
      ? sameMerchant.reduce((sum, inv) => sum + inv.paymentInformation.totalCostAmount, 0) / sameMerchant.length
      : averageAmount;
  const sameMerchantDiff = ((current.paymentInformation.totalCostAmount - sameMerchantAvg) / sameMerchantAvg) * 100;

  return {
    currentAmount: current.paymentInformation.totalCostAmount,
    averageAmount: Math.round(averageAmount * 100) / 100,
    percentageDiff: Math.round(percentageDiff * 10) / 10,
    isAboveAverage: percentageDiff > 0,
    minAmount: Math.min(...historical.map((inv) => inv.paymentInformation.totalCostAmount)),
    maxAmount: Math.max(...historical.map((inv) => inv.paymentInformation.totalCostAmount)),
    totalInvoices: historical.length,
    currentItemCount: current.items.length,
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

export function getMerchantBreakdown(): MerchantBreakdown[] {
  const merchantMap = new Map<string, {count: number; total: number}>();

  const historicalInvoices = generateRandomInvoices(30); // This would be fetched from user data
  const currentInvoiceSummary = generateRandomInvoice(); // This would be the current invoice
  const allInvoices = [...historicalInvoices, currentInvoiceSummary];

  allInvoices.forEach((inv) => {
    const existing = merchantMap.get(inv.merchantReference) || {count: 0, total: 0};
    merchantMap.set(inv.merchantReference, {
      count: existing.count + 1,
      total: existing.total + inv.paymentInformation.totalCostAmount,
    });
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
 * Gets category comparison data for demo purposes.
 * @returns Array of category trend data comparing current to average spending.
 */
export function getCategoryComparison(): CategoryTrendData[] {
  const current = generateRandomInvoice().category; // This would be the current invoice

  return Object.entries(current)
    .filter(([_, amount]) => amount > 0)
    .map(([cat, amount]) => ({
      category: formatEnum(ProductCategory, Number(cat) as ProductCategory),
      current: Math.round(amount * 100) / 100,
      average: 0, // Historical averages not yet implemented
    }))
    .filter((d) => d.current > 0)
    .toSorted((a, b) => b.current - a.current);
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
 * @returns Tailwind CSS class string for background color
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

// Keep the old function for backward compatibility but mark as deprecated
/**
 * @deprecated Use computeShoppingPatterns instead
 */
export function getShoppingPatterns(month: Date): ShoppingPatterns {
  const year = month.getFullYear();
  const currentMonth = month.getMonth();

  // Combine all invoices including current
  // In a real app, this would fetch from API based on the month
  const allInvoices = generateRandomInvoices(50);

  // Filter invoices for this month
  const monthInvoices = allInvoices.filter((inv) => {
    const invDate = new Date(inv.createdAt);
    return invDate.getMonth() === currentMonth && invDate.getFullYear() === year;
  });

  // Create spending map by day
  const spending: Record<number, DayData> = {};
  for (const inv of monthInvoices) {
    const day = new Date(inv.createdAt).getDate();
    spending[day] ??= {amount: 0, count: 0, invoiceIds: [], invoiceNames: []};
    const dayData = spending[day];
    if (dayData) {
      dayData.amount += inv.paymentInformation.totalCostAmount;
      dayData.count += 1;
      dayData.invoiceIds.push(inv.id);
      dayData.invoiceNames.push(inv.name);
    }
  }

  // Calculate average days between shopping trips
  const shoppingDays = Object.keys(spending)
    .map(Number)
    .toSorted((a, b) => a - b);
  let totalGap = 0;
  for (let i = 1; i < shoppingDays.length; i++) {
    totalGap += shoppingDays[i]! - shoppingDays[i - 1]!;
  }
  const avg = shoppingDays.length > 1 ? totalGap / (shoppingDays.length - 1) : 0;

  return {
    spendingByDay: spending,
    avgDaysBetween: avg,
    monthTotal: 0,
    shoppingDaysCount: shoppingDays.length,
    avgPerTrip: 0,
    historicalByDay: {},
    mostActiveWeekday: 0,
    leastActiveWeekday: 0,
  };
}
