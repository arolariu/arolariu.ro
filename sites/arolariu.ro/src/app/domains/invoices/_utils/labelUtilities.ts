/**
 * @fileoverview Invoice domain display label utilities.
 * @module app/domains/invoices/_utils/labelUtilities
 */

import {
  getInvoiceCategory,
  getMerchantCategory,
  getProductCategory,
  isInvoiceCategory,
  isMerchantCategory,
  isProductCategory,
} from "@/lib/categories/categoryCatalog";
import {PaymentType} from "@/types/invoices/Payment";
import type {SelectorTranslator} from "next-intl-selector";

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
 * Gets the display label for a payment type.
 *
 * @param paymentType - Payment type numeric value.
 * @returns Payment type display label.
 */
export function getPaymentTypeLabel(paymentType: number): string {
  return PAYMENT_TYPE_LABELS[paymentType] ?? "Unknown";
}

/** Returns the localized receipt category label, treating missing or stale cached IDs as uncategorized. */
export function invoiceCategoryLabel(t: SelectorTranslator, category: unknown): string {
  if (!isInvoiceCategory(category)) return t((m) => m.categories.ui.unclassified);
  const {key} = getInvoiceCategory(category);
  return t((m) => m.categories.invoices[key]);
}

/** Returns the localized merchant category label, treating missing or stale cached IDs as uncategorized. */
export function merchantCategoryLabel(t: SelectorTranslator, category: unknown): string {
  if (!isMerchantCategory(category)) return t((m) => m.categories.ui.unclassified);
  const {key} = getMerchantCategory(category);
  return t((m) => m.categories.merchants[key]);
}

/** Returns the localized product category label, treating missing or stale cached IDs as uncategorized. */
export function productCategoryLabel(t: SelectorTranslator, category: unknown): string {
  if (!isProductCategory(category)) return t((m) => m.categories.ui.unclassified);
  const {key} = getProductCategory(category);
  return t((m) => m.categories.products[key]);
}
