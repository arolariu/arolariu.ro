/**
 * @fileoverview Invoice domain display label utilities.
 * @module app/domains/invoices/_utils/labelUtilities
 */

import {PaymentType} from "@/types/invoices";

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
