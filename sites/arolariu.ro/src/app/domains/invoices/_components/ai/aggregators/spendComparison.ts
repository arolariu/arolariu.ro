import type {Invoice} from "@/types/invoices";
import type {Timeframe} from "../types";
import {filterByTimeframe, filterNotDeleted, groupByCurrency} from "./shared";

export type SpendComparisonSlots = Readonly<{timeframeA: Timeframe; timeframeB: Timeframe; category?: string}>;

export type ComparisonBucket = Readonly<{
  currency: string;
  a: {timeframe: Timeframe; totalSpend: number};
  b: {timeframe: Timeframe; totalSpend: number};
  deltaAbs: number;
  deltaPct: number | null;
}>;

export type SpendComparisonResult =
  | Readonly<{kind: "empty"; timeframeA: Timeframe; timeframeB: Timeframe}>
  | Readonly<{kind: "populated"; buckets: ReadonlyArray<ComparisonBucket>}>;

function totalsByCurrency(invoices: ReadonlyArray<Invoice>): Map<string, number> {
  const out = new Map<string, number>();
  for (const [currency, list] of groupByCurrency(invoices)) {
    out.set(currency, list.reduce((s, inv) => s + (inv.paymentInformation.totalCostAmount ?? 0), 0));
  }
  return out;
}

export function spendComparison(invoices: ReadonlyArray<Invoice>, slots: SpendComparisonSlots, now: Date): SpendComparisonResult {
  let base = filterNotDeleted(invoices);
  if (slots.category) {
    const cat = slots.category;
    base = base.filter((inv) => String(inv.category) === cat);
  }
  const a = filterByTimeframe(base, slots.timeframeA, now);
  const b = filterByTimeframe(base, slots.timeframeB, now);
  if (a.length === 0 && b.length === 0) {
    return {kind: "empty", timeframeA: slots.timeframeA, timeframeB: slots.timeframeB};
  }

  const aTotals = totalsByCurrency(a);
  const bTotals = totalsByCurrency(b);
  const allCurrencies = new Set([...aTotals.keys(), ...bTotals.keys()]);

  const buckets: ComparisonBucket[] = [];
  for (const currency of allCurrencies) {
    const aTotal = Number((aTotals.get(currency) ?? 0).toFixed(2));
    const bTotal = Number((bTotals.get(currency) ?? 0).toFixed(2));
    const deltaAbs = Number((bTotal - aTotal).toFixed(2));
    const deltaPct = aTotal === 0 ? null : Number(((deltaAbs / aTotal) * 100).toFixed(1));
    buckets.push({
      currency,
      a: {timeframe: slots.timeframeA, totalSpend: aTotal},
      b: {timeframe: slots.timeframeB, totalSpend: bTotal},
      deltaAbs,
      deltaPct,
    });
  }
  return {kind: "populated", buckets};
}