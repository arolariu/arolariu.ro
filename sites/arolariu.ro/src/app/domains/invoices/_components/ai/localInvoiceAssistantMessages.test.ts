/**
 * @fileoverview Tests for Task 8 i18n message keys in all locales.
 *
 * Verifies that required Task 8 translation keys exist in en/ro/fr locale files.
 *
 * @module app/domains/invoices/_components/ai/localInvoiceAssistantMessages.test
 */

import {describe, expect, it} from "vitest";
import enMessages from "../../../../../../messages/en.json";
import frMessages from "../../../../../../messages/fr.json";
import roMessages from "../../../../../../messages/ro.json";

describe("LocalInvoiceAssistant i18n messages", () => {
  const requiredSuggestedPromptsKeys = [
    "title",
    "summarizeSpending",
    "largestInvoice",
    "topMerchant",
    "spendingByCurrency",
  ] as const;

  const requiredAnalyticsPreviewKeys = [
    "title",
    "totalSpendLabel",
    "invoiceCountLabel",
    "noData",
    "currencyBreakdown",
    "topMerchantLabel",
    "topMerchantInvoiceCount",
  ] as const;

  it("has all required suggestedPrompts keys in en.json", () => {
    const suggestedPrompts = enMessages["IMS--LocalInvoiceAssistant"]?.suggestedPrompts;
    expect(suggestedPrompts).toBeDefined();

    for (const key of requiredSuggestedPromptsKeys) {
      expect(suggestedPrompts).toHaveProperty(key);
      expect(typeof suggestedPrompts[key]).toBe("string");
      expect(suggestedPrompts[key].length).toBeGreaterThan(0);
    }
  });

  it("has all required analyticsPreview keys in en.json", () => {
    const analyticsPreview = enMessages["IMS--LocalInvoiceAssistant"]?.analyticsPreview;
    expect(analyticsPreview).toBeDefined();

    for (const key of requiredAnalyticsPreviewKeys) {
      expect(analyticsPreview).toHaveProperty(key);
      expect(typeof analyticsPreview[key]).toBe("string");
      expect(analyticsPreview[key].length).toBeGreaterThan(0);
    }
  });

  it("has all required suggestedPrompts keys in ro.json", () => {
    const suggestedPrompts = roMessages["IMS--LocalInvoiceAssistant"]?.suggestedPrompts;
    expect(suggestedPrompts).toBeDefined();

    for (const key of requiredSuggestedPromptsKeys) {
      expect(suggestedPrompts).toHaveProperty(key);
      expect(typeof suggestedPrompts[key]).toBe("string");
      expect(suggestedPrompts[key].length).toBeGreaterThan(0);
    }
  });

  it("has all required analyticsPreview keys in ro.json", () => {
    const analyticsPreview = roMessages["IMS--LocalInvoiceAssistant"]?.analyticsPreview;
    expect(analyticsPreview).toBeDefined();

    for (const key of requiredAnalyticsPreviewKeys) {
      expect(analyticsPreview).toHaveProperty(key);
      expect(typeof analyticsPreview[key]).toBe("string");
      expect(analyticsPreview[key].length).toBeGreaterThan(0);
    }
  });

  it("has all required suggestedPrompts keys in fr.json", () => {
    const suggestedPrompts = frMessages["IMS--LocalInvoiceAssistant"]?.suggestedPrompts;
    expect(suggestedPrompts).toBeDefined();

    for (const key of requiredSuggestedPromptsKeys) {
      expect(suggestedPrompts).toHaveProperty(key);
      expect(typeof suggestedPrompts[key]).toBe("string");
      expect(suggestedPrompts[key].length).toBeGreaterThan(0);
    }
  });

  it("has all required analyticsPreview keys in fr.json", () => {
    const analyticsPreview = frMessages["IMS--LocalInvoiceAssistant"]?.analyticsPreview;
    expect(analyticsPreview).toBeDefined();

    for (const key of requiredAnalyticsPreviewKeys) {
      expect(analyticsPreview).toHaveProperty(key);
      expect(typeof analyticsPreview[key]).toBe("string");
      expect(analyticsPreview[key].length).toBeGreaterThan(0);
    }
  });

  it("verifies analyticsPreview.topMerchantInvoiceCount has {count} parameter in all locales", () => {
    const enCount = enMessages["IMS--LocalInvoiceAssistant"]?.analyticsPreview?.topMerchantInvoiceCount;
    const roCount = roMessages["IMS--LocalInvoiceAssistant"]?.analyticsPreview?.topMerchantInvoiceCount;
    const frCount = frMessages["IMS--LocalInvoiceAssistant"]?.analyticsPreview?.topMerchantInvoiceCount;

    expect(enCount).toContain("{count}");
    expect(roCount).toContain("{count}");
    expect(frCount).toContain("{count}");
  });
});
