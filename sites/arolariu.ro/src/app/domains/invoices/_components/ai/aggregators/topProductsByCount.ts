import type {Invoice} from "@/types/invoices";
import type {Timeframe} from "../types";
import {filterByTimeframe, filterNotDeleted} from "./shared";

export type TopProductsByCountSlots = Readonly<{timeframe: Timeframe; topK: number}>;

export type ProductCountBucket = Readonly<{
  productName: string;
  totalQuantity: number;
  quantityUnit: string;
  occurrences: number;
}>;

export type TopProductsByCountResult =
  | Readonly<{kind: "empty"; timeframe: Timeframe}>
  | Readonly<{kind: "populated"; timeframe: Timeframe; buckets: ReadonlyArray<ProductCountBucket>}>;

export function topProductsByCount(invoices: ReadonlyArray<Invoice>, slots: TopProductsByCountSlots, now: Date): TopProductsByCountResult {
  const filtered = filterByTimeframe(filterNotDeleted(invoices), slots.timeframe, now);
  if (filtered.length === 0) return {kind: "empty", timeframe: slots.timeframe};

  const totals = new Map<string, {totalQuantity: number; quantityUnit: string; occurrences: number}>();
  for (const inv of filtered) {
    for (const p of inv.items) {
      if (p.metadata.isSoftDeleted) continue;
      const key = p.name;
      const cur = totals.get(key) ?? {totalQuantity: 0, quantityUnit: p.quantityUnit, occurrences: 0};
      cur.totalQuantity += p.quantity;
      cur.occurrences += 1;
      totals.set(key, cur);
    }
  }
  if (totals.size === 0) return {kind: "empty", timeframe: slots.timeframe};

  const sorted = Array.from(totals.entries())
    .map(([productName, agg]) => ({productName, totalQuantity: agg.totalQuantity, quantityUnit: agg.quantityUnit, occurrences: agg.occurrences}))
    .sort((a, b) => b.totalQuantity - a.totalQuantity || a.productName.localeCompare(b.productName))
    .slice(0, slots.topK);
  return {kind: "populated", timeframe: slots.timeframe, buckets: sorted};
}