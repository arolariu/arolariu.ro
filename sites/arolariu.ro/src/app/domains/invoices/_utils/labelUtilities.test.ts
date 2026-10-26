/**
 * @fileoverview Unit tests for invoice domain label utilities.
 * @module app/domains/invoices/_utils/labelUtilities/tests
 */

import {ClassificationOrigin, ClassificationSystem, PaymentType} from "@/types/invoices";
import type {ClassificationNode, StandardClassification} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {getClassificationGroup, getClassificationHierarchyPath, getClassificationLabel, getPaymentTypeLabel} from "./labelUtilities";

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
