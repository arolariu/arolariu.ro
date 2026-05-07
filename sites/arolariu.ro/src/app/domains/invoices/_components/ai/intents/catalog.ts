/**
 * @fileoverview Intent registry for the invoice AI assistant.
 * @module app/domains/invoices/_components/ai/intents/catalog
 *
 * @remarks
 * The 10 v1 intents from the spec. Each entry declares its slot grammar
 * and viz hint so the renderer + resolver can dispatch generically.
 *
 * Adding a new intent: add an entry here, add an aggregator file under
 * ../aggregators/, add a localized template under
 * ../renderer/answerRenderer.ts, and add seed phrases under
 * seedPhrases.{en,ro,fr}.ts. No other file touches required.
 */

import type {IntentId, VizHint} from "../types";

export type SlotName = "timeframe" | "topK" | "category" | "merchantId" | "timeframeA" | "timeframeB";

export type IntentDefinition = Readonly<{
  id: IntentId;
  /** Slots this intent reads. Defaults applied by the resolver. */
  slots: ReadonlyArray<SlotName>;
  /** Visualization the renderer should produce. */
  viz: VizHint;
}>;

export const INTENT_CATALOG: ReadonlyArray<IntentDefinition> = [
  {id: "topSpendingByCategory", slots: ["timeframe", "topK"], viz: "bar-chart-horizontal"},
  {id: "topMerchantsByCount", slots: ["timeframe", "topK"], viz: "bar-chart-horizontal"},
  {id: "topMerchantsBySpend", slots: ["timeframe", "topK"], viz: "bar-chart-horizontal"},
  {id: "totalSpend", slots: ["timeframe", "category"], viz: "single-stat"},
  {id: "invoiceCount", slots: ["timeframe", "category"], viz: "single-stat"},
  {id: "topProductsByCount", slots: ["timeframe", "topK"], viz: "bar-chart-horizontal"},
  {id: "topProductsBySpend", slots: ["timeframe", "topK"], viz: "bar-chart-horizontal"},
  {id: "spendComparison", slots: ["timeframeA", "timeframeB", "category"], viz: "comparison-pair"},
  {id: "averageSpendPerVisit", slots: ["timeframe", "merchantId"], viz: "single-stat"},
  {id: "categoryBreakdown", slots: ["timeframe"], viz: "donut"},
];

export const INTENT_IDS: ReadonlySet<IntentId> = new Set(INTENT_CATALOG.map((i) => i.id));

export function getIntentDefinition(id: IntentId): IntentDefinition | undefined {
  return INTENT_CATALOG.find((entry) => entry.id === id);
}