import {describe, expect, it} from "vitest";
import {resolveIntent} from "./intentResolver";

describe("resolveIntent", () => {
  it("rejects an unknown intent id", () => {
    const result = resolveIntent({intent: "nonExistentIntent" as never, slots: {}, question: "x", locale: "en"});
    expect(result).toEqual({status: "out-of-scope", reason: "unknown-intent"});
  });

  it("normalizes timeframe from question text via slotLexicon", () => {
    const result = resolveIntent({intent: "topMerchantsByCount", slots: {}, question: "top merchants last month?", locale: "en"});
    expect(result).toEqual({status: "resolved", intent: "topMerchantsByCount", slots: {timeframe: "last-month", topK: 5}});
  });

  it("uses provided slot.timeframe verbatim if it matches a Timeframe enum value", () => {
    const result = resolveIntent({intent: "topMerchantsByCount", slots: {timeframe: "last-3-months"}, question: "ignored", locale: "en"});
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") expect(result.slots.timeframe).toBe("last-3-months");
  });

  it("rejects an invalid slot.timeframe string", () => {
    const result = resolveIntent({intent: "topMerchantsByCount", slots: {timeframe: "yesterday"}, question: "x", locale: "en"});
    expect(result.status).toBe("out-of-scope");
  });

  it("clamps topK from slots to [1, 20]", () => {
    const a = resolveIntent({intent: "topMerchantsByCount", slots: {topK: 99, timeframe: "last-month"}, question: "x", locale: "en"});
    const b = resolveIntent({intent: "topMerchantsByCount", slots: {topK: 0, timeframe: "last-month"}, question: "x", locale: "en"});
    if (a.status === "resolved") expect(a.slots.topK).toBe(20);
    if (b.status === "resolved") expect(b.slots.topK).toBe(1);
  });

  it("defaults topK to 5 when neither slot nor question specifies it", () => {
    const result = resolveIntent({intent: "topMerchantsByCount", slots: {timeframe: "last-month"}, question: "merchants?", locale: "en"});
    if (result.status === "resolved") expect(result.slots.topK).toBe(5);
  });

  it("falls back to 'all-time' when no timeframe found in question or slots", () => {
    const result = resolveIntent({intent: "topMerchantsByCount", slots: {}, question: "merchants please", locale: "en"});
    if (result.status === "resolved") expect(result.slots.timeframe).toBe("all-time");
  });

  it("requires both timeframeA and timeframeB for spendComparison", () => {
    const ok = resolveIntent({intent: "spendComparison", slots: {timeframeA: "last-month", timeframeB: "last-year"}, question: "x", locale: "en"});
    expect(ok.status).toBe("resolved");
    const missingB = resolveIntent({intent: "spendComparison", slots: {timeframeA: "last-month"}, question: "x", locale: "en"});
    expect(missingB.status).toBe("out-of-scope");
  });
});