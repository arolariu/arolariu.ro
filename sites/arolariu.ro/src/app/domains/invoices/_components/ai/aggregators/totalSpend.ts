/**
 * @fileoverview totalSpend aggregator.
 * @module app/domains/invoices/_components/ai/aggregators/totalSpend
 */

import type {Invoice} from "@/types/invoices";
import type {Timeframe} from "../types";
import {filterByTimeframe, filterNotDeleted, groupByCurrency} from "./shared";

export type TotalSpendSlots = Readonly<{timeframe: Timeframe; category?: string}>;

export type TotalSpendBucket = Readonly<{currency: string; totalSpend: number; invoiceCount: number}>;

export type TotalSpendResult =
  | Readonly<{kind: "empty"; timeframe: Timeframe}>
  | Readonly<{kind: "populated"; timeframe: Timeframe; buckets: ReadonlyArray<TotalSpendBucket>}>;

export function totalSpend(invoices: ReadonlyArray<Invoice>, slots: TotalSpendSlots, now: Date): TotalSpendResult {
  let filtered = filterByTimeframe(filterNotDeleted(invoices), slots.timeframe, now);
  if (slots.category) {
    const cat = slots.category;
    filtered = filtered.filter((inv) => String(inv.category) === cat || (inv.category as unknown as string) === cat);
  }
  if (filtered.length === 0) return {kind: "empty", timeframe: slots.timeframe};

  const buckets: TotalSpendBucket[] = [];
  for (const [currency, list] of groupByCurrency(filtered)) {
    const sum = Number(list.reduce((s, inv) => s + (inv.paymentInformation.totalCostAmount ?? 0), 0).toFixed(2));
    buckets.push({currency, totalSpend: sum, invoiceCount: list.length});
  }
  return {kind: "populated", timeframe: slots.timeframe, buckets};
}