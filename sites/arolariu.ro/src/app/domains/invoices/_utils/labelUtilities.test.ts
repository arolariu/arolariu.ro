/**
 * @fileoverview Unit tests for invoice domain label utilities.
 * @module app/domains/invoices/_utils/labelUtilities/tests
 */

import {ClassificationOrigin, ClassificationSystem, InvoiceCategory, PaymentType, ProductCategory} from "@/types/invoices";
import type {ClassificationNode, StandardClassification} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {
  getClassificationGroup,
  getClassificationHierarchyPath,
  getClassificationLabel,
  getInvoiceCategoryLabel,
  getPaymentTypeLabel,
  getProductCategoryLabel,
} from "./labelUtilities";

// ---------------------------------------------------------------------------
// Classification fixtures
// ---------------------------------------------------------------------------

/** ECOICOP V2 — 3-level hierarchy ending with code matching classification code. */
const ecoicopDivision: ClassificationNode = {level: "division", code: "01", officialLabel: "Food and non-alcoholic beverages"};
const ecoicopGroup: ClassificationNode = {level: "group", code: "01.1", officialLabel: "Food"};
const ecoicopClass: ClassificationNode = {level: "class", code: "01.1.1", officialLabel: "Cereals and cereal products"};

const invoiceClassification: StandardClassification = {
  system: ClassificationSystem.EcoicopV2,
  version: "2",
  code: "01.1.1",
  officialLabel: "Cereals and cereal products",
  hierarchy: [ecoicopDivision, ecoicopGroup, ecoicopClass],
  origin: ClassificationOrigin.Analysis,
  confidence: 0.92,
  evidence: [],
};

/** GS1 GPC — 3-level hierarchy ending with code matching classification code. */
const gpcSegment: ClassificationNode = {level: "segment", code: "50000000", officialLabel: "Food/Beverage"};
const gpcFamily: ClassificationNode = {level: "family", code: "50200000", officialLabel: "Beverages"};
const gpcClass: ClassificationNode = {level: "class", code: "50202200", officialLabel: "Alcoholic Beverages"};

const productClassification: StandardClassification = {
  system: ClassificationSystem.Gs1Gpc,
  version: "2026-05",
  code: "50202200",
  officialLabel: "Alcoholic Beverages",
  hierarchy: [gpcSegment, gpcFamily, gpcClass],
  origin: ClassificationOrigin.Analysis,
  confidence: 0.85,
  evidence: [],
};

/** NACE Rev 2.1 — 3-level hierarchy ending with code matching classification code. */
const naceSection: ClassificationNode = {level: "section", code: "I", officialLabel: "ACCOMMODATION AND FOOD SERVICE ACTIVITIES"};
const naceDivision: ClassificationNode = {level: "division", code: "55", officialLabel: "Accommodation"};
const naceGroup: ClassificationNode = {level: "group", code: "55.1", officialLabel: "Hotels and similar accommodation"};

const merchantClassification: StandardClassification = {
  system: ClassificationSystem.Nace21,
  version: "2.1",
  code: "55.1",
  officialLabel: "Hotels and similar accommodation",
  hierarchy: [naceSection, naceDivision, naceGroup],
  origin: ClassificationOrigin.Manual,
  confidence: null,
  evidence: [],
};

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

describe("getClassificationGroup", () => {
  it("returns the ECOICOP division for an invoice classification", () => {
    expect(getClassificationGroup(invoiceClassification)).toBe("Food and non-alcoholic beverages");
  });

  it("returns the GPC segment for a product classification", () => {
    expect(getClassificationGroup(productClassification)).toBe("Food/Beverage");
  });

  it("returns the NACE section for a merchant classification", () => {
    expect(getClassificationGroup(merchantClassification)).toBe("ACCOMMODATION AND FOOD SERVICE ACTIVITIES");
  });

  it("returns null when the hierarchy is empty rather than guessing from the label", () => {
    const emptyHierarchy: StandardClassification = {
      system: ClassificationSystem.EcoicopV2,
      version: "2",
      code: "01.1.1",
      officialLabel: "Cereals and cereal products",
      hierarchy: [],
      origin: ClassificationOrigin.Analysis,
      confidence: 0.9,
      evidence: [],
    };
    expect(getClassificationGroup(emptyHierarchy)).toBeNull();
  });

  it("returns null for a null classification", () => {
    expect(getClassificationGroup(null)).toBeNull();
  });
});

describe("getClassificationLabel", () => {
  it("returns the official label when classified", () => {
    expect(getClassificationLabel(invoiceClassification, "Unclassified")).toBe("Cereals and cereal products");
  });

  it("returns the supplied fallback when unclassified", () => {
    expect(getClassificationLabel(null, "Unclassified")).toBe("Unclassified");
  });
});

describe("getClassificationHierarchyPath", () => {
  it("joins the hierarchy labels from root to leaf", () => {
    expect(getClassificationHierarchyPath(invoiceClassification)).toBe(
      "Food and non-alcoholic beverages > Food > Cereals and cereal products",
    );
  });

  it("returns an empty string for a null classification", () => {
    expect(getClassificationHierarchyPath(null)).toBe("");
  });
});
