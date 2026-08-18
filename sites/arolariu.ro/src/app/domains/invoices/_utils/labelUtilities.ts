/**
 * @fileoverview Label helpers for exact payment-method transport values.
 * @module app/domains/invoices/_utils/labelUtilities
 */

import {PaymentType, type PaymentType as PaymentTypeValue} from "@/types/invoices";

const paymentTypeLabels: Readonly<Record<PaymentTypeValue, string>> = {
  [PaymentType.Unknown]: "Unknown",
  [PaymentType.Cash]: "Cash",
  [PaymentType.Card]: "Card",
  [PaymentType.Transfer]: "Transfer",
  [PaymentType.MobilePayment]: "Mobile payment",
  [PaymentType.Voucher]: "Voucher",
  [PaymentType.Other]: "Other",
};

function isPaymentType(value: number): value is PaymentTypeValue {
  return (
    value === PaymentType.Unknown
    || value === PaymentType.Cash
    || value === PaymentType.Card
    || value === PaymentType.Transfer
    || value === PaymentType.MobilePayment
    || value === PaymentType.Voucher
    || value === PaymentType.Other
  );
}

/**
 * Gets the display label for the numeric payment type emitted by the backend.
 *
 * @param paymentType - Current payment type value.
 * @param unknownLabel - Localized fallback when a value is unsupported.
 * @returns The payment method label.
 */
export function getPaymentTypeLabel(paymentType: number, unknownLabel = "Unknown"): string {
  return isPaymentType(paymentType) ? paymentTypeLabels[paymentType] : unknownLabel;
}
