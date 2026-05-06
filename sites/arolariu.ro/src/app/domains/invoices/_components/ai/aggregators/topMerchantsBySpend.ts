import type {Invoice} from "@/types/invoices";
import type {Timeframe} from "../types";
import {filterByTimeframe, filterNotDeleted, groupByCurrency} from "./shared";

export type TopMerchantsBySpendSlots = Readonly<{timeframe: Timeframe; topK: number}>;

export type MerchantSpendBucket = Readonly<{currency: string; merchantId: string; merchantName: string; totalSpend: number}>;

export type TopMerchantsBySpendResult =
  | Readonly<{kind: "empty"; timeframe: Timeframe}>
  | Readonly<{kind: "populated"; timeframe: Timeframe; buckets: ReadonlyArray<MerchantSpendBucket>}>;

export function topMerchantsBySpend(invoices: ReadonlyArray<Invoice>, slots: TopMerchantsBySpendSlots, now: Date): TopMerchantsBySpendResult {
  const filtered = filterByTimeframe(filterNotDeleted(invoices), slots.timeframe, now);
  if (filtered.length === 0) return {kind: "empty", timeframe: slots.timeframe};

  const all: MerchantSpendBucket[] = [];
  for (const [currency, list] of groupByCurrency(filtered)) {
    const sums = new Map<string, number>();
    for (const inv of list) {
      const id = inv.merchantReference;
      sums.set(id, (sums.get(id) ?? 0) + (inv.paymentInformation.totalCostAmount ?? 0));
    }
    const sorted = Array.from(sums.entries())
      .map(([merchantId, totalSpend]) => ({currency, merchantId, merchantName: merchantId, totalSpend: Number(totalSpend.toFixed(2))}))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, slots.topK);
    all.push(...sorted);
  }
  return {kind: "populated", timeframe: slots.timeframe, buckets: all};
}