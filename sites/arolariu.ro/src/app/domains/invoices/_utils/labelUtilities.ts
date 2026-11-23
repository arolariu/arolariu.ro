/**
 * @fileoverview Invoice domain display label utilities.
 * @module app/domains/invoices/_utils/labelUtilities
 */

import {getInvoiceCategory, getMerchantCategory, getProductCategory} from "@/lib/categories/categoryCatalog";
import type {InvoiceCategory, MerchantCategory, ProductCategory} from "@/types/invoices/Category";
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

/** Returns the localized label for a receipt category or the empty state. */
export function invoiceCategoryLabel(t: SelectorTranslator, category: InvoiceCategory | null): string {
  if (category === null) return t((m) => m.categories.ui.unclassified);
  const {key} = getInvoiceCategory(category);
  return t((m) => m.categories.invoices[key]);
}

/** Returns the localized label for a merchant category or the empty state. */
export function merchantCategoryLabel(t: SelectorTranslator, category: MerchantCategory | null): string {
  if (category === null) return t((m) => m.categories.ui.unclassified);
  const {key} = getMerchantCategory(category);
  return t((m) => m.categories.merchants[key]);
}

/** Returns the localized label for a product category or the empty state. */
export function productCategoryLabel(t: SelectorTranslator, category: ProductCategory | null): string {
  if (category === null) return t((m) => m.categories.ui.unclassified);
  const {key} = getProductCategory(category);
  return t((m) => m.categories.products[key]);
}
