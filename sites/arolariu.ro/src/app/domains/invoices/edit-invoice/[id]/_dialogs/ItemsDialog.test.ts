import {ClassificationOrigin, ClassificationSystem, type Product} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {createProductSelectors} from "./ItemsDialog";

const duplicateProduct: Product = {
  name: "Wholemeal bread",
  classification: {
    system: ClassificationSystem.Gs1Gpc,
    version: "2026.08",
    code: "10000045",
    officialLabel: "Bread",
    hierarchy: [{level: "segment", code: "10000045", officialLabel: "Bread"}],
    origin: ClassificationOrigin.Analysis,
    confidence: 0.98,
    evidence: [],
  },
  quantity: 1,
  quantityUnit: "pcs",
  productCode: "",
  price: 5,
  totalPrice: 5,
  allergenAssessment: null,
  metadata: {isEdited: false, isComplete: true, isSoftDeleted: false, confidence: 0.98},
};

describe("createProductSelectors", () => {
  it("targets the first and second duplicate through immutable occurrence ordinals", () => {
    const selectors = createProductSelectors([duplicateProduct, duplicateProduct]);

    expect(selectors[0]?.occurrenceOrdinal).toBe(0);
    expect(selectors[1]?.occurrenceOrdinal).toBe(1);
    expect(selectors[1]).toMatchObject({
      originalName: "Wholemeal bread",
      originalQuantity: 1,
      originalUnitPrice: 5,
      originalTotalPrice: 5,
    });
  });

  it("prefers an immutable original product code over a duplicate ordinal", () => {
    const selectors = createProductSelectors([{...duplicateProduct, productCode: "5940000000001"}]);

    expect(selectors[0]).toMatchObject({originalProductCode: "5940000000001", occurrenceOrdinal: null});
  });

  it("uses code normalization and a stable occurrence for duplicate product codes", () => {
    const selectors = createProductSelectors([
      {...duplicateProduct, productCode: " sku-42 "},
      {...duplicateProduct, productCode: "SKU-42"},
    ]);

    expect(selectors).toEqual([
      {
        originalProductCode: " sku-42 ",
        originalName: null,
        originalQuantity: null,
        originalUnitPrice: null,
        originalTotalPrice: null,
        occurrenceOrdinal: 0,
      },
      {
        originalProductCode: "SKU-42",
        originalName: null,
        originalQuantity: null,
        originalUnitPrice: null,
        originalTotalPrice: null,
        occurrenceOrdinal: 1,
      },
    ]);
  });

  it("collapses whitespace and casing before finding duplicate snapshot occurrences", () => {
    const selectors = createProductSelectors([
      {...duplicateProduct, name: " Wholemeal   bread "},
      {...duplicateProduct, name: "wholemeal bread"},
    ]);

    expect(selectors[0]?.occurrenceOrdinal).toBe(0);
    expect(selectors[1]?.occurrenceOrdinal).toBe(1);
  });
});
