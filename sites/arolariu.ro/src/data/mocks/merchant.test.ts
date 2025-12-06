/**
 * @fileoverview Unit tests for Merchant mock builder
 * @module data/mocks/merchant.test
 */

import {MerchantCategory} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {
  MerchantBuilder,
  createMerchantBuilder,
  generateRandomMerchant,
  generateRandomMerchants,
  mockMerchant,
  mockMerchantList,
} from "./merchant";

describe("MerchantBuilder", () => {
  describe("Constructor", () => {
    it("should create a merchant with default values", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.build();

      expect(merchant).toHaveProperty("id");
      expect(merchant).toHaveProperty("name");
      expect(merchant).toHaveProperty("description");
      expect(merchant).toHaveProperty("createdAt");
      expect(merchant).toHaveProperty("createdBy");
      expect(merchant).toHaveProperty("lastUpdatedAt");
      expect(merchant).toHaveProperty("lastUpdatedBy");
      expect(merchant).toHaveProperty("numberOfUpdates");
      expect(merchant).toHaveProperty("isImportant");
      expect(merchant).toHaveProperty("isSoftDeleted");
      expect(merchant).toHaveProperty("category");
      expect(merchant).toHaveProperty("address");
      expect(merchant).toHaveProperty("phoneNumber");
      expect(merchant).toHaveProperty("parentCompanyId");
    });
  });

  describe("Builder Methods", () => {
    it("should set id", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withId("custom-merchant-id").build();
      expect(merchant.id).toBe("custom-merchant-id");
    });

    it("should set name", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withName("Custom Merchant").build();
      expect(merchant.name).toBe("Custom Merchant");
    });

    it("should set address", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withAddress("123 Custom Street").build();
      expect(merchant.address.address).toBe("123 Custom Street");
    });

    it("should set category", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withCategory(MerchantCategory.LOCAL_SHOP).build();
      expect(merchant.category).toBe(MerchantCategory.LOCAL_SHOP);
    });

    it("should set phoneNumber", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withPhoneNumber("+40123456789").build();
      expect(merchant.address.phoneNumber).toBe("+40123456789");
    });

    it("should set parentCompanyId", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withParentCompanyId("parent-123").build();
      expect(merchant.parentCompanyId).toBe("parent-123");
    });

    it("should set isImportant", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withIsImportant(true).build();
      expect(merchant.isImportant).toBe(true);
    });

    it("should set isSoftDeleted", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withIsSoftDeleted(true).build();
      expect(merchant.isSoftDeleted).toBe(true);
    });

    it("should set description", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withDescription("A custom merchant description").build();
      expect(merchant.description).toBe("A custom merchant description");
    });

    it("should set createdBy", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withCreatedBy("user-456").build();
      expect(merchant.createdBy).toBe("user-456");
    });

    it("should set createdAt", () => {
      const builder = new MerchantBuilder();
      const date = new Date("2025-01-01");
      const merchant = builder.withCreatedAt(date).build();
      expect(merchant.createdAt).toEqual(date);
    });

    it("should set lastUpdatedBy", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withLastUpdatedBy("user-789").build();
      expect(merchant.lastUpdatedBy).toBe("user-789");
    });

    it("should set lastUpdatedAt", () => {
      const builder = new MerchantBuilder();
      const date = new Date("2025-01-15");
      const merchant = builder.withLastUpdatedAt(date).build();
      expect(merchant.lastUpdatedAt).toEqual(date);
    });

    it("should set numberOfUpdates", () => {
      const builder = new MerchantBuilder();
      const merchant = builder.withNumberOfUpdates(5).build();
      expect(merchant.numberOfUpdates).toBe(5);
    });
  });

  describe("buildMany", () => {
    it("should build multiple merchants with the same configuration", () => {
      const builder = new MerchantBuilder().withCategory(MerchantCategory.SUPERMARKET).withIsImportant(true);

      const merchants = builder.buildMany(3);

      expect(merchants).toHaveLength(3);
      merchants.forEach((merchant) => {
        expect(merchant.category).toBe(MerchantCategory.SUPERMARKET);
        expect(merchant.isImportant).toBe(true);
      });
    });

    it("should create unique instances", () => {
      const builder = new MerchantBuilder();
      const merchants = builder.buildMany(2);

      expect(merchants[0]).not.toBe(merchants[1]);
      // Modify one should not affect the other
      if (merchants[0] && merchants[1]) {
        merchants[0].name = "Modified";
        expect(merchants[1].name).not.toBe("Modified");
      }
    });

    it("should build zero merchants when count is 0", () => {
      const builder = new MerchantBuilder();
      const merchants = builder.buildMany(0);
      expect(merchants).toHaveLength(0);
    });

    it("should build many merchants efficiently", () => {
      const builder = new MerchantBuilder();
      const merchants = builder.buildMany(100);
      expect(merchants).toHaveLength(100);

      // Verify each merchant is unique
      const ids = new Set(merchants.map((m) => m.id));
      expect(ids.size).toBe(100);
    });
  });

  describe("Chaining", () => {
    it("should support method chaining", () => {
      const merchant = new MerchantBuilder()
        .withId("chain-id")
        .withName("Chain Merchant")
        .withDescription("Chain merchant description")
        .withAddress("Chain Address")
        .withCategory(MerchantCategory.ONLINE_SHOP)
        .withPhoneNumber("+40123456789")
        .withParentCompanyId("parent-chain-123")
        .withIsImportant(true)
        .withIsSoftDeleted(false)
        .withCreatedBy("chain-user")
        .withLastUpdatedBy("chain-updater")
        .withNumberOfUpdates(10)
        .build();

      expect(merchant.id).toBe("chain-id");
      expect(merchant.name).toBe("Chain Merchant");
      expect(merchant.description).toBe("Chain merchant description");
      expect(merchant.address.address).toBe("Chain Address");
      expect(merchant.category).toBe(MerchantCategory.ONLINE_SHOP);
      expect(merchant.address.phoneNumber).toBe("+40123456789");
      expect(merchant.parentCompanyId).toBe("parent-chain-123");
      expect(merchant.isImportant).toBe(true);
      expect(merchant.isSoftDeleted).toBe(false);
      expect(merchant.createdBy).toBe("chain-user");
      expect(merchant.lastUpdatedBy).toBe("chain-updater");
      expect(merchant.numberOfUpdates).toBe(10);
    });
  });

  describe("Factory Functions", () => {
    it("should create MerchantBuilder using factory function", () => {
      const builder = createMerchantBuilder();
      expect(builder).toBeInstanceOf(MerchantBuilder);
    });

    it("should generate a random merchant", () => {
      const merchant = generateRandomMerchant();
      expect(merchant).toHaveProperty("id");
      expect(merchant).toHaveProperty("name");
      expect(merchant).toHaveProperty("address");
      expect(merchant).toHaveProperty("category");
    });

    it("should generate multiple random merchants", () => {
      const merchants = generateRandomMerchants(5);
      expect(merchants).toHaveLength(5);
      merchants.forEach((merchant) => {
        expect(merchant).toHaveProperty("id");
        expect(merchant).toHaveProperty("name");
        expect(merchant).toHaveProperty("address");
      });
    });

    it("should generate unique random merchants", () => {
      const merchants = generateRandomMerchants(10);
      const ids = new Set(merchants.map((m) => m.id));
      expect(ids.size).toBe(10);
    });
  });

  describe("Mock Instances", () => {
    it("should have pre-configured mockMerchant", () => {
      expect(mockMerchant.id).toBe("merchant-1");
      expect(mockMerchant.name).toBe("Test Merchant");
      expect(mockMerchant.category).toBe(MerchantCategory.SUPERMARKET);
    });

    it("should have pre-configured mockMerchantList", () => {
      expect(mockMerchantList).toHaveLength(5);
      mockMerchantList.forEach((merchant) => {
        expect(merchant).toHaveProperty("id");
        expect(merchant).toHaveProperty("name");
        expect(merchant).toHaveProperty("address");
      });
    });

    it("should have unique merchants in mockMerchantList", () => {
      const ids = new Set(mockMerchantList.map((m) => m.id));
      expect(ids.size).toBe(mockMerchantList.length);
    });
  });

  describe("Build Immutability", () => {
    it("should return a new object on build", () => {
      const builder = new MerchantBuilder();
      const merchant1 = builder.build();
      const merchant2 = builder.build();

      expect(merchant1).not.toBe(merchant2);
      merchant1.name = "Modified";
      expect(merchant2.name).not.toBe("Modified");
    });

    it("should not mutate builder state", () => {
      const builder = new MerchantBuilder().withName("Original");
      const merchant1 = builder.build();
      merchant1.name = "Modified";

      const merchant2 = builder.build();
      expect(merchant2.name).toBe("Original");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty strings", () => {
      const merchant = new MerchantBuilder().withName("").withAddress("").withDescription("").build();

      expect(merchant.name).toBe("");
      expect(merchant.address.address).toBe("");
      expect(merchant.description).toBe("");
    });

    it("should handle empty phone number", () => {
      const merchant = new MerchantBuilder().withPhoneNumber("").build();

      expect(merchant.address.phoneNumber).toBe("");
    });

    it("should handle very old dates", () => {
      const oldDate = new Date("1900-01-01");
      const merchant = new MerchantBuilder().withCreatedAt(oldDate).withLastUpdatedAt(oldDate).build();

      expect(merchant.createdAt).toEqual(oldDate);
      expect(merchant.lastUpdatedAt).toEqual(oldDate);
    });

    it("should handle future dates", () => {
      const futureDate = new Date("2100-12-31");
      const merchant = new MerchantBuilder().withCreatedAt(futureDate).withLastUpdatedAt(futureDate).build();

      expect(merchant.createdAt).toEqual(futureDate);
      expect(merchant.lastUpdatedAt).toEqual(futureDate);
    });
  });
});
