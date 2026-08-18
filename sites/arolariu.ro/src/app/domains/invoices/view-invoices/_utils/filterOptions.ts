/**
 * @fileoverview Dynamic filter options derived only from canonical DTO data.
 * @module domains/invoices/view-invoices/utils/filterOptions
 */

import type {Invoice, PaymentType} from "@/types/invoices";

const defaultCurrencyCode = "RON";

/** Stable classification option used by filter controls and URL state. */
export interface ClassificationFilterOption {
  /** Stable `system:code` URL key. */
  readonly key: string;
  /** Official label supplied by the backend taxonomy projection. */
  readonly label: string;
  /** Canonical root code for ECOICOP grouping. */
  readonly rootCode: string;
}

function stableKey(system: string, code: string): string {
  return `${system}:${code}`;
}

function byFrequencyThenLabel<T extends {readonly label: string}>(entries: readonly [T, number][]): readonly T[] {
  return [...entries]
    .toSorted(([left, leftCount], [right, rightCount]) => rightCount - leftCount || left.label.localeCompare(right.label))
    .map(([option]) => option);
}

/** Returns currencies observed in the supplied public invoice responses. */
export function computeAvailableCurrencies(invoices: readonly Invoice[]): readonly string[] {
  const counts = new Map<string, number>();
  invoices.forEach((invoice) => {
    const code = invoice.paymentInformation.currency.code || defaultCurrencyCode;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  });
  return [...counts.entries()]
    .toSorted(([left, leftCount], [right, rightCount]) => rightCount - leftCount || left.localeCompare(right))
    .map(([code]) => code);
}

/**
 * Returns classification options from present, classified invoices only.
 *
 * @remarks
 * Null classifications are deliberately excluded: absence is not a taxonomy
 * option and never gets converted into a fake numeric category.
 */
export function computeAvailableClassifications(invoices: readonly Invoice[]): readonly ClassificationFilterOption[] {
  const counts = new Map<string, {option: ClassificationFilterOption; count: number}>();
  invoices.forEach((invoice) => {
    const classification = invoice.classification;
    if (classification === null) return;
    const key = stableKey(classification.system, classification.code);
    const rootCode = classification.hierarchy[0]?.code ?? classification.code;
    const existing = counts.get(key);
    counts.set(key, {
      option: {key, label: classification.officialLabel, rootCode},
      count: (existing?.count ?? 0) + 1,
    });
  });
  return byFrequencyThenLabel([...counts.values()].map(({option, count}) => [option, count]));
}

/** Returns payment types observed in invoice DTOs. */
export function computeAvailablePaymentTypes(invoices: readonly Invoice[]): readonly PaymentType[] {
  const counts = new Map<PaymentType, number>();
  invoices.forEach((invoice) => {
    const type = invoice.paymentInformation.paymentType;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  });
  return [...counts.entries()]
    .toSorted(([left, leftCount], [right, rightCount]) => rightCount - leftCount || left - right)
    .map(([type]) => type);
}

/** Builds the stable URL filter key for a canonical classification. */
export function toClassificationFilterKey(system: string, code: string): string {
  return stableKey(system, code);
}
