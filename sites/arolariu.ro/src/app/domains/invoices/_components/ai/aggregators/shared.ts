/**
 * @fileoverview Shared helpers used by every aggregator.
 * @module app/domains/invoices/_components/ai/aggregators/shared
 *
 * @remarks
 * Date-window resolution + currency grouping + soft-delete filtering.
 * Pure TS, no model dependencies. All "now" dependencies are explicit
 * params so tests are deterministic.
 *
 * Currency handling: invoice fixtures put a string in
 * paymentInformation.currency, while the production type defines it
 * as a Currency object {code, symbol, name}. groupByCurrency handles
 * both shapes: prefers .code when the field is an object, falls back
 * to the value itself when it's a string.
 */

import type {Invoice} from "@/types/invoices";
import type {Timeframe} from "../types";

export type DateWindow = Readonly<{start: Date; end: Date}>;

export function resolveTimeframeWindow(timeframe: Timeframe, now: Date): DateWindow {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  switch (timeframe) {
    case "this-month":
      return {start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 1))};
    case "last-month":
      return {start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1))};
    case "this-week": {
      const dow = now.getUTCDay();
      const monday = new Date(now);
      monday.setUTCDate(monday.getUTCDate() - ((dow + 6) % 7));
      monday.setUTCHours(0, 0, 0, 0);
      const end = new Date(monday);
      end.setUTCDate(end.getUTCDate() + 7);
      return {start: monday, end};
    }
    case "last-week": {
      const dow = now.getUTCDay();
      const lastMonday = new Date(now);
      lastMonday.setUTCDate(lastMonday.getUTCDate() - ((dow + 6) % 7) - 7);
      lastMonday.setUTCHours(0, 0, 0, 0);
      const end = new Date(lastMonday);
      end.setUTCDate(end.getUTCDate() + 7);
      return {start: lastMonday, end};
    }
    case "last-3-months": {
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 90);
      return {start, end: now};
    }
    case "last-6-months": {
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 180);
      return {start, end: now};
    }
    case "this-quarter": {
      const qStartMonth = Math.floor(m / 3) * 3;
      return {start: new Date(Date.UTC(y, qStartMonth, 1)), end: new Date(Date.UTC(y, qStartMonth + 3, 1))};
    }
    case "last-quarter": {
      const qStartMonth = Math.floor(m / 3) * 3 - 3;
      return {start: new Date(Date.UTC(y, qStartMonth, 1)), end: new Date(Date.UTC(y, qStartMonth + 3, 1))};
    }
    case "this-year":
      return {start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1))};
    case "last-year":
      return {start: new Date(Date.UTC(y - 1, 0, 1)), end: new Date(Date.UTC(y, 0, 1))};
    case "all-time":
      return {start: new Date("1970-01-01T00:00:00.000Z"), end: new Date("2999-12-31T23:59:59.999Z")};
    case "custom":
      return {start: new Date("1970-01-01T00:00:00.000Z"), end: now};
  }
}

export function filterNotDeleted(invoices: ReadonlyArray<Invoice>): ReadonlyArray<Invoice> {
  return invoices.filter((inv) => !(inv as unknown as {isDeleted?: boolean}).isDeleted);
}

export function filterByTimeframe(invoices: ReadonlyArray<Invoice>, timeframe: Timeframe, now: Date): ReadonlyArray<Invoice> {
  const {start, end} = resolveTimeframeWindow(timeframe, now);
  return invoices.filter((inv) => {
    const d = inv.paymentInformation.transactionDate;
    return d >= start && d < end;
  });
}

/** Best-effort currency code extraction (handles both string and Currency-object shapes). */
function currencyCode(inv: Invoice): string {
  const raw = inv.paymentInformation.currency as unknown;
  if (typeof raw === "string") return raw || "UNKNOWN";
  if (raw && typeof raw === "object" && "code" in raw && typeof (raw as {code: unknown}).code === "string") {
    return (raw as {code: string}).code || "UNKNOWN";
  }
  return "UNKNOWN";
}

export function groupByCurrency(invoices: ReadonlyArray<Invoice>): ReadonlyMap<string, ReadonlyArray<Invoice>> {
  const out = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    const c = currencyCode(inv);
    const arr = out.get(c) ?? [];
    arr.push(inv);
    out.set(c, arr);
  }
  return out;
}