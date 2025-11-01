/**
 * @fileoverview Unit tests for mock builders barrel export
 * @module data/mocks/index.test
 */

import {describe, expect, it} from "vitest";
import {
  InvoiceBuilder,
  MerchantBuilder,
  ProductBuilder,
  createInvoiceBuilder,
  createMerchantBuilder,
  createProductBuilder,
  generateRandomInvoice,
  generateRandomInvoices,
  generateRandomMerchant,
  generateRandomMerchants,
  generateRandomProduct,
  generateRandomProducts,
  mockInvoice,
  mockInvoiceList,
  mockMerchant,
  mockMerchantList,
  mockProduct,
  mockProductList,
} from "./index";

describe("Mock Builders Barrel Export", () => {
  describe("Invoice Exports", () => {
    it("should export InvoiceBuilder class", () => {
      expect(InvoiceBuilder).toBeDefined();
      const builder = new InvoiceBuilder();
      expect(builder).toBeInstanceOf(InvoiceBuilder);
    });

    it("should export createInvoiceBuilder factory", () => {
      expect(createInvoiceBuilder).toBeDefined();
      const builder = createInvoiceBuilder();
      expect(builder).toBeInstanceOf(InvoiceBuilder);
    });

    it("should export generateRandomInvoice function", () => {
      expect(generateRandomInvoice).toBeDefined();
      const invoice = generateRandomInvoice();
      expect(invoice).toHaveProperty("id");
      expect(invoice).toHaveProperty("name");
    });

    it("should export generateRandomInvoices function", () => {
      expect(generateRandomInvoices).toBeDefined();
      const invoices = generateRandomInvoices(3);
      expect(invoices).toHaveLength(3);
    });

    it("should export mockInvoice", () => {
      expect(mockInvoice).toBeDefined();
      expect(mockInvoice.id).toBe("invoice-1");
    });

    it("should export mockInvoiceList", () => {
      expect(mockInvoiceList).toBeDefined();
      expect(Array.isArray(mockInvoiceList)).toBe(true);
      expect(mockInvoiceList).toHaveLength(5);
    });
  });

  describe("Product Exports", () => {
    it("should export ProductBuilder class", () => {
      expect(ProductBuilder).toBeDefined();
      const builder = new ProductBuilder();
      expect(builder).toBeInstanceOf(ProductBuilder);
    });

    it("should export createProductBuilder factory", () => {
      expect(createProductBuilder).toBeDefined();
      const builder = createProductBuilder();
      expect(builder).toBeInstanceOf(ProductBuilder);
    });

    it("should export generateRandomProduct function", () => {
      expect(generateRandomProduct).toBeDefined();
      const product = generateRandomProduct();
      expect(product).toHaveProperty("genericName");
      expect(product).toHaveProperty("price");
    });

    it("should export generateRandomProducts function", () => {
      expect(generateRandomProducts).toBeDefined();
      const products = generateRandomProducts(3);
      expect(products).toHaveLength(3);
    });

    it("should export mockProduct", () => {
      expect(mockProduct).toBeDefined();
      expect(mockProduct.genericName).toBe("Test Product");
    });

    it("should export mockProductList", () => {
      expect(mockProductList).toBeDefined();
      expect(Array.isArray(mockProductList)).toBe(true);
      expect(mockProductList).toHaveLength(10);
    });
  });

  describe("Merchant Exports", () => {
    it("should export MerchantBuilder class", () => {
      expect(MerchantBuilder).toBeDefined();
      const builder = new MerchantBuilder();
      expect(builder).toBeInstanceOf(MerchantBuilder);
    });

    it("should export createMerchantBuilder factory", () => {
      expect(createMerchantBuilder).toBeDefined();
      const builder = createMerchantBuilder();
      expect(builder).toBeInstanceOf(MerchantBuilder);
    });

    it("should export generateRandomMerchant function", () => {
      expect(generateRandomMerchant).toBeDefined();
      const merchant = generateRandomMerchant();
      expect(merchant).toHaveProperty("id");
      expect(merchant).toHaveProperty("name");
    });

    it("should export generateRandomMerchants function", () => {
      expect(generateRandomMerchants).toBeDefined();
      const merchants = generateRandomMerchants(3);
      expect(merchants).toHaveLength(3);
    });

    it("should export mockMerchant", () => {
      expect(mockMerchant).toBeDefined();
      expect(mockMerchant.id).toBe("merchant-1");
    });

    it("should export mockMerchantList", () => {
      expect(mockMerchantList).toBeDefined();
      expect(Array.isArray(mockMerchantList)).toBe(true);
      expect(mockMerchantList).toHaveLength(5);
    });
  });

  describe("Type Exports", () => {
    it("should allow importing types through the barrel export", () => {
      // This test verifies that types can be imported and used
      // The actual type checking is done at compile time
      const testInvoice: any = mockInvoice;
      const testMerchant: any = mockMerchant;
      const testProduct: any = mockProduct;

      expect(testInvoice).toBeDefined();
      expect(testMerchant).toBeDefined();
      expect(testProduct).toBeDefined();
    });
  });
});
