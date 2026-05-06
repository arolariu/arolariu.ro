import type {Invoice, InvoiceCategory} from "@/types/invoices";
import type {Timeframe} from "../types";
import {filterByTimeframe, filterNotDeleted} from "./shared";

export type InvoiceCountSlots = Readonly<{timeframe: Timeframe; category?: string}>;

export type InvoiceCountResult =
  | Readonly<{kind: "empty"; timeframe: Timeframe}>
  | Readonly<{kind: "populated"; timeframe: Timeframe; count: number; breakdown?: Record<string, number>}>;

export function invoiceCount(invoices: ReadonlyArray<Invoice>, slots: InvoiceCountSlots, now: Date): InvoiceCountResult {
  let filtered = filterByTimeframe(filterNotDeleted(invoices), slots.timeframe, now);
  if (slots.category) {
    const cat = slots.category;
    filtered = filtered.filter((inv) => String(inv.category) === cat);
    if (filtered.length === 0) return {kind: "empty", timeframe: slots.timeframe};
    return {kind: "populated", timeframe: slots.timeframe, count: filtered.length};
  }
  if (filtered.length === 0) return {kind: "empty", timeframe: slots.timeframe};
  const breakdown: Record<string, number> = {};
  for (const inv of filtered) {
    const k = String(inv.category as InvoiceCategory);
    breakdown[k] = (breakdown[k] ?? 0) + 1;
  }
  return {kind: "populated", timeframe: slots.timeframe, count: filtered.length, breakdown};
}