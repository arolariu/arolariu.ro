/**
 * @fileoverview Pure derivers for the available filter-option lists shown in
 * the invoice filter panel.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_utils/filterOptions
 *
 * @remarks
 * All three helpers operate on the FULL (unfiltered) invoice array. This is a
 * deliberate UX decision so that filtering down to (say) Cash doesn't hide the
 * Card chip — the user can always switch between any value they've ever used.
 *
 * Ordering: frequency-desc primary; ties broken by the natural tie-break for
 * the data type (alphabetic for currency codes and group labels, ascending
 * numeric for the enum values used by payment type).
 */

import {isInvoiceCategory} from "@/lib/categories/categoryCatalog";
import type {Invoice, PaymentType} from "@/types/invoices";
import type {CategoryFilterValue} from "../_hooks/useInvoiceFilters";

const DEFAULT_CURRENCY_CODE = "RON";

/** Stable filter bucket for invoices without a current category. */
export const UNCATEGORIZED_FILTER = "uncategorized";

/** Returns the invoice category filter value, including for older cached records. */
export function invoiceCategoryFilterValue(category: unknown): CategoryFilterValue {
  return isInvoiceCategory(category) ? category : UNCATEGORIZED_FILTER;
}

function buildFrequencyMap<K>(values: Iterable<K>): Map<K, number> {
  const map = new Map<K, number>();
  for (const v of values) {
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return map;
}

/**
 * Returns the unique ISO 4217 currency codes present in the user's invoices,
 * ordered by frequency descending with ties broken alphabetically. Invoices
 * whose `currency.code` is empty are bucketed under `"RON"` (matches the
 * codebase-wide default established in `_utils/statistics.ts`).
 */
export function computeAvailableCurrencies(invoices: ReadonlyArray<Invoice>): ReadonlyArray<string> {
  const codes = invoices.map((i) => i.paymentInformation.currency?.code || DEFAULT_CURRENCY_CODE);
  const freq = buildFrequencyMap(codes);
  return [...freq.entries()]
    .toSorted((a, b) => {
      const freqDelta = b[1] - a[1];
      if (freqDelta !== 0) return freqDelta;
      return a[0].localeCompare(b[0]);
    })
    .map(([code]) => code);
}

/** Returns categories present in the current collection, by frequency and then ID. */
export function computeAvailableCategories(invoices: ReadonlyArray<Invoice>): readonly CategoryFilterValue[] {
  const frequencies = buildFrequencyMap(invoices.map((invoice) => invoiceCategoryFilterValue(invoice.category)));
  return [...frequencies.entries()]
    .toSorted(
      ([left, leftCount], [right, rightCount]) =>
        rightCount - leftCount || (typeof left === "number" ? left : Infinity) - (typeof right === "number" ? right : Infinity),
    )
    .map(([category]) => category);
}

/**
 * Returns the unique `PaymentType` enum values present in the user's invoices,
 * ordered by frequency descending with ties broken by ascending enum ordinal.
 */
export function computeAvailablePaymentTypes(invoices: ReadonlyArray<Invoice>): ReadonlyArray<PaymentType> {
  const values = invoices.map((i) => i.paymentInformation.paymentType);
  const freq = buildFrequencyMap(values);
  return [...freq.entries()]
    .toSorted((a, b) => {
      const freqDelta = b[1] - a[1];
      if (freqDelta !== 0) return freqDelta;
      return (a[0] as number) - (b[0] as number);
    })
    .map(([pt]) => pt);
}
