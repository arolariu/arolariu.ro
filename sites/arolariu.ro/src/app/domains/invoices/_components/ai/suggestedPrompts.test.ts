import {InvoiceBuilder} from "@/data/mocks";
import {describe, expect, it} from "vitest";
import type {LocalInvoiceAssistantAnalytics} from "./invoiceContext";
import {getSuggestedPromptKeys, shouldShowSuggestedPrompts} from "./suggestedPrompts";

describe("suggestedPrompts", () => {
  describe("shouldShowSuggestedPrompts", () => {
    it("returns false when there are no invoices", () => {
      const analytics: LocalInvoiceAssistantAnalytics = {
        dateRange: {end: null, start: null},
        invoiceCount: 0,
        largestInvoices: [],
        merchantBreakdown: {},
        totalSpendByCurrency: {},
      };

      expect(shouldShowSuggestedPrompts(analytics)).toBe(false);
    });

    it("returns false when analytics has empty data", () => {
      const analytics: LocalInvoiceAssistantAnalytics = {
        dateRange: {end: null, start: null},
        invoiceCount: 0,
        largestInvoices: [],
        merchantBreakdown: {},
        totalSpendByCurrency: {},
      };

      expect(shouldShowSuggestedPrompts(analytics)).toBe(false);
    });

    it("returns true when there is at least one invoice", () => {
      const analytics: LocalInvoiceAssistantAnalytics = {
        dateRange: {end: "2024-01-01", start: "2024-01-01"},
        invoiceCount: 1,
        largestInvoices: [
          {
            currencyCode: "RON",
            invoiceAlias: "invoice-1",
            name: "Test Invoice",
            totalAmount: 100,
          },
        ],
        merchantBreakdown: {
          "merchant-1": {
            invoiceCount: 1,
            totalAmountByCurrency: {RON: 100},
          },
        },
        totalSpendByCurrency: {RON: 100},
      };

      expect(shouldShowSuggestedPrompts(analytics)).toBe(true);
    });
  });

  describe("getSuggestedPromptKeys", () => {
    it("returns base prompt keys when analytics are available", () => {
      const analytics: LocalInvoiceAssistantAnalytics = {
        dateRange: {end: "2024-01-01", start: "2024-01-01"},
        invoiceCount: 5,
        largestInvoices: [
          {
            currencyCode: "RON",
            invoiceAlias: "invoice-1",
            name: "Test Invoice",
            totalAmount: 100,
          },
        ],
        merchantBreakdown: {
          "merchant-1": {
            invoiceCount: 3,
            totalAmountByCurrency: {RON: 150, USD: 50},
          },
        },
        totalSpendByCurrency: {RON: 250, USD: 50},
      };

      const keys = getSuggestedPromptKeys(analytics);

      expect(keys).toContain("summarizeSpending");
      expect(keys).toContain("largestInvoice");
      expect(keys).toContain("topMerchant");
      expect(keys).toContain("spendingByCurrency");
    });

    it("does not include currency prompt when only one currency exists", () => {
      const analytics: LocalInvoiceAssistantAnalytics = {
        dateRange: {end: "2024-01-01", start: "2024-01-01"},
        invoiceCount: 2,
        largestInvoices: [],
        merchantBreakdown: {},
        totalSpendByCurrency: {RON: 100},
      };

      const keys = getSuggestedPromptKeys(analytics);

      expect(keys).not.toContain("spendingByCurrency");
    });

    it("includes currency prompt when multiple currencies exist", () => {
      const analytics: LocalInvoiceAssistantAnalytics = {
        dateRange: {end: "2024-01-01", start: "2024-01-01"},
        invoiceCount: 2,
        largestInvoices: [],
        merchantBreakdown: {},
        totalSpendByCurrency: {RON: 100, USD: 50},
      };

      const keys = getSuggestedPromptKeys(analytics);

      expect(keys).toContain("spendingByCurrency");
    });
  });
});
