/**
 * @fileoverview Invoice domain display label utilities.
 * @module app/domains/invoices/_utils/labelUtilities
 */

import {PaymentType} from "@/types/invoices";
import type {StandardClassification} from "@/types/invoices";

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

// ---------------------------------------------------------------------------
// Canonical taxonomy classification label utilities
// ---------------------------------------------------------------------------

/**
 * Returns the official label of a canonical classification, or the supplied fallback
 * when the classification is absent.
 *
 * @remarks
 * Use this as the primary display label for any classified entity. Pass a localized
 * "Unclassified" string as `fallback` so callers control the unclassified presentation.
 *
 * @param classification - The canonical classification, or null when unclassified.
 * @param fallback - The string returned when `classification` is null.
 * @returns The classification's `officialLabel`, or `fallback`.
 */
export function getClassificationLabel(classification: StandardClassification | null, fallback: string): string {
  if (classification === null) return fallback;
  return classification.officialLabel;
}

/**
 * Returns the official label of the broadest grouping node for a canonical classification.
 *
 * @remarks
 * Relies on the domain invariant that the hierarchy is non-empty and ordered root → leaf:
 * the domain constructor throws when the hierarchy is empty, and the final node's code
 * must equal the classification's own code. The first node is therefore the broadest
 * grouping level (ECOICOP division, GS1 GPC segment, NACE section, etc.).
 *
 * This function does **not** match level names, parse official labels, or inspect code
 * strings to infer a group — it only returns `hierarchy[0].officialLabel`. If the
 * hierarchy is empty (possible in TypeScript even though the backend forbids it), `null`
 * is returned. Callers are responsible for rendering `null` as a localized "Unclassified"
 * bucket; that concern does not belong here.
 *
 * @param classification - The canonical classification, or null when unclassified.
 * @returns The root hierarchy node's `officialLabel`, or `null`.
 */
export function getClassificationGroup(classification: StandardClassification | null): string | null {
  if (classification === null) return null;
  if (classification.hierarchy.length === 0) return null;
  return classification.hierarchy[0]?.officialLabel ?? null;
}

/**
 * Builds a human-readable " > "-separated path of the classification's hierarchy labels,
 * ordered from root to leaf.
 *
 * @remarks
 * Relies on the domain invariant that the hierarchy is ordered root → leaf, so the
 * resulting path always reads from broadest to most specific.
 *
 * @param classification - The canonical classification, or null when unclassified.
 * @returns A " > "-joined string of `officialLabel` values from root to leaf, or an
 *   empty string when `classification` is null.
 */
export function getClassificationHierarchyPath(classification: StandardClassification | null): string {
  if (classification === null) return "";
  return classification.hierarchy.map((node) => node.officialLabel).join(" > ");
}
