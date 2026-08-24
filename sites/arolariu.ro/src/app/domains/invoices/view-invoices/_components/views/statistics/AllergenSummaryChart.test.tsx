/**
 * @fileoverview Unit tests for AllergenSummaryChart + computeAllergenFrequency.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/AllergenSummaryChart.test
 *
 * @remarks
 * Critical safety test: unassessed products (allergenAssessment: null) MUST be
 * excluded from the denominator. Counting them as "no allergens" would imply
 * an absence that was never established.
 */

import type {Invoice, Product} from "@/types/invoices";
import {InvoiceScanType} from "@/types/invoices";
import {AllergenAssessmentStatus, AllergenCode, AllergenEvidenceLevel} from "@/types/invoices/Allergen";
import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {computeAllergenFrequency} from "../../../_utils/statistics";
import {AllergenSummaryChart} from "./AllergenSummaryChart";

function makeProduct(overrides: Partial<Product>): Product {
  return {
    name: "Test Product",
    quantity: 1,
    quantityUnit: "pcs",
    productCode: "",
    price: 10,
    totalPrice: 10,
    metadata: {isEdited: false, isComplete: true, isSoftDeleted: false, confidence: 1},
    classification: null,
    allergenAssessment: null,
    ...overrides,
  };
}

function makeInvoice(items: Product[]): Invoice {
  return {
    id: "test-invoice",
    name: "Test",
    description: "",
    userIdentifier: "user_test",
    sharedWith: [],
    classification: null,
    scans: [{type: InvoiceScanType.JPEG, location: "", metadata: {}}],
    paymentInformation: {
      totalCostAmount: 100,
      totalTaxAmount: 0,
      subtotalAmount: 0,
      tipAmount: 0,
      transactionDate: new Date(),
      paymentType: 200,
      currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
    },
    merchantReference: "",
    items,
    possibleRecipes: [],
    additionalMetadata: {},
    receiptType: "Itemized",
    countryRegion: "RO",
    taxDetails: [],
    payments: [],
    createdAt: new Date(),
    createdBy: "user_test",
    lastUpdatedAt: new Date(),
    lastUpdatedBy: "user_test",
    numberOfUpdates: 0,
    isImportant: false,
    isSoftDeleted: false,
  };
}

describe("computeAllergenFrequency — denominator safety", () => {
  /**
   * CRITICAL TEST: unassessed products must NOT inflate a "no allergens" figure.
   * Three products:
   * - Product A: assessed, milk detected → counted in numerator & denominator
   * - Product B: assessed, no signals → counted in denominator only
   * - Product C: NOT assessed (allergenAssessment: null) → excluded from denominator
   *
   * Expected denominator = 2 (assessed products A + B)
   * Expected milk percentage = 1/2 * 100 = 50%
   */
  it("excludes unassessed products from the denominator", () => {
    const productA = makeProduct({
      name: "Milk Product",
      allergenAssessment: {
        status: AllergenAssessmentStatus.Detected,
        signals: [
          {code: AllergenCode.Milk, evidenceLevel: AllergenEvidenceLevel.Explicit, confidence: 0.9, evidence: []},
        ],
      },
    });

    const productB = makeProduct({
      name: "Assessed No Allergens",
      allergenAssessment: {status: AllergenAssessmentStatus.NoSignals, signals: []},
    });

    const productC = makeProduct({
      name: "Unassessed Product",
      allergenAssessment: null, // never assessed
    });

    const invoices = [makeInvoice([productA, productB, productC])];
    const result = computeAllergenFrequency(invoices);

    const milkEntry = result.find((r) => r.code === AllergenCode.Milk);
    expect(milkEntry).toBeDefined();
    // denominator = 2 (only assessed products), so percentage = 50%
    expect(milkEntry?.percentage).toBe(50);
    expect(milkEntry?.productCount).toBe(1);
  });

  it("returns empty array when all products are unassessed", () => {
    const productA = makeProduct({allergenAssessment: null});
    const productB = makeProduct({allergenAssessment: null});
    const invoices = [makeInvoice([productA, productB])];

    const result = computeAllergenFrequency(invoices);
    // No assessed products → no entries
    expect(result).toHaveLength(0);
  });

  it("does not count unassessed products as having no allergens", () => {
    // Mixing: 1 product with milk detected, 5 unassessed.
    // If unassessed were counted, milk percentage would be 1/6 ≈ 16.7%
    // With correct denominator (1 assessed), milk percentage = 100%
    const assessed = makeProduct({
      allergenAssessment: {
        status: AllergenAssessmentStatus.Detected,
        signals: [{code: AllergenCode.Milk, evidenceLevel: AllergenEvidenceLevel.Explicit, confidence: 1, evidence: []}],
      },
    });
    const unassessed = Array.from({length: 5}, () => makeProduct({allergenAssessment: null}));

    const invoices = [makeInvoice([assessed, ...unassessed])];
    const result = computeAllergenFrequency(invoices);

    const milkEntry = result.find((r) => r.code === AllergenCode.Milk);
    expect(milkEntry?.percentage).toBe(100); // denominator = 1, not 6
  });

  it("counts each signal code independently across multiple signals in one product", () => {
    const product = makeProduct({
      allergenAssessment: {
        status: AllergenAssessmentStatus.Detected,
        signals: [
          {code: AllergenCode.Milk, evidenceLevel: AllergenEvidenceLevel.Explicit, confidence: 0.9, evidence: []},
          {code: AllergenCode.Eggs, evidenceLevel: AllergenEvidenceLevel.Inferred, confidence: 0.7, evidence: []},
        ],
      },
    });

    const invoices = [makeInvoice([product])];
    const result = computeAllergenFrequency(invoices);

    expect(result.some((r) => r.code === AllergenCode.Milk)).toBe(true);
    expect(result.some((r) => r.code === AllergenCode.Eggs)).toBe(true);
  });
});

describe("AllergenSummaryChart rendering", () => {
  it("renders an allergen card using the canonical label key", () => {
    const data = [{code: AllergenCode.Milk, productCount: 3, percentage: 25}];
    render(<AllergenSummaryChart data={data} />);
    // Mock translator returns key path: "allergens.codes.milk"
    expect(screen.getByText(/allergens\.codes\.milk/i)).toBeInTheDocument();
  });

  it("renders the empty state when data is empty", () => {
    render(<AllergenSummaryChart data={[]} />);
    expect(screen.getByText(/allergenSummary\.empty/i)).toBeInTheDocument();
  });
});
