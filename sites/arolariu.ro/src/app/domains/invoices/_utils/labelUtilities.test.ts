/**
 * @fileoverview Unit tests for invoice domain label utilities.
 * @module app/domains/invoices/_utils/labelUtilities/tests
 */

import {InvoiceCategory, PaymentType, ProductCategory} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {getInvoiceCategoryLabel, getPaymentTypeLabel, getProductCategoryLabel} from "./labelUtilities";

describe("invoice label utilities", () => {
  describe("getProductCategoryLabel", () => {
    it("returns product category labels", () => {
      expect(getProductCategoryLabel(ProductCategory.NOT_DEFINED)).toBe("Uncategorized");
      expect(getProductCategoryLabel(ProductCategory.BAKED_GOODS)).toBe("Baked Goods");
      expect(getProductCategoryLabel(ProductCategory.GROCERIES)).toBe("Groceries");
      expect(getProductCategoryLabel(ProductCategory.DAIRY)).toBe("Dairy");
      expect(getProductCategoryLabel(ProductCategory.MEAT)).toBe("Meat");
      expect(getProductCategoryLabel(ProductCategory.FISH)).toBe("Fish");
      expect(getProductCategoryLabel(ProductCategory.FRUITS)).toBe("Fruits");
      expect(getProductCategoryLabel(ProductCategory.VEGETABLES)).toBe("Vegetables");
      expect(getProductCategoryLabel(ProductCategory.BEVERAGES)).toBe("Beverages");
      expect(getProductCategoryLabel(ProductCategory.ALCOHOLIC_BEVERAGES)).toBe("Alcoholic Beverages");
      expect(getProductCategoryLabel(ProductCategory.TOBACCO)).toBe("Tobacco");
      expect(getProductCategoryLabel(ProductCategory.CLEANING_SUPPLIES)).toBe("Cleaning Supplies");
      expect(getProductCategoryLabel(ProductCategory.PERSONAL_CARE)).toBe("Personal Care");
      expect(getProductCategoryLabel(ProductCategory.MEDICINE)).toBe("Medicine");
      expect(getProductCategoryLabel(ProductCategory.OTHER)).toBe("Other");
    });

    it("supports context-specific product fallback labels", () => {
      expect(getProductCategoryLabel(ProductCategory.NOT_DEFINED, {notDefinedLabel: "Not Defined"})).toBe("Not Defined");
      expect(getProductCategoryLabel(42, {unknownLabel: "Not Defined"})).toBe("Not Defined");
    });

    it("returns Unknown for unsupported product categories by default", () => {
      expect(getProductCategoryLabel(42)).toBe("Unknown");
    });
  });

  describe("getInvoiceCategoryLabel", () => {
    it("returns invoice category labels", () => {
      expect(getInvoiceCategoryLabel(InvoiceCategory.NOT_DEFINED)).toBe("Not Defined");
      expect(getInvoiceCategoryLabel(InvoiceCategory.GROCERY)).toBe("Grocery");
      expect(getInvoiceCategoryLabel(InvoiceCategory.FAST_FOOD)).toBe("Fast Food");
      expect(getInvoiceCategoryLabel(InvoiceCategory.HOME_CLEANING)).toBe("Home Cleaning");
      expect(getInvoiceCategoryLabel(InvoiceCategory.CAR_AUTO)).toBe("Car & Auto");
      expect(getInvoiceCategoryLabel(InvoiceCategory.OTHER)).toBe("Other");
    });

    it("supports context-specific invoice fallback labels", () => {
      expect(getInvoiceCategoryLabel(InvoiceCategory.NOT_DEFINED, {notDefinedLabel: "Uncategorized"})).toBe("Uncategorized");
      expect(getInvoiceCategoryLabel(42, {unknownLabel: "Unknown"})).toBe("Unknown");
    });

    it("supports context-specific invoice label overrides", () => {
      expect(getInvoiceCategoryLabel(InvoiceCategory.FAST_FOOD, {labels: {[InvoiceCategory.FAST_FOOD]: "Dining"}})).toBe("Dining");
    });
  });

  describe("getPaymentTypeLabel", () => {
    it("returns payment type labels", () => {
      expect(getPaymentTypeLabel(PaymentType.Unknown)).toBe("Unknown");
      expect(getPaymentTypeLabel(PaymentType.Cash)).toBe("Cash");
      expect(getPaymentTypeLabel(PaymentType.Card)).toBe("Card");
      expect(getPaymentTypeLabel(PaymentType.Transfer)).toBe("Transfer");
      expect(getPaymentTypeLabel(PaymentType.MobilePayment)).toBe("Mobile Payment");
      expect(getPaymentTypeLabel(PaymentType.Voucher)).toBe("Voucher");
      expect(getPaymentTypeLabel(PaymentType.Other)).toBe("Other");
    });

    it("returns Unknown for unsupported payment types", () => {
      expect(getPaymentTypeLabel(42)).toBe("Unknown");
    });
  });
});
