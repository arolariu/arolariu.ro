import type {Invoice} from "@/types/invoices";

export const LOCAL_INVOICE_ASSISTANT_CONTEXT_LIMITS = {
  maxInvoices: 25,
  maxLineItemsPerInvoice: 20,
} as const satisfies LocalInvoiceAssistantContextLimits;

export type LocalInvoiceAssistantContextLimits = Readonly<{
  maxInvoices: number;
  maxLineItemsPerInvoice: number;
}>;

export type SanitizedInvoiceLineItem = Readonly<{
  category: number;
  name: string;
  quantity: number;
  quantityUnit: string;
  totalPrice: number;
  unitPrice: number;
}>;

export type SanitizedInvoiceForAssistant = Readonly<{
  category: number;
  countryRegion: string;
  currencyCode: string;
  id: string;
  items: ReadonlyArray<SanitizedInvoiceLineItem>;
  merchantReference: string;
  name: string;
  omittedItemCount: number;
  receiptType: string;
  totalAmount: number;
  transactionDate: string | null;
}>;

export type LocalInvoiceAssistantAnalytics = Readonly<{
  dateRange: Readonly<{
    end: string | null;
    start: string | null;
  }>;
  invoiceCount: number;
  largestInvoices: ReadonlyArray<
    Readonly<{
      currencyCode: string;
      id: string;
      name: string;
      totalAmount: number;
    }>
  >;
  merchantReferenceBreakdown: Record<
    string,
    Readonly<{
      invoiceCount: number;
      totalAmountByCurrency: Record<string, number>;
    }>
  >;
  totalSpendByCurrency: Record<string, number>;
}>;

export type LocalInvoiceAssistantContext = Readonly<{
  analytics: LocalInvoiceAssistantAnalytics;
  invoices: ReadonlyArray<SanitizedInvoiceForAssistant>;
  promptContext: string;
}>;

type CreateLocalInvoiceAssistantContextInput = Readonly<{
  activeInvoiceId?: string;
  invoices: ReadonlyArray<Invoice>;
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

function sanitizeInvoiceForAssistant(invoice: Invoice, limits: LocalInvoiceAssistantContextLimits): SanitizedInvoiceForAssistant {
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
    id: invoice.id,
    items,
    merchantReference: invoice.merchantReference,
    name: invoice.name,
    omittedItemCount: Math.max(invoice.items.length - items.length, 0),
    receiptType: invoice.receiptType,
    totalAmount: roundMoney(invoice.paymentInformation.totalCostAmount),
    transactionDate: toIsoDate(invoice.paymentInformation.transactionDate),
  };
}

function createLocalInvoiceAssistantAnalytics(invoices: ReadonlyArray<SanitizedInvoiceForAssistant>): LocalInvoiceAssistantAnalytics {
  const totalSpendByCurrency: Record<string, number> = {};
  const merchantReferenceBreakdown: Record<
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

    const merchantKey = invoice.merchantReference || "unknown";
    merchantReferenceBreakdown[merchantKey] ??= {
      invoiceCount: 0,
      totalAmountByCurrency: {},
    };
    merchantReferenceBreakdown[merchantKey].invoiceCount += 1;
    merchantReferenceBreakdown[merchantKey].totalAmountByCurrency[invoice.currencyCode] = roundMoney(
      (merchantReferenceBreakdown[merchantKey].totalAmountByCurrency[invoice.currencyCode] ?? 0) + invoice.totalAmount,
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
        id: invoice.id,
        name: invoice.name,
        totalAmount: invoice.totalAmount,
      })),
    merchantReferenceBreakdown,
    totalSpendByCurrency,
  };
}

/**
 * Creates a compact, sanitized invoice context for local-only assistant prompts.
 *
 * @param input - Invoice list plus optional active invoice and truncation limits.
 * @returns Redacted invoice context and deterministic analytics.
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
  const sanitizedInvoices = scopedInvoices
    .slice(0, resolvedLimits.maxInvoices)
    .map((invoice) => sanitizeInvoiceForAssistant(invoice, resolvedLimits));
  const analytics = createLocalInvoiceAssistantAnalytics(sanitizedInvoices);

  return {
    analytics,
    invoices: sanitizedInvoices,
    promptContext: JSON.stringify({analytics, invoices: sanitizedInvoices}),
  };
}
