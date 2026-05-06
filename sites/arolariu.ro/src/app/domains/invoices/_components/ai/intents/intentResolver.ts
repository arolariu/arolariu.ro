/**
 * @fileoverview Validates intent + slots and normalizes to canonical shape.
 * @module app/domains/invoices/_components/ai/intents/intentResolver
 *
 * @remarks
 * The trust boundary between the model layer and the deterministic
 * aggregator layer. NEVER spread or pass through unvalidated slots.
 *
 * Three-state semantics for slot coercion:
 * - Slot present AND valid -> use it.
 * - Slot present BUT invalid -> reject as out-of-scope.
 * - Slot absent -> fall through to question-text parsing, then defaults.
 */

import type {AssistantLocale, IntentId, Timeframe} from "../types";
import {INTENT_IDS, getIntentDefinition} from "./catalog";
import {parseTimeframe, parseTopK} from "./slotLexicon";

export type ResolveInput = Readonly<{
  intent: IntentId;
  slots: Record<string, unknown>;
  question: string;
  locale: AssistantLocale;
}>;

export type ResolvedSlots = Readonly<{
  timeframe?: Timeframe;
  topK?: number;
  category?: string;
  merchantId?: string;
  timeframeA?: Timeframe;
  timeframeB?: Timeframe;
}>;

export type ResolveResult =
  | Readonly<{status: "resolved"; intent: IntentId; slots: ResolvedSlots}>
  | Readonly<{status: "out-of-scope"; reason: string}>;

const VALID_TIMEFRAMES: ReadonlySet<Timeframe> = new Set([
  "this-week", "last-week", "this-month", "last-month",
  "last-3-months", "last-6-months", "this-quarter", "last-quarter",
  "this-year", "last-year", "all-time", "custom",
]);

type SlotState = {kind: "valid"; value: Timeframe} | {kind: "invalid"} | {kind: "absent"};

function inspectTimeframeSlot(raw: unknown): SlotState {
  if (raw === undefined || raw === null) return {kind: "absent"};
  if (typeof raw === "string" && VALID_TIMEFRAMES.has(raw as Timeframe)) {
    return {kind: "valid", value: raw as Timeframe};
  }
  return {kind: "invalid"};
}

export function resolveIntent(input: ResolveInput): ResolveResult {
  const {intent, slots, question, locale} = input;
  if (!INTENT_IDS.has(intent)) return {status: "out-of-scope", reason: "unknown-intent"};
  const def = getIntentDefinition(intent);
  if (!def) return {status: "out-of-scope", reason: "unknown-intent"};

  const out: Record<string, unknown> = {};

  if (def.slots.includes("timeframe")) {
    const state = inspectTimeframeSlot(slots["timeframe"]);
    if (state.kind === "invalid") return {status: "out-of-scope", reason: "invalid-timeframe"};
    if (state.kind === "valid") {
      out["timeframe"] = state.value;
    } else {
      out["timeframe"] = parseTimeframe(question, locale) ?? "all-time";
    }
  }
  if (def.slots.includes("topK")) {
    const raw = slots["topK"];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      out["topK"] = Math.max(1, Math.min(20, Math.round(raw)));
    } else {
      out["topK"] = parseTopK(question, locale);
    }
  }
  if (def.slots.includes("category") && typeof slots["category"] === "string") {
    out["category"] = slots["category"];
  }
  if (def.slots.includes("merchantId") && typeof slots["merchantId"] === "string") {
    out["merchantId"] = slots["merchantId"];
  }
  if (def.slots.includes("timeframeA")) {
    const state = inspectTimeframeSlot(slots["timeframeA"]);
    if (state.kind === "invalid") return {status: "out-of-scope", reason: "invalid-timeframeA"};
    if (state.kind === "absent") return {status: "out-of-scope", reason: "missing-timeframeA"};
    out["timeframeA"] = state.value;
  }
  if (def.slots.includes("timeframeB")) {
    const state = inspectTimeframeSlot(slots["timeframeB"]);
    if (state.kind === "invalid") return {status: "out-of-scope", reason: "invalid-timeframeB"};
    if (state.kind === "absent") return {status: "out-of-scope", reason: "missing-timeframeB"};
    out["timeframeB"] = state.value;
  }

  return {status: "resolved", intent, slots: out as ResolvedSlots};
}