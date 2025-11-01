/**
 * @fileoverview Unit tests for Product mock builder
 * @module data/mocks/product.test
 */

import {ProductCategory, type Allergen} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {ProductBuilder, createProductBuilder, generateRandomProduct, generateRandomProducts, mockProduct, mockProductList} from "./product";

describe("ProductBuilder", () => {
  describe("Constructor", () => {
    it("should create a product with default values", () => {
      const builder = new ProductBuilder();
      const product = builder.build();

      expect(product).toHaveProperty("rawName");
      expect(product).toHaveProperty("genericName");
      expect(product).toHaveProperty("productCode");
      expect(product).toHaveProperty("category");
      expect(product).toHaveProperty("price");
      expect(product).toHaveProperty("quantity");
      expect(product).toHaveProperty("quantityUnit");
      expect(product).toHaveProperty("totalPrice");
      expect(product).toHaveProperty("detectedAllergens");
      expect(product).toHaveProperty("metadata");
      expect(product.detectedAllergens).toEqual([]);
      expect(product.metadata.isComplete).toBe(false);
      expect(product.metadata.isEdited).toBe(false);
      expect(product.metadata.isSoftDeleted).toBe(false);
    });
  });

  describe("Builder Methods", () => {
    it("should set rawName", () => {
      const builder = new ProductBuilder();
      const product = builder.withRawName("Raw Product Name").build();
      expect(product.rawName).toBe("Raw Product Name");
    });

    it("should set genericName", () => {
      const builder = new ProductBuilder();
      const product = builder.withGenericName("Generic Product").build();
      expect(product.genericName).toBe("Generic Product");
    });

    it("should set productCode", () => {
      const builder = new ProductBuilder();
      const product = builder.withProductCode("PROD123").build();
      expect(product.productCode).toBe("PROD123");
    });

    it("should set category", () => {
      const builder = new ProductBuilder();
      const product = builder.withCategory(ProductCategory.DAIRY).build();
      expect(product.category).toBe(ProductCategory.DAIRY);
    });

    it("should set price", () => {
      const builder = new ProductBuilder();
      const product = builder.withPrice(19.99).build();
      expect(product.price).toBe(19.99);
    });

    it("should set quantity", () => {
      const builder = new ProductBuilder();
      const product = builder.withQuantity(5).build();
      expect(product.quantity).toBe(5);
    });

    it("should set quantityUnit", () => {
      const builder = new ProductBuilder();
      const product = builder.withQuantityUnit("kg").build();
      expect(product.quantityUnit).toBe("kg");
    });

    it("should set totalPrice", () => {
      const builder = new ProductBuilder();
      const product = builder.withTotalPrice(99.95).build();
      expect(product.totalPrice).toBe(99.95);
    });

    it("should set detectedAllergens", () => {
      const builder = new ProductBuilder();
      const allergens: Allergen[] = [
        {name: "milk", description: "Dairy allergen", learnMoreAddress: "https://example.com/milk"},
        {name: "eggs", description: "Egg allergen", learnMoreAddress: "https://example.com/eggs"},
        {name: "nuts", description: "Nut allergen", learnMoreAddress: "https://example.com/nuts"},
      ];
      const product = builder.withDetectedAllergens(allergens).build();
      expect(product.detectedAllergens).toEqual(allergens);
    });

    it("should set metadata", () => {
      const builder = new ProductBuilder();
      const metadata = {isComplete: true, isEdited: true, isSoftDeleted: false};
      const product = builder.withMetadata(metadata).build();
      expect(product.metadata).toEqual(metadata);
    });

    it("should set partial metadata", () => {
      const builder = new ProductBuilder();
      const metadata = {isComplete: true};
      const product = builder.withMetadata(metadata).build();
      expect(product.metadata.isComplete).toBe(true);
      expect(product.metadata.isEdited).toBe(false);
      expect(product.metadata.isSoftDeleted).toBe(false);
    });

    it("should calculate total price from price and quantity", () => {
      const builder = new ProductBuilder();
      const product = builder.withPrice(10.5).withQuantity(3).build();
      // When totalPrice is not explicitly set, it should be calculated
      expect(product.totalPrice).toBeCloseTo(31.5);
    });
  });

  describe("buildMany", () => {
    it("should build multiple products with the same configuration", () => {
      const builder = new ProductBuilder().withCategory(ProductCategory.BEVERAGES).withQuantityUnit("ml");

      const products = builder.buildMany(3);

      expect(products).toHaveLength(3);
      products.forEach((product) => {
        expect(product.category).toBe(ProductCategory.BEVERAGES);
        expect(product.quantityUnit).toBe("ml");
      });
    });

    it("should create unique instances", () => {
      const builder = new ProductBuilder();
      const products = builder.buildMany(2);

      expect(products[0]).not.toBe(products[1]);
      // Modify one should not affect the other
      if (products[0] && products[1]) {
        products[0].genericName = "Modified";
        expect(products[1].genericName).not.toBe("Modified");
      }
    });

    it("should build zero products when count is 0", () => {
      const builder = new ProductBuilder();
      const products = builder.buildMany(0);
      expect(products).toHaveLength(0);
    });

    it("should build many products efficiently", () => {
      const builder = new ProductBuilder();
      const products = builder.buildMany(100);
      expect(products).toHaveLength(100);

      // Verify each product has unique data
      const codes = new Set(products.map((p) => p.productCode));
      expect(codes.size).toBe(100);
    });
  });

  describe("Chaining", () => {
    it("should support method chaining", () => {
      const product = new ProductBuilder()
        .withRawName("Chain Raw Name")
        .withGenericName("Chain Generic Name")
        .withProductCode("CHAIN123")
        .withCategory(ProductCategory.FRUITS)
        .withPrice(15.99)
        .withQuantity(2)
        .withQuantityUnit("pcs")
        .withTotalPrice(31.98)
        .withDetectedAllergens([{name: "gluten", description: "Gluten allergen", learnMoreAddress: "https://example.com/gluten"}])
        .withMetadata({isComplete: true, isEdited: false, isSoftDeleted: false})
        .build();

      expect(product.rawName).toBe("Chain Raw Name");
      expect(product.genericName).toBe("Chain Generic Name");
      expect(product.productCode).toBe("CHAIN123");
      expect(product.category).toBe(ProductCategory.FRUITS);
      expect(product.price).toBe(15.99);
      expect(product.quantity).toBe(2);
      expect(product.quantityUnit).toBe("pcs");
      expect(product.totalPrice).toBe(31.98);
      expect(product.detectedAllergens).toEqual([
        {name: "gluten", description: "Gluten allergen", learnMoreAddress: "https://example.com/gluten"},
      ]);
      expect(product.metadata.isComplete).toBe(true);
    });
  });

  describe("Factory Functions", () => {
    it("should create ProductBuilder using factory function", () => {
      const builder = createProductBuilder();
      expect(builder).toBeInstanceOf(ProductBuilder);
    });

    it("should generate a random product", () => {
      const product = generateRandomProduct();
      expect(product).toHaveProperty("rawName");
      expect(product).toHaveProperty("genericName");
      expect(product).toHaveProperty("productCode");
      expect(product.price).toBeGreaterThan(0);
      expect(product.quantity).toBeGreaterThan(0);
    });

    it("should generate multiple random products", () => {
      const products = generateRandomProducts(5);
      expect(products).toHaveLength(5);
      products.forEach((product) => {
        expect(product).toHaveProperty("rawName");
        expect(product).toHaveProperty("genericName");
        expect(product).toHaveProperty("productCode");
      });
    });

    it("should generate unique random products", () => {
      const products = generateRandomProducts(10);
      const codes = new Set(products.map((p) => p.productCode));
      expect(codes.size).toBe(10);
    });
  });

  describe("Mock Instances", () => {
    it("should have pre-configured mockProduct", () => {
      expect(mockProduct.genericName).toBe("Test Product");
      expect(mockProduct.price).toBe(9.99);
      expect(mockProduct.quantity).toBe(2);
      expect(mockProduct.totalPrice).toBeCloseTo(19.98);
    });

    it("should have pre-configured mockProductList", () => {
      expect(mockProductList).toHaveLength(10);
      mockProductList.forEach((product) => {
        expect(product).toHaveProperty("rawName");
        expect(product).toHaveProperty("genericName");
        expect(product).toHaveProperty("productCode");
      });
    });

    it("should have unique products in mockProductList", () => {
      const codes = new Set(mockProductList.map((p) => p.productCode));
      expect(codes.size).toBe(mockProductList.length);
    });
  });

  describe("Build Immutability", () => {
    it("should return a new object on build", () => {
      const builder = new ProductBuilder();
      const product1 = builder.build();
      const product2 = builder.build();

      expect(product1).not.toBe(product2);
      product1.genericName = "Modified";
      expect(product2.genericName).not.toBe("Modified");
    });

    it("should not mutate builder state", () => {
      const builder = new ProductBuilder().withGenericName("Original");
      const product1 = builder.build();
      product1.genericName = "Modified";

      const product2 = builder.build();
      expect(product2.genericName).toBe("Original");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty strings", () => {
      const product = new ProductBuilder().withRawName("").withGenericName("").withProductCode("").withQuantityUnit("").build();

      expect(product.rawName).toBe("");
      expect(product.genericName).toBe("");
      expect(product.productCode).toBe("");
      expect(product.quantityUnit).toBe("");
    });

    it("should handle zero values", () => {
      const product = new ProductBuilder().withPrice(0).withQuantity(0).withTotalPrice(0).build();

      expect(product.price).toBe(0);
      expect(product.quantity).toBe(0);
      expect(product.totalPrice).toBe(0);
    });

    it("should handle negative values", () => {
      const product = new ProductBuilder().withPrice(-10).withQuantity(-5).withTotalPrice(-50).build();

      expect(product.price).toBe(-10);
      expect(product.quantity).toBe(-5);
      expect(product.totalPrice).toBe(-50);
    });

    it("should handle very large numbers", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const product = new ProductBuilder().withPrice(largeNumber).withQuantity(1).withTotalPrice(largeNumber).build();

      expect(product.price).toBe(largeNumber);
      expect(product.totalPrice).toBe(largeNumber);
    });

    it("should handle empty allergens array", () => {
      const product = new ProductBuilder().withDetectedAllergens([]).build();

      expect(product.detectedAllergens).toEqual([]);
    });

    it("should handle many allergens", () => {
      const allergens: Allergen[] = [
        {name: "milk", description: "Dairy allergen", learnMoreAddress: "https://example.com/milk"},
        {name: "eggs", description: "Egg allergen", learnMoreAddress: "https://example.com/eggs"},
        {name: "nuts", description: "Nut allergen", learnMoreAddress: "https://example.com/nuts"},
        {name: "gluten", description: "Gluten allergen", learnMoreAddress: "https://example.com/gluten"},
        {name: "soy", description: "Soy allergen", learnMoreAddress: "https://example.com/soy"},
        {name: "fish", description: "Fish allergen", learnMoreAddress: "https://example.com/fish"},
        {name: "shellfish", description: "Shellfish allergen", learnMoreAddress: "https://example.com/shellfish"},
      ];
      const product = new ProductBuilder().withDetectedAllergens(allergens).build();

      expect(product.detectedAllergens).toEqual(allergens);
      expect(product.detectedAllergens).toHaveLength(7);
    });
  });
});
