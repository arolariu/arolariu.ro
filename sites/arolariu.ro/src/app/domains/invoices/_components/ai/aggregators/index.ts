/**
 * @fileoverview Aggregator registry — dispatch on intent ID to a typed function.
 * @module app/domains/invoices/_components/ai/aggregators
 */

import type {Invoice} from "@/types/invoices";
import type {IntentId} from "../types";
import type {ResolvedSlots} from "../intents/intentResolver";

import {totalSpend, type TotalSpendResult} from "./totalSpend";
import {invoiceCount, type InvoiceCountResult} from "./invoiceCount";
import {topSpendingByCategory, type TopSpendingByCategoryResult} from "./topSpendingByCategory";
import {topMerchantsByCount, type TopMerchantsByCountResult} from "./topMerchantsByCount";
import {topMerchantsBySpend, type TopMerchantsBySpendResult} from "./topMerchantsBySpend";
import {topProductsByCount, type TopProductsByCountResult} from "./topProductsByCount";
import {topProductsBySpend, type TopProductsBySpendResult} from "./topProductsBySpend";
import {spendComparison, type SpendComparisonResult} from "./spendComparison";
import {averageSpendPerVisit, type AverageSpendPerVisitResult} from "./averageSpendPerVisit";
import {categoryBreakdown, type CategoryBreakdownResult} from "./categoryBreakdown";

export type StructuredAnswer =
  | Readonly<{intent: "totalSpend"; result: TotalSpendResult}>
  | Readonly<{intent: "invoiceCount"; result: InvoiceCountResult}>
  | Readonly<{intent: "topSpendingByCategory"; result: TopSpendingByCategoryResult}>
  | Readonly<{intent: "topMerchantsByCount"; result: TopMerchantsByCountResult}>
  | Readonly<{intent: "topMerchantsBySpend"; result: TopMerchantsBySpendResult}>
  | Readonly<{intent: "topProductsByCount"; result: TopProductsByCountResult}>
  | Readonly<{intent: "topProductsBySpend"; result: TopProductsBySpendResult}>
  | Readonly<{intent: "spendComparison"; result: SpendComparisonResult}>
  | Readonly<{intent: "averageSpendPerVisit"; result: AverageSpendPerVisitResult}>
  | Readonly<{intent: "categoryBreakdown"; result: CategoryBreakdownResult}>;

export function runAggregator(intent: IntentId, invoices: ReadonlyArray<Invoice>, slots: ResolvedSlots, now: Date): StructuredAnswer {
  switch (intent) {
    case "totalSpend":
      return {intent, result: totalSpend(invoices, {timeframe: slots.timeframe!, ...(slots.category !== undefined ? {category: slots.category} : {})}, now)};
    case "invoiceCount":
      return {intent, result: invoiceCount(invoices, {timeframe: slots.timeframe!, ...(slots.category !== undefined ? {category: slots.category} : {})}, now)};
    case "topSpendingByCategory":
      return {intent, result: topSpendingByCategory(invoices, {timeframe: slots.timeframe!, topK: slots.topK ?? 5}, now)};
    case "topMerchantsByCount":
      return {intent, result: topMerchantsByCount(invoices, {timeframe: slots.timeframe!, topK: slots.topK ?? 5}, now)};
    case "topMerchantsBySpend":
      return {intent, result: topMerchantsBySpend(invoices, {timeframe: slots.timeframe!, topK: slots.topK ?? 5}, now)};
    case "topProductsByCount":
      return {intent, result: topProductsByCount(invoices, {timeframe: slots.timeframe!, topK: slots.topK ?? 5}, now)};
    case "topProductsBySpend":
      return {intent, result: topProductsBySpend(invoices, {timeframe: slots.timeframe!, topK: slots.topK ?? 5}, now)};
    case "spendComparison":
      return {intent, result: spendComparison(invoices, {timeframeA: slots.timeframeA!, timeframeB: slots.timeframeB!, ...(slots.category !== undefined ? {category: slots.category} : {})}, now)};
    case "averageSpendPerVisit":
      return {intent, result: averageSpendPerVisit(invoices, {timeframe: slots.timeframe!, ...(slots.merchantId !== undefined ? {merchantId: slots.merchantId} : {})}, now)};
    case "categoryBreakdown":
      return {intent, result: categoryBreakdown(invoices, {timeframe: slots.timeframe!}, now)};
    default: {
      const _exhaustive: never = intent;
      throw new Error(`Unknown intent: ${String(_exhaustive)}`);
    }
  }
}