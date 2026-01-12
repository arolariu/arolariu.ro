/**
 * @fileoverview Types used for invoice analytics and summaries.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_types/invoice
 */

import {InvoiceCategory, ProductCategory} from "@/types/invoices";

// Simplified historical invoice summary for analytics
export type HistoricalInvoiceSummary = {
  id: string;
  name: string;
  date: Date;
  totalAmount: number;
  itemCount: number;
  merchantName: string;
  category: InvoiceCategory;
  categoryBreakdown: Record<ProductCategory, number>;
};
