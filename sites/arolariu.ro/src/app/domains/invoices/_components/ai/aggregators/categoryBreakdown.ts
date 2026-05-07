import type {Invoice, InvoiceCategory} from "@/types/invoices";
import type {Timeframe} from "../types";
import {filterByTimeframe, filterNotDeleted, groupByCurrency} from "./shared";

export type CategoryBreakdownSlots = Readonly<{timeframe: Timeframe}>;

export type CategoryBreakdownBucket = Readonly<{
  currency: string;
  category: InvoiceCategory;
  spend: number;
  percentOfTotal: number;
  invoiceCount: number;
}>;

export type CategoryBreakdownResult =
  | Readonly<{kind: "empty"; timeframe: Timeframe}>
  | Readonly<{kind: "populated"; timeframe: Timeframe; buckets: ReadonlyArray<CategoryBreakdownBucket>}>;

export function categoryBreakdown(invoices: ReadonlyArray<Invoice>, slots: CategoryBreakdownSlots, now: Date): CategoryBreakdownResult {
  const filtered = filterByTimeframe(filterNotDeleted(invoices), slots.timeframe, now);
  if (filtered.length === 0) return {kind: "empty", timeframe: slots.timeframe};

  const all: CategoryBreakdownBucket[] = [];
  for (const [currency, list] of groupByCurrency(filtered)) {
    const byCat = new Map<InvoiceCategory, {spend: number; invoiceCount: number}>();
    let total = 0;
    for (const inv of list) {
      const k = inv.category as InvoiceCategory;
      const cur = byCat.get(k) ?? {spend: 0, invoiceCount: 0};
      const amt = inv.paymentInformation.totalCostAmount ?? 0;
      cur.spend += amt;
      cur.invoiceCount += 1;
      total += amt;
      byCat.set(k, cur);
    }
    const buckets = Array.from(byCat.entries())
      .map(([category, agg]) => ({
        currency,
        category,
        spend: Number(agg.spend.toFixed(2)),
        percentOfTotal: total > 0 ? Number(((agg.spend / total) * 100).toFixed(1)) : 0,
        invoiceCount: agg.invoiceCount,
      }))
      .sort((a, b) => b.spend - a.spend);
    all.push(...buckets);
  }
  return {kind: "populated", timeframe: slots.timeframe, buckets: all};
}