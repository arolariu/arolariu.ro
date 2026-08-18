/**
 * @fileoverview Types used for invoice analytics and summaries.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_types/invoice
 */

import type {StandardClassification} from "@/types/invoices";

// Simplified historical invoice summary for analytics
export type HistoricalInvoiceSummary = {
  id: string;
  name: string;
  date: Date;
  totalAmount: number;
  itemCount: number;
  merchantName: string;
  classification: StandardClassification | null;
  classificationBreakdown: Readonly<Record<string, number>>;
};
