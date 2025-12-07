import type {Currency} from "@/types/DDD";
import {InvoiceCategory, MerchantCategory, type PaymentType, ProductCategory, RecipeComplexity} from "@/types/invoices";

// Format currency with symbol
export function formatCurrency(amount: number, currency: Currency): string {
  return `${amount.toFixed(2)} ${currency.symbol}`;
}

// Format date for display
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
  }).format(new Date(date));
}

// Format time for display
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// Get category display name
export function getCategoryName(category: InvoiceCategory): string {
  const names: Record<number, string> = {
    0: "Not Defined",
    100: "Grocery",
    200: "Fast Food",
    300: "Home & Cleaning",
    400: "Car & Auto",
    9999: "Other",
  };
  return names[category] || "Unknown";
}

// Get payment type display name
export function getPaymentTypeName(type: PaymentType): string {
  const names: Record<number, string> = {
    0: "Unknown",
    100: "Cash",
    200: "Card",
    300: "Bank Transfer",
    400: "Mobile Payment",
    500: "Voucher",
    9999: "Other",
  };
  return names[type] || "Unknown";
}

// Get complexity display
export function getComplexityName(complexity: RecipeComplexity): string {
  const names: Record<number, string> = {
    0: "Unknown",
    1: "Easy",
    2: "Normal",
    3: "Hard",
  };
  return names[complexity] || "Unknown";
}

// Get merchant category display name
export function getMerchantCategoryName(category: MerchantCategory): string {
  const names: Record<number, string> = {
    0: "Not Defined",
    100: "Local Shop",
    200: "Supermarket",
    300: "Hypermarket",
    400: "Online Shop",
    9999: "Other",
  };
  return names[category] || "Unknown";
}

// Get product category display name
export function getProductCategoryName(category: ProductCategory): string {
  const names: Record<number, string> = {
    0: "Not Defined",
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
  return names[category] || "Unknown";
}

// Get complexity badge variant
export function getComplexityVariant(complexity: RecipeComplexity): "default" | "secondary" | "destructive" | "outline" {
  switch (complexity) {
    case RecipeComplexity.Easy:
      return "secondary";
    case RecipeComplexity.Normal:
      return "default";
    case RecipeComplexity.Hard:
      return "destructive";
    default:
      return "outline";
  }
}
