/**
 * @fileoverview Invoice domain display label utilities.
 * @module app/domains/invoices/_utils/labelUtilities
 */

import {InvoiceCategory, PaymentType, ProductCategory} from "@/types/invoices";

type LabelFallbackOptions = Readonly<{
  labels?: Readonly<Record<number, string>>;
  notDefinedLabel?: string;
  unknownLabel?: string;
}>;

const PRODUCT_CATEGORY_LABELS: Readonly<Record<number, string>> = {
  [ProductCategory.BAKED_GOODS]: "Baked Goods",
  [ProductCategory.GROCERIES]: "Groceries",
  [ProductCategory.DAIRY]: "Dairy",
  [ProductCategory.MEAT]: "Meat",
  [ProductCategory.FISH]: "Fish",
  [ProductCategory.FRUITS]: "Fruits",
  [ProductCategory.VEGETABLES]: "Vegetables",
  [ProductCategory.BEVERAGES]: "Beverages",
  [ProductCategory.ALCOHOLIC_BEVERAGES]: "Alcoholic Beverages",
  [ProductCategory.TOBACCO]: "Tobacco",
  [ProductCategory.CLEANING_SUPPLIES]: "Cleaning Supplies",
  [ProductCategory.PERSONAL_CARE]: "Personal Care",
  [ProductCategory.MEDICINE]: "Medicine",
  [ProductCategory.OTHER]: "Other",
};

const INVOICE_CATEGORY_LABELS: Readonly<Record<number, string>> = {
  [InvoiceCategory.GROCERY]: "Grocery",
  [InvoiceCategory.FAST_FOOD]: "Fast Food",
  [InvoiceCategory.HOME_CLEANING]: "Home Cleaning",
  [InvoiceCategory.CAR_AUTO]: "Car & Auto",
  [InvoiceCategory.OTHER]: "Other",
};

const PAYMENT_TYPE_LABELS: Readonly<Record<number, string>> = {
  [PaymentType.Unknown]: "Unknown",
  [PaymentType.Cash]: "Cash",
  [PaymentType.Card]: "Card",
  [PaymentType.Transfer]: "Transfer",
  [PaymentType.MobilePayment]: "Mobile Payment",
  [PaymentType.Voucher]: "Voucher",
  [PaymentType.Other]: "Other",
};

/**
 * Gets the display label for a product category.
 *
 * @param category - Product category numeric value.
 * @param options - Optional labels for context-specific fallbacks.
 * @returns Product category display label.
 */
export function getProductCategoryLabel(category: number, options: LabelFallbackOptions = {}): string {
  if (category === ProductCategory.NOT_DEFINED) return options.notDefinedLabel ?? "Uncategorized";
  if (options.labels?.[category]) return options.labels[category];
  return PRODUCT_CATEGORY_LABELS[category] ?? options.unknownLabel ?? "Unknown";
}

/**
 * Gets the display label for an invoice category.
 *
 * @param category - Invoice category numeric value.
 * @param options - Optional labels for context-specific fallbacks.
 * @returns Invoice category display label.
 */
export function getInvoiceCategoryLabel(category: number, options: LabelFallbackOptions = {}): string {
  if (category === InvoiceCategory.NOT_DEFINED) return options.notDefinedLabel ?? "Not Defined";
  if (options.labels?.[category]) return options.labels[category];
  return INVOICE_CATEGORY_LABELS[category] ?? options.unknownLabel ?? "Not Defined";
}

/**
 * Gets the display label for a payment type.
 *
 * @param paymentType - Payment type numeric value.
 * @returns Payment type display label.
 */
export function getPaymentTypeLabel(paymentType: number): string {
  return PAYMENT_TYPE_LABELS[paymentType] ?? "Unknown";
}
