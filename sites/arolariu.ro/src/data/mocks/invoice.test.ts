/**
 * @fileoverview Unit tests for Invoice mock builder
 * @module data/mocks/invoice.test
 */

import {InvoiceCategory, InvoiceScanType, RecipeComplexity} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {InvoiceBuilder, createInvoiceBuilder, generateRandomInvoice, generateRandomInvoices, mockInvoice, mockInvoiceList} from "./invoice";

describe("InvoiceBuilder", () => {
  describe("Constructor", () => {
    it("should create an invoice with default values", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.build();

      expect(invoice).toHaveProperty("id");
      expect(invoice).toHaveProperty("name");
      expect(invoice).toHaveProperty("description");
      expect(invoice).toHaveProperty("createdAt");
      expect(invoice).toHaveProperty("lastUpdatedAt");
      expect(invoice).toHaveProperty("userIdentifier");
      expect(invoice).toHaveProperty("category");
      expect(invoice).toHaveProperty("scans");
      expect(invoice.isSoftDeleted).toBe(false);
      expect(invoice.sharedWith).toEqual([]);
      expect(invoice.items).toEqual([]);
    });
  });

  describe("Builder Methods", () => {
    it("should set id", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withId("custom-id").build();
      expect(invoice.id).toBe("custom-id");
    });

    it("should set name", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withName("Custom Invoice").build();
      expect(invoice.name).toBe("Custom Invoice");
    });

    it("should set description", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withDescription("Custom Description").build();
      expect(invoice.description).toBe("Custom Description");
    });

    it("should set createdAt", () => {
      const builder = new InvoiceBuilder();
      const date = new Date("2025-01-01");
      const invoice = builder.withCreatedAt(date).build();
      expect(invoice.createdAt).toEqual(date);
    });

    it("should set lastUpdatedAt", () => {
      const builder = new InvoiceBuilder();
      const date = new Date("2025-01-02");
      const invoice = builder.withLastUpdatedAt(date).build();
      expect(invoice.lastUpdatedAt).toEqual(date);
    });

    it("should set userIdentifier", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withUserIdentifier("user-456").build();
      expect(invoice.userIdentifier).toBe("user-456");
    });

    it("should set sharedWith", () => {
      const builder = new InvoiceBuilder();
      const userIds = ["user-1", "user-2"];
      const invoice = builder.withSharedWith(userIds).build();
      expect(invoice.sharedWith).toEqual(userIds);
    });

    it("should set category", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withCategory(InvoiceCategory.FAST_FOOD).build();
      expect(invoice.category).toBe(InvoiceCategory.FAST_FOOD);
    });

    it("should set scans", () => {
      const builder = new InvoiceBuilder();
      const scans = [
        {
          scanType: InvoiceScanType.JPEG,
          location: "https://example.com/photo.jpg",
          metadata: {},
        },
      ];
      const invoice = builder.withScans(scans).build();
      expect(invoice.scans).toEqual(scans);
    });

    it("should set merchantReference", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withMerchantReference("merchant-123").build();
      expect(invoice.merchantReference).toBe("merchant-123");
    });

    it("should set items", () => {
      const builder = new InvoiceBuilder();
      const items = [
        {
          rawName: "Test Product",
          genericName: "Test Product",
          productCode: "ABC123",
          category: 0,
          price: 10,
          quantity: 2,
          quantityUnit: "pcs",
          totalPrice: 20,
          detectedAllergens: [],
          metadata: {isComplete: true, isEdited: false, isSoftDeleted: false},
        },
      ];
      const invoice = builder.withItems(items).build();
      expect(invoice.items).toEqual(items);
    });

    it("should set paymentInformation", () => {
      const builder = new InvoiceBuilder();
      const paymentInfo = {
        transactionDate: new Date(),
        paymentType: 0 as const,
        currency: {code: "USD", name: "US Dollar", symbol: "$"},
        totalCostAmount: 100,
        totalTaxAmount: 10,
      };
      const invoice = builder.withPaymentInformation(paymentInfo).build();
      expect(invoice.paymentInformation).toEqual(paymentInfo);
    });

    it("should have default paymentInformation", () => {
      const invoice = new InvoiceBuilder().build();
      expect(invoice.paymentInformation).toBeDefined();
    });

    it("should set possibleRecipes", () => {
      const builder = new InvoiceBuilder();
      const recipes = [
        {
          name: "Test Recipe",
          complexity: RecipeComplexity.Easy,
          ingredients: [],
          duration: 30,
          description: "A test recipe",
          referenceForMoreDetails: "https://example.com",
          cookingTime: 20,
          preparationTime: 10,
          instructions: "Test instructions",
        },
      ];
      const invoice = builder.withPossibleRecipes(recipes).build();
      expect(invoice.possibleRecipes).toEqual(recipes);
    });

    it("should set additionalMetadata", () => {
      const builder = new InvoiceBuilder();
      const metadata = {key1: "value1", key2: "value2"};
      const invoice = builder.withAdditionalMetadata(metadata).build();
      expect(invoice.additionalMetadata).toEqual(metadata);
    });

    it("should generate random items with default count", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withRandomItems().build();
      expect(invoice.items.length).toBeGreaterThanOrEqual(3);
      expect(invoice.items.length).toBeLessThanOrEqual(10);
    });

    it("should generate random items with specific count", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withRandomItems(5).build();
      expect(invoice.items).toHaveLength(5);
    });

    it("should generate random recipes with default count", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withRandomRecipes().build();
      expect(invoice.possibleRecipes.length).toBeGreaterThanOrEqual(0);
      expect(invoice.possibleRecipes.length).toBeLessThanOrEqual(3);
    });

    it("should generate random recipes with specific count", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withRandomRecipes(2).build();
      expect(invoice.possibleRecipes).toHaveLength(2);
    });

    it("should generate random scans with default count", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withRandomScans().build();
      expect(invoice.scans.length).toBeGreaterThanOrEqual(1);
      expect(invoice.scans.length).toBeLessThanOrEqual(3);
    });

    it("should generate random scans with specific count", () => {
      const builder = new InvoiceBuilder();
      const invoice = builder.withRandomScans(2).build();
      expect(invoice.scans).toHaveLength(2);
      for (const scan of invoice.scans) {
        expect(scan).toHaveProperty("scanType");
        expect(scan).toHaveProperty("location");
        expect(scan).toHaveProperty("metadata");
      }
    });
  });

  describe("buildMany", () => {
    it("should build multiple invoices with the same configuration", () => {
      const builder = new InvoiceBuilder().withCategory(InvoiceCategory.GROCERY).withUserIdentifier("user-123");

      const invoices = builder.buildMany(3);

      expect(invoices).toHaveLength(3);
      invoices.forEach((invoice) => {
        expect(invoice.category).toBe(InvoiceCategory.GROCERY);
        expect(invoice.userIdentifier).toBe("user-123");
      });
    });

    it("should create unique instances", () => {
      const builder = new InvoiceBuilder();
      const invoices = builder.buildMany(2);

      expect(invoices[0]).not.toBe(invoices[1]);
      // Modify one should not affect the other
      if (invoices[0] && invoices[1]) {
        invoices[0].name = "Modified";
        expect(invoices[1].name).not.toBe("Modified");
      }
    });
  });

  describe("Chaining", () => {
    it("should support method chaining", () => {
      const invoice = new InvoiceBuilder()
        .withId("chain-id")
        .withName("Chain Invoice")
        .withDescription("Chain Description")
        .withCategory(InvoiceCategory.HOME_CLEANING)
        .withUserIdentifier("chain-user")
        .withMerchantReference("chain-merchant")
        .withSharedWith(["user-1", "user-2"])
        .withRandomItems(3)
        .withRandomRecipes(1)
        .build();

      expect(invoice.id).toBe("chain-id");
      expect(invoice.name).toBe("Chain Invoice");
      expect(invoice.description).toBe("Chain Description");
      expect(invoice.category).toBe(InvoiceCategory.HOME_CLEANING);
      expect(invoice.userIdentifier).toBe("chain-user");
      expect(invoice.merchantReference).toBe("chain-merchant");
      expect(invoice.sharedWith).toEqual(["user-1", "user-2"]);
      expect(invoice.items).toHaveLength(3);
      expect(invoice.possibleRecipes).toHaveLength(1);
    });
  });

  describe("Factory Functions", () => {
    it("should create InvoiceBuilder using factory function", () => {
      const builder = createInvoiceBuilder();
      expect(builder).toBeInstanceOf(InvoiceBuilder);
    });

    it("should generate a random invoice", () => {
      const invoice = generateRandomInvoice();
      expect(invoice).toHaveProperty("id");
      expect(invoice.items.length).toBeGreaterThan(0);
      expect(invoice.possibleRecipes).toBeDefined();
    });

    it("should generate multiple random invoices", () => {
      const invoices = generateRandomInvoices(5);
      expect(invoices).toHaveLength(5);
      invoices.forEach((invoice) => {
        expect(invoice).toHaveProperty("id");
        expect(invoice.items.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Mock Instances", () => {
    it("should have pre-configured mockInvoice", () => {
      expect(mockInvoice.id).toBe("invoice-1");
      expect(mockInvoice.name).toBe("Test Invoice");
      expect(mockInvoice.category).toBe(InvoiceCategory.GROCERY);
      expect(mockInvoice.userIdentifier).toBe("user-123");
    });

    it("should have pre-configured mockInvoiceList", () => {
      expect(mockInvoiceList).toHaveLength(5);
      mockInvoiceList.forEach((invoice) => {
        expect(invoice).toHaveProperty("id");
        expect(invoice).toHaveProperty("name");
      });
    });
  });

  describe("Build Immutability", () => {
    it("should return a new object on build", () => {
      const builder = new InvoiceBuilder();
      const invoice1 = builder.build();
      const invoice2 = builder.build();

      expect(invoice1).not.toBe(invoice2);
      invoice1.name = "Modified";
      expect(invoice2.name).not.toBe("Modified");
    });
  });
});
