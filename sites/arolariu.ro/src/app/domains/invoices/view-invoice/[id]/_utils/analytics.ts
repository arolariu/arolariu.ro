import {type Invoice, type Product, ProductCategory} from "@/types/invoices";
import {getCategoryName} from "./invoice";

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
      category: getCategoryName(category),
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
      fill: CATEGORY_COLORS[category] || "var(--chart-1)",
    }))
    .sort((a, b) => b.amount - a.amount);
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
      name: item.genericName.length > 15 ? item.genericName.substring(0, 12) + "..." : item.genericName,
      fullName: item.genericName,
      quantity: item.quantity,
      unit: item.quantityUnit,
      price: item.totalPrice,
    }))
    .sort((a, b) => b.price - a.price)
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
  const items = invoice.items;
  const categories = new Set(items.map((item) => item.category));
  const sortedByPrice = [...items].sort((a, b) => b.totalPrice - a.totalPrice);

  return {
    totalItems: items.length,
    uniqueCategories: categories.size,
    averageItemPrice: items.length > 0 ? Math.round((invoice.paymentInformation.totalCostAmount / items.length) * 100) / 100 : 0,
    highestItem: sortedByPrice[0] ? {name: sortedByPrice[0].genericName, price: sortedByPrice[0].totalPrice} : {name: "N/A", price: 0},
    lowestItem: sortedByPrice[sortedByPrice.length - 1]
      ? {
          name: sortedByPrice[sortedByPrice.length - 1].genericName,
          price: sortedByPrice[sortedByPrice.length - 1].totalPrice,
        }
      : {name: "N/A", price: 0},
    taxPercentage:
      invoice.paymentInformation.totalCostAmount > 0
        ? Math.round((invoice.paymentInformation.totalTaxAmount / invoice.paymentInformation.totalCostAmount) * 10000) / 100
        : 0,
    totalAmount: invoice.paymentInformation.totalCostAmount,
    taxAmount: invoice.paymentInformation.totalTaxAmount,
  };
}

export type SpendingTrendData = {
  date: string;
  amount: number;
  isCurrent: boolean;
  name: string;
};

export function getSpendingTrend(): SpendingTrendData[] {
  const allInvoices = [...historicalInvoices, currentInvoiceSummary].sort((a, b) => a.date.getTime() - b.date.getTime());

  return allInvoices.map((inv) => ({
    date: inv.date.toLocaleDateString("en-US", {month: "short", day: "numeric"}),
    amount: inv.totalAmount,
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
  const current = currentInvoiceSummary;
  const historical = historicalInvoices;

  const totalAmount = historical.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const averageAmount = totalAmount / historical.length;
  const percentageDiff = ((current.totalAmount - averageAmount) / averageAmount) * 100;

  const totalItems = historical.reduce((sum, inv) => sum + inv.itemCount, 0);
  const averageItemCount = totalItems / historical.length;
  const itemCountDiff = ((current.itemCount - averageItemCount) / averageItemCount) * 100;

  // Same merchant comparison
  const sameMerchant = historical.filter((inv) => inv.merchantName === current.merchantName);
  const sameMerchantAvg =
    sameMerchant.length > 0 ? sameMerchant.reduce((sum, inv) => sum + inv.totalAmount, 0) / sameMerchant.length : averageAmount;
  const sameMerchantDiff = ((current.totalAmount - sameMerchantAvg) / sameMerchantAvg) * 100;

  return {
    currentAmount: current.totalAmount,
    averageAmount: Math.round(averageAmount * 100) / 100,
    percentageDiff: Math.round(percentageDiff * 10) / 10,
    isAboveAverage: percentageDiff > 0,
    minAmount: Math.min(...historical.map((inv) => inv.totalAmount)),
    maxAmount: Math.max(...historical.map((inv) => inv.totalAmount)),
    totalInvoices: historical.length,
    currentItemCount: current.itemCount,
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

  const allInvoices = [...historicalInvoices, currentInvoiceSummary];

  allInvoices.forEach((inv) => {
    const existing = merchantMap.get(inv.merchantName) || {count: 0, total: 0};
    merchantMap.set(inv.merchantName, {
      count: existing.count + 1,
      total: existing.total + inv.totalAmount,
    });
  });

  return Array.from(merchantMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      total: Math.round(data.total * 100) / 100,
      average: Math.round((data.total / data.count) * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total);
}

export type CategoryTrendData = {
  category: string;
  current: number;
  average: number;
};

export function getCategoryComparison(): CategoryTrendData[] {
  const current = currentInvoiceSummary.categoryBreakdown;
  const historical = historicalInvoices;

  // Calculate average for each category
  const categoryAverages = new Map<ProductCategory, number>();

  Object.values(ProductCategory)
    .filter((v) => typeof v === "number")
    .forEach((cat) => {
      const categoryTotal = historical.reduce((sum, inv) => sum + (inv.categoryBreakdown[cat as ProductCategory] || 0), 0);
      categoryAverages.set(cat as ProductCategory, categoryTotal / historical.length);
    });

  return Object.entries(current)
    .filter(([_, amount]) => amount > 0 || (categoryAverages.get(Number(_) as ProductCategory) || 0) > 0)
    .map(([cat, amount]) => ({
      category: getCategoryName(Number(cat) as ProductCategory),
      current: Math.round(amount * 100) / 100,
      average: Math.round((categoryAverages.get(Number(cat) as ProductCategory) || 0) * 100) / 100,
    }))
    .filter((d) => d.current > 0 || d.average > 0)
    .sort((a, b) => b.current - a.current);
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
      name: item.genericName.length > 18 ? item.genericName.substring(0, 15) + "..." : item.genericName,
      unitPrice: Math.round((item.totalPrice / item.quantity) * 100) / 100,
      quantity: item.quantity,
      unit: item.quantityUnit,
    }))
    .sort((a, b) => b.unitPrice - a.unitPrice);
}
