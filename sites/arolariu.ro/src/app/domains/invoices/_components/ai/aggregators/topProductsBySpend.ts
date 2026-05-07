import type {Invoice} from "@/types/invoices";
import type {Timeframe} from "../types";
import {filterByTimeframe, filterNotDeleted, groupByCurrency} from "./shared";

export type TopProductsBySpendSlots = Readonly<{timeframe: Timeframe; topK: number}>;

export type ProductSpendBucket = Readonly<{
  currency: string;
  productName: string;
  totalSpend: number;
  occurrences: number;
}>;

export type TopProductsBySpendResult =
  | Readonly<{kind: "empty"; timeframe: Timeframe}>
  | Readonly<{kind: "populated"; timeframe: Timeframe; buckets: ReadonlyArray<ProductSpendBucket>}>;

export function topProductsBySpend(invoices: ReadonlyArray<Invoice>, slots: TopProductsBySpendSlots, now: Date): TopProductsBySpendResult {
  const filtered = filterByTimeframe(filterNotDeleted(invoices), slots.timeframe, now);
  if (filtered.length === 0) return {kind: "empty", timeframe: slots.timeframe};

  const all: ProductSpendBucket[] = [];
  for (const [currency, list] of groupByCurrency(filtered)) {
    const sums = new Map<string, {totalSpend: number; occurrences: number}>();
    for (const inv of list) {
      for (const p of inv.items) {
        if (p.metadata.isSoftDeleted) continue;
        const cur = sums.get(p.name) ?? {totalSpend: 0, occurrences: 0};
        cur.totalSpend += p.totalPrice;
        cur.occurrences += 1;
        sums.set(p.name, cur);
      }
    }
    const sorted = Array.from(sums.entries())
      .map(([productName, agg]) => ({currency, productName, totalSpend: Number(agg.totalSpend.toFixed(2)), occurrences: agg.occurrences}))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, slots.topK);
    all.push(...sorted);
  }
  return {kind: "populated", timeframe: slots.timeframe, buckets: all};
}