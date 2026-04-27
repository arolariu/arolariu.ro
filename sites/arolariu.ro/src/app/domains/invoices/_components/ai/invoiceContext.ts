/**
 * @fileoverview Invoice context sanitization and analytics for local AI prompts.
 *
 * Redacts sensitive invoice data (IDs, merchant references) and creates compact,
 * privacy-safe analytics summaries suitable for client-only LLM prompts.
 *
 * @module app/domains/invoices/_components/ai/invoiceContext
 */

import type {Invoice} from "@/types/invoices";

/**
 * Default truncation limits for invoice assistant context.
 *
 * @remarks
 * Limits context size for smaller models (Llama 3.2 1B, 4K context window):
 * - Maximum 25 invoices included in prompt
 * - Maximum 20 line items per invoice
 *
 * Omitted items tracked in `omittedItemCount` for transparency.
 */
export const LOCAL_INVOICE_ASSISTANT_CONTEXT_LIMITS = {
  maxInvoices: 25,
  maxLineItemsPerInvoice: 20,
} as const satisfies LocalInvoiceAssistantContextLimits;

/**
 * Context truncation limits for invoice assistant prompts.
 */
export type LocalInvoiceAssistantContextLimits = Readonly<{
  /** Maximum number of invoices to include in context. */
  maxInvoices: number;
  /** Maximum line items per invoice (excess tracked in `omittedItemCount`). */
  maxLineItemsPerInvoice: number;
}>;

/**
 * Sanitized invoice line item for AI prompt context.
 *
 * @remarks
 * **Excluded fields:** Raw OCR data, product IDs, vendor-specific codes.
 * **Retained fields:** Human-readable name, category, price, quantity.
 */
export type SanitizedInvoiceLineItem = Readonly<{
  /** Product category enum value. */
  category: number;
  /** Product name (as recognized by OCR/user). */
  name: string;
  /** Purchased quantity. */
  quantity: number;
  /** Quantity unit (e.g., "kg", "pcs"). */
  quantityUnit: string;
  /** Total price for this line item (quantity × unitPrice). */
  totalPrice: number;
  /** Unit price per quantity unit. */
  unitPrice: number;
}>;

/**
 * Sanitized invoice for AI assistant prompt context.
 *
 * @remarks
 * **Privacy redactions:**
 * - Invoice ID → `invoice-N` (deterministic alias)
 * - Merchant reference → `merchant-N` (deterministic alias)
 * - No scan URLs, account IDs, or raw OCR metadata
 *
 * **Retained data:**
 * - User-assigned name, category, amounts, dates
 * - Top N line items (configurable limit)
 * - Currency and country/region
 */
export type SanitizedInvoiceForAssistant = Readonly<{
  /** Invoice category enum value. */
  category: number;
  /** Country/region code for invoice. */
  countryRegion: string;
  /** Currency code (e.g., "RON", "USD"). */
  currencyCode: string;
  /** Deterministic alias (e.g., "invoice-1") hiding real ID. */
  invoiceAlias: string;
  /** Sanitized line items (limited by `maxLineItemsPerInvoice`). */
  items: ReadonlyArray<SanitizedInvoiceLineItem>;
  /** Deterministic merchant alias (e.g., "merchant-1"). */
  merchantAlias: string;
  /** User-assigned invoice name. */
  name: string;
  /** Count of line items omitted due to truncation. */
  omittedItemCount: number;
  /** Receipt type (e.g., "invoice", "receipt"). */
  receiptType: string;
  /** Total invoice amount. */
  totalAmount: number;
  /** ISO 8601 transaction date (null if unavailable). */
  transactionDate: string | null;
}>;

/**
 * Aggregated analytics for invoice assistant prompt context.
 *
 * @remarks
 * Provides high-level spending insights without exposing sensitive IDs.
 * All amounts grouped by currency to avoid incorrect cross-currency math.
 */
export type LocalInvoiceAssistantAnalytics = Readonly<{
  /** Date range spanning all invoices (ISO 8601). */
  dateRange: Readonly<{
    /** Latest transaction date. */
    end: string | null;
    /** Earliest transaction date. */
    start: string | null;
  }>;
  /** Total number of invoices in context. */
  invoiceCount: number;
  /** Top 5 invoices by total amount. */
  largestInvoices: ReadonlyArray<
    Readonly<{
      currencyCode: string;
      invoiceAlias: string;
      name: string;
      totalAmount: number;
    }>
  >;
  /** Spending breakdown by merchant alias. */
  merchantBreakdown: Record<
    string,
    Readonly<{
      /** Number of invoices from this merchant. */
      invoiceCount: number;
      /** Total spending by currency code. */
      totalAmountByCurrency: Record<string, number>;
    }>
  >;
  /** Total spending across all invoices, grouped by currency. */
  totalSpendByCurrency: Record<string, number>;
}>;

/**
 * Complete invoice context for local AI assistant prompts.
 *
 * @remarks
 * Combines sanitized invoice list with pre-computed analytics.
 * `promptContext` is JSON-serialized for direct LLM injection.
 */
export type LocalInvoiceAssistantContext = Readonly<{
  /** Aggregated analytics summary. */
  analytics: LocalInvoiceAssistantAnalytics;
  /** Sanitized invoice list (redacted IDs). */
  invoices: ReadonlyArray<SanitizedInvoiceForAssistant>;
  /** JSON-stringified context for LLM system prompt. */
  promptContext: string;
}>;

/**
 * Input options for creating invoice assistant context.
 */
type CreateLocalInvoiceAssistantContextInput = Readonly<{
  /** If provided, scope context to single invoice (invoice detail view). */
  activeInvoiceId?: string;
  /** Full invoice list from store. */
  invoices: ReadonlyArray<Invoice>;
  /** Optional context truncation overrides. */
  limits?: Partial<LocalInvoiceAssistantContextLimits>;
}>;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toDateOrNull(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(value: Date | string): string | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getMerchantAlias(merchantAliases: Map<string, string>, merchantReference: string): string {
  const normalizedReference = merchantReference.trim();
  if (!normalizedReference) {
    return "merchant-unknown";
  }

  const existingAlias = merchantAliases.get(normalizedReference);
  if (existingAlias) {
    return existingAlias;
  }

  const nextAlias = `merchant-${merchantAliases.size + 1}`;
  merchantAliases.set(normalizedReference, nextAlias);

  return nextAlias;
}

function sanitizeInvoiceForAssistant(
  invoice: Invoice,
  limits: LocalInvoiceAssistantContextLimits,
  invoiceAlias: string,
  merchantAlias: string,
): SanitizedInvoiceForAssistant {
  const items = invoice.items.slice(0, limits.maxLineItemsPerInvoice).map((item) => ({
    category: item.category,
    name: item.name,
    quantity: item.quantity,
    quantityUnit: item.quantityUnit,
    totalPrice: roundMoney(item.totalPrice),
    unitPrice: roundMoney(item.price),
  }));

  return {
    category: invoice.category,
    countryRegion: invoice.countryRegion,
    currencyCode: invoice.paymentInformation.currency.code,
    invoiceAlias,
    items,
    merchantAlias,
    name: invoice.name,
    omittedItemCount: Math.max(invoice.items.length - items.length, 0),
    receiptType: invoice.receiptType,
    totalAmount: roundMoney(invoice.paymentInformation.totalCostAmount),
    transactionDate: toIsoDate(invoice.paymentInformation.transactionDate),
  };
}

function createLocalInvoiceAssistantAnalytics(invoices: ReadonlyArray<SanitizedInvoiceForAssistant>): LocalInvoiceAssistantAnalytics {
  const totalSpendByCurrency: Record<string, number> = {};
  const merchantBreakdown: Record<
    string,
    {
      invoiceCount: number;
      totalAmountByCurrency: Record<string, number>;
    }
  > = {};
  const transactionDates = invoices
    .map((invoice) => toDateOrNull(invoice.transactionDate))
    .filter((date): date is Date => date !== null)
    .toSorted((left, right) => left.getTime() - right.getTime());

  for (const invoice of invoices) {
    totalSpendByCurrency[invoice.currencyCode] = roundMoney((totalSpendByCurrency[invoice.currencyCode] ?? 0) + invoice.totalAmount);

    const merchantKey = invoice.merchantAlias;
    merchantBreakdown[merchantKey] ??= {
      invoiceCount: 0,
      totalAmountByCurrency: {},
    };
    merchantBreakdown[merchantKey].invoiceCount += 1;
    merchantBreakdown[merchantKey].totalAmountByCurrency[invoice.currencyCode] = roundMoney(
      (merchantBreakdown[merchantKey].totalAmountByCurrency[invoice.currencyCode] ?? 0) + invoice.totalAmount,
    );
  }

  return {
    dateRange: {
      end: transactionDates.at(-1)?.toISOString() ?? null,
      start: transactionDates.at(0)?.toISOString() ?? null,
    },
    invoiceCount: invoices.length,
    largestInvoices: invoices
      .toSorted((left, right) => right.totalAmount - left.totalAmount)
      .slice(0, 5)
      .map((invoice) => ({
        currencyCode: invoice.currencyCode,
        invoiceAlias: invoice.invoiceAlias,
        name: invoice.name,
        totalAmount: invoice.totalAmount,
      })),
    merchantBreakdown,
    totalSpendByCurrency,
  };
}

/**
 * Creates privacy-safe, sanitized invoice context for local AI assistant prompts.
 *
 * @param input - Invoice list, optional single-invoice scope, and truncation limits.
 * @returns Redacted invoice context with deterministic analytics and JSON prompt string.
 *
 * @remarks
 * **Privacy model:**
 * - Replaces invoice IDs with deterministic aliases (`invoice-1`, `invoice-2`)
 * - Replaces merchant references with aliases (`merchant-1`, `merchant-2`)
 * - Excludes: Scan URLs, account IDs, raw OCR metadata, product IDs
 * - Retains: User-assigned names, categories, amounts, dates
 *
 * **Truncation:**
 * - Limits to first `maxInvoices` invoices
 * - Limits to first `maxLineItemsPerInvoice` items per invoice
 * - Tracks omitted item count for transparency
 *
 * **Analytics:**
 * - Total spending by currency (no cross-currency arithmetic)
 * - Merchant breakdown with invoice count and spending
 * - Top 5 largest invoices
 * - Date range spanning all invoices
 *
 * @example
 * ```typescript
 * const context = createLocalInvoiceAssistantContext({
 *   invoices: allInvoices,
 *   limits: {maxInvoices: 10}
 * });
 * // Use context.promptContext in LLM system message
 * console.log(context.analytics.totalSpendByCurrency);
 * ```
 */
export function createLocalInvoiceAssistantContext({
  activeInvoiceId,
  invoices,
  limits,
}: CreateLocalInvoiceAssistantContextInput): LocalInvoiceAssistantContext {
  const resolvedLimits = {
    ...LOCAL_INVOICE_ASSISTANT_CONTEXT_LIMITS,
    ...limits,
  };
  const scopedInvoices = activeInvoiceId ? invoices.filter((invoice) => invoice.id === activeInvoiceId) : invoices;
  const merchantAliases = new Map<string, string>();
  const sanitizedInvoices = scopedInvoices
    .slice(0, resolvedLimits.maxInvoices)
    .map((invoice, index) =>
      sanitizeInvoiceForAssistant(
        invoice,
        resolvedLimits,
        `invoice-${index + 1}`,
        getMerchantAlias(merchantAliases, invoice.merchantReference),
      ),
    );
  const analytics = createLocalInvoiceAssistantAnalytics(sanitizedInvoices);

  return {
    analytics,
    invoices: sanitizedInvoices,
    promptContext: JSON.stringify({analytics, invoices: sanitizedInvoices}),
  };
}
