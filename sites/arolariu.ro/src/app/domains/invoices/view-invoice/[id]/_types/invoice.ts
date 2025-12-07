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
