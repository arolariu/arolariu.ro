import type {Invoice} from "@/types/invoices";
import type {Timeframe} from "../types";
import {filterByTimeframe, filterNotDeleted} from "./shared";

export type TopMerchantsByCountSlots = Readonly<{timeframe: Timeframe; topK: number}>;

export type MerchantCountBucket = Readonly<{merchantId: string; merchantName: string; visitCount: number}>;

export type TopMerchantsByCountResult =
  | Readonly<{kind: "empty"; timeframe: Timeframe}>
  | Readonly<{kind: "populated"; timeframe: Timeframe; buckets: ReadonlyArray<MerchantCountBucket>}>;

export function topMerchantsByCount(invoices: ReadonlyArray<Invoice>, slots: TopMerchantsByCountSlots, now: Date): TopMerchantsByCountResult {
  const filtered = filterByTimeframe(filterNotDeleted(invoices), slots.timeframe, now);
  if (filtered.length === 0) return {kind: "empty", timeframe: slots.timeframe};

  const counts = new Map<string, number>();
  for (const inv of filtered) {
    const id = inv.merchantReference;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const sorted = Array.from(counts.entries())
    .map(([merchantId, visitCount]) => ({merchantId, merchantName: merchantId, visitCount}))
    .sort((a, b) => b.visitCount - a.visitCount || a.merchantId.localeCompare(b.merchantId))
    .slice(0, slots.topK);
  return {kind: "populated", timeframe: slots.timeframe, buckets: sorted};
}