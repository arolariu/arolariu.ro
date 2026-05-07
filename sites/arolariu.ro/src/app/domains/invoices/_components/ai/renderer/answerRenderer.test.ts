import {describe, expect, it, vi} from "vitest";
import {renderAnswer} from "./answerRenderer";
import type {StructuredAnswer} from "../aggregators";

const tStub = vi.fn((key: string, params?: Record<string, unknown>) => `${key}#${JSON.stringify(params ?? {})}`);

describe("renderAnswer", () => {
  it("renders totalSpend populated", () => {
    const answer: StructuredAnswer = {intent: "totalSpend", result: {kind: "populated", timeframe: "last-month", buckets: [{currency: "EUR", totalSpend: 385.5, invoiceCount: 13}]}};
    const out = renderAnswer(answer, tStub);
    expect(out.viz).toBe("single-stat");
    expect(out.prose).toContain("InvoiceAssistant.answers.totalSpend");
  });

  it("renders totalSpend empty", () => {
    const answer: StructuredAnswer = {intent: "totalSpend", result: {kind: "empty", timeframe: "last-week"}};
    const out = renderAnswer(answer, tStub);
    expect(out.prose).toContain("InvoiceAssistant.answers.totalSpendEmpty");
  });

  it("renders topMerchantsByCount with topList", () => {
    const answer: StructuredAnswer = {intent: "topMerchantsByCount", result: {kind: "populated", timeframe: "last-month", buckets: [{merchantId: "m-lidl", merchantName: "Lidl", visitCount: 5}]}};
    const out = renderAnswer(answer, tStub);
    expect(out.viz).toBe("bar-chart-horizontal");
    expect(out.prose).toContain("Lidl");
  });

  it("renders spendComparison with direction word", () => {
    const answer: StructuredAnswer = {intent: "spendComparison", result: {kind: "populated", buckets: [{currency: "EUR", a: {timeframe: "last-month", totalSpend: 100}, b: {timeframe: "this-month", totalSpend: 130}, deltaAbs: 30, deltaPct: 30}]}};
    const out = renderAnswer(answer, tStub);
    expect(out.viz).toBe("comparison-pair");
    expect(out.prose).toContain("InvoiceAssistant.answers.spendComparison");
  });

  it("renders spendComparison no-change branch when deltaAbs is 0", () => {
    const answer: StructuredAnswer = {intent: "spendComparison", result: {kind: "populated", buckets: [{currency: "EUR", a: {timeframe: "last-month", totalSpend: 100}, b: {timeframe: "this-month", totalSpend: 100}, deltaAbs: 0, deltaPct: 0}]}};
    const out = renderAnswer(answer, tStub);
    expect(out.prose).toContain("InvoiceAssistant.answers.spendComparisonNoChange");
  });
});