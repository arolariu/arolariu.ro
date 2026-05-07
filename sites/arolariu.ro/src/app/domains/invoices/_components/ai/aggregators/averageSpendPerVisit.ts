import type {Invoice} from "@/types/invoices";
import type {Timeframe} from "../types";
import {filterByTimeframe, filterNotDeleted, groupByCurrency} from "./shared";

export type AverageSpendPerVisitSlots = Readonly<{timeframe: Timeframe; merchantId?: string}>;

export type AverageBucket = Readonly<{
  currency: string;
  averageSpend: number;
  sampleSize: number;
  merchantName?: string;
}>;

export type AverageSpendPerVisitResult =
  | Readonly<{kind: "empty"; timeframe: Timeframe}>
  | Readonly<{kind: "populated"; timeframe: Timeframe; buckets: ReadonlyArray<AverageBucket>}>;

export function averageSpendPerVisit(invoices: ReadonlyArray<Invoice>, slots: AverageSpendPerVisitSlots, now: Date): AverageSpendPerVisitResult {
  let filtered = filterByTimeframe(filterNotDeleted(invoices), slots.timeframe, now);
  if (slots.merchantId) {
    const id = slots.merchantId;
    filtered = filtered.filter((inv) => inv.merchantReference === id);
  }
  if (filtered.length === 0) return {kind: "empty", timeframe: slots.timeframe};

  const buckets: AverageBucket[] = [];
  for (const [currency, list] of groupByCurrency(filtered)) {
    const sum = list.reduce((s, inv) => s + (inv.paymentInformation.totalCostAmount ?? 0), 0);
    buckets.push({
      currency,
      averageSpend: Number((sum / list.length).toFixed(2)),
      sampleSize: list.length,
      ...(slots.merchantId ? {merchantName: slots.merchantId} : {}),
    });
  }
  return {kind: "populated", timeframe: slots.timeframe, buckets};
}