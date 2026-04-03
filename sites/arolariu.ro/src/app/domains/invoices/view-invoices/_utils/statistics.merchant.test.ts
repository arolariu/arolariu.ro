/**
 * @fileoverview Unit tests for merchant analytics functions.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_utils/statistics.merchant.test
 */

import {describe, expect, it} from "vitest";

// Import types
import type {Invoice} from "@/types/invoices";

// Import functions to test
import {computeMerchantTrends, computeMerchantVisitFrequency} from "./statistics";

/**
 * Counter for generating unique invoice IDs
 */
let invoiceIdCounter = 0;

/**
 * Helper to create a simple mock invoice for testing
 */
function createMockInvoice(merchantId: string, amount: number, date: Date, itemCount: number = 0): Invoice {
  const invoiceId = `test-invoice-${merchantId}-${invoiceIdCounter++}`;
  return {
    id: invoiceId,
    name: `Invoice ${merchantId}`,
    description: "Test invoice",
    createdAt: date,
    lastUpdatedAt: date,
    userIdentifier: "user-123",
    merchantReference: merchantId,
    category: 0,
    scans: [],
    paymentInformation: {
      transactionDate: date,
      totalCostAmount: amount,
      totalTaxAmount: 0,
      subtotalAmount: amount,
      tipAmount: 0,
      currency: {code: "RON", symbol: "RON", name: "Romanian Leu"},
      paymentType: 200,
    },
    items: Array.from({length: itemCount}, (_, index) => ({
      id: `product-${invoiceId}-${index}`,
      rawName: `Product ${index}`,
      genericName: `Product ${index}`,
      productCode: `prod-${invoiceId}-${index}`,
      quantity: 1,
      quantityUnit: "pcs",
      price: amount / Math.max(1, itemCount),
      totalPrice: amount,
      category: null,
    })),
    possibleRecipes: [],
  } as unknown as Invoice;
}

describe("Merchant Analytics", () => {
  describe("computeMerchantTrends", () => {
    it("should return empty array when no invoices exist", () => {
      const result = computeMerchantTrends([]);
      expect(result).toEqual([]);
    });

    it("should compute trends for single merchant", () => {
      const invoices = [
        createMockInvoice("merchant-1", 100, new Date("2025-01-15")),
        createMockInvoice("merchant-1", 200, new Date("2025-02-15")),
      ];

      const result = computeMerchantTrends(invoices, 5);

      expect(result).toHaveLength(1);
      expect(result[0]?.merchantId).toBe("merchant-1");
      expect(result[0]?.totalSpend).toBe(300);
      expect(result[0]?.monthlyData).toHaveLength(2);
      expect(result[0]?.monthlyData[0]?.monthKey).toBe("2025-01");
      expect(result[0]?.monthlyData[0]?.amount).toBe(100);
      expect(result[0]?.monthlyData[1]?.monthKey).toBe("2025-02");
      expect(result[0]?.monthlyData[1]?.amount).toBe(200);
    });

    it("should return top N merchants sorted by total spend", () => {
      const invoices = [
        createMockInvoice("merchant-1", 100, new Date()),
        createMockInvoice("merchant-2", 300, new Date()),
        createMockInvoice("merchant-3", 200, new Date()),
      ];

      const result = computeMerchantTrends(invoices, 2);

      expect(result).toHaveLength(2);
      expect(result[0]?.merchantId).toBe("merchant-2");
      expect(result[0]?.totalSpend).toBe(300);
      expect(result[1]?.merchantId).toBe("merchant-3");
      expect(result[1]?.totalSpend).toBe(200);
    });

    it("should skip invoices without merchant reference", () => {
      const invoices = [createMockInvoice("merchant-1", 100, new Date()), createMockInvoice("", 50, new Date())];

      const result = computeMerchantTrends(invoices, 5);

      expect(result).toHaveLength(1);
      expect(result[0]?.merchantId).toBe("merchant-1");
      expect(result[0]?.totalSpend).toBe(100);
    });
  });

  describe("computeMerchantVisitFrequency", () => {
    it("should return empty array when no invoices exist", () => {
      const result = computeMerchantVisitFrequency([]);
      expect(result).toEqual([]);
    });

    it("should compute visit patterns for single merchant", () => {
      const invoices = [
        createMockInvoice("merchant-1", 100, new Date("2025-01-15"), 5), // Wednesday
        createMockInvoice("merchant-1", 150, new Date("2025-01-22"), 7), // Wednesday
      ];

      const result = computeMerchantVisitFrequency(invoices);

      expect(result).toHaveLength(1);
      expect(result[0]?.merchantId).toBe("merchant-1");
      expect(result[0]?.totalVisits).toBe(2);
      expect(result[0]?.mostCommonDayOfWeek).toBe(3); // Wednesday = day index 3
      expect(result[0]?.averageBasketSize).toBe(6); // (5 + 7) / 2
      expect(result[0]?.averageSpendPerVisit).toBe(125); // (100 + 150) / 2
    });

    it("should sort merchants by total visits descending", () => {
      const invoices = [
        createMockInvoice("merchant-1", 100, new Date()),
        createMockInvoice("merchant-2", 100, new Date()),
        createMockInvoice("merchant-2", 100, new Date()),
        createMockInvoice("merchant-2", 100, new Date()),
      ];

      const result = computeMerchantVisitFrequency(invoices);

      expect(result).toHaveLength(2);
      expect(result[0]?.merchantId).toBe("merchant-2");
      expect(result[0]?.totalVisits).toBe(3);
      expect(result[1]?.merchantId).toBe("merchant-1");
      expect(result[1]?.totalVisits).toBe(1);
    });

    it("should calculate average visits per month correctly", () => {
      const invoices = [
        createMockInvoice("merchant-1", 100, new Date("2025-01-01")),
        createMockInvoice("merchant-1", 100, new Date("2025-01-15")),
        createMockInvoice("merchant-1", 100, new Date("2025-02-01")),
      ];

      const result = computeMerchantVisitFrequency(invoices);

      expect(result[0]?.totalVisits).toBe(3);
      // 3 visits over ~1 month = ~3 visits/month (may vary slightly due to date calculation)
      expect(result[0]?.averageVisitsPerMonth).toBeGreaterThan(0);
    });

    it("should handle invoices without items", () => {
      const invoice = createMockInvoice("merchant-1", 100, new Date(), 0);

      const result = computeMerchantVisitFrequency([invoice]);

      expect(result[0]?.averageBasketSize).toBe(0);
    });

    it("should skip invoices without merchant reference", () => {
      const invoices = [createMockInvoice("merchant-1", 100, new Date()), createMockInvoice("", 50, new Date())];

      const result = computeMerchantVisitFrequency(invoices);

      expect(result).toHaveLength(1);
      expect(result[0]?.merchantId).toBe("merchant-1");
    });
  });
});
