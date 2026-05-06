import type {Invoice, InvoiceCategory} from "@/types/invoices";
import type {Timeframe} from "../types";
import {filterByTimeframe, filterNotDeleted, groupByCurrency} from "./shared";

export type TopSpendingByCategorySlots = Readonly<{timeframe: Timeframe; topK: number}>;

export type CategoryBucket = Readonly<{
  currency: string;
  category: InvoiceCategory;
  totalSpend: number;
  invoiceCount: number;
}>;

export type TopSpendingByCategoryResult =
  | Readonly<{kind: "empty"; timeframe: Timeframe}>
  | Readonly<{kind: "populated"; timeframe: Timeframe; buckets: ReadonlyArray<CategoryBucket>}>;

export function topSpendingByCategory(invoices: ReadonlyArray<Invoice>, slots: TopSpendingByCategorySlots, now: Date): TopSpendingByCategoryResult {
  const filtered = filterByTimeframe(filterNotDeleted(invoices), slots.timeframe, now);
  if (filtered.length === 0) return {kind: "empty", timeframe: slots.timeframe};

  const allBuckets: CategoryBucket[] = [];
  for (const [currency, list] of groupByCurrency(filtered)) {
    const byCat = new Map<InvoiceCategory, {totalSpend: number; invoiceCount: number}>();
    for (const inv of list) {
      const k = inv.category as InvoiceCategory;
      const cur = byCat.get(k) ?? {totalSpend: 0, invoiceCount: 0};
      cur.totalSpend += inv.paymentInformation.totalCostAmount ?? 0;
      cur.invoiceCount += 1;
      byCat.set(k, cur);
    }
    const sorted = Array.from(byCat.entries())
      .map(([category, agg]) => ({currency, category, totalSpend: Number(agg.totalSpend.toFixed(2)), invoiceCount: agg.invoiceCount}))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, slots.topK);
    allBuckets.push(...sorted);
  }
  return {kind: "populated", timeframe: slots.timeframe, buckets: allBuckets};
}