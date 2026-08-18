/**
 * @fileoverview Fluent test builder for complete canonical product DTOs.
 * @module data/mocks/product
 */

import {
  AllergenAssessmentStatus,
  AllergenCode,
  AllergenEvidenceLevel,
  ClassificationOrigin,
  ClassificationSystem,
  type AllergenAssessment,
  type Product,
  type ProductMetadata,
  type StandardClassification,
} from "@/types/invoices";

function createProductCode(index: number): string {
  return `MOCK${String(index).padStart(4, "0")}`;
}

function buildGpcClassification(): StandardClassification {
  const code = "10000234";
  return {
    system: ClassificationSystem.Gs1Gpc,
    version: "2026.08",
    code,
    officialLabel: "Milk",
    hierarchy: [
      {level: "segment", code: "10000000", officialLabel: "Food/Beverage/Tobacco"},
      {level: "family", code: "10000200", officialLabel: "Dairy products"},
      {level: "brick", code, officialLabel: "Milk"},
    ],
    origin: ClassificationOrigin.Analysis,
    confidence: 0.9,
    evidence: [],
  };
}

function buildDetectedAssessment(): AllergenAssessment {
  return {
    status: AllergenAssessmentStatus.Detected,
    signals: [
      {
        code: AllergenCode.Milk,
        evidenceLevel: AllergenEvidenceLevel.Explicit,
        confidence: 0.9,
        evidence: [{source: "ingredients", value: "milk"}],
      },
    ],
  };
}

/** Builds complete product DTOs without legacy category or allergen aliases. */
export class ProductBuilder {
  private value: Product;

  public constructor() {
    const price = 10;
    const quantity = 1;
    this.value = {
      name: "Mock Product",
      classification: buildGpcClassification(),
      productCode: createProductCode(1),
      price,
      quantity,
      quantityUnit: "pcs",
      totalPrice: price * quantity,
      allergenAssessment: null,
      metadata: {isComplete: true, isEdited: false, isSoftDeleted: false, confidence: 0.9},
    };
  }

  public withName(name: string): this {
    this.value = {...this.value, name};
    return this;
  }

  public withProductCode(productCode: string): this {
    this.value = {...this.value, productCode};
    return this;
  }

  /** Assigns the complete canonical GS1 GPC classification, or clears it. */
  public withClassification(classification: StandardClassification | null): this {
    this.value = {...this.value, classification};
    return this;
  }

  public withPrice(price: number): this {
    this.value = {...this.value, price, totalPrice: price * this.value.quantity};
    return this;
  }

  public withQuantity(quantity: number): this {
    this.value = {...this.value, quantity, totalPrice: quantity * this.value.price};
    return this;
  }

  public withQuantityUnit(quantityUnit: string): this {
    this.value = {...this.value, quantityUnit};
    return this;
  }

  public withTotalPrice(totalPrice: number): this {
    this.value = {...this.value, totalPrice};
    return this;
  }

  /** Sets the reviewable assessment result; no-signals remains non-safety evidence. */
  public withAllergenAssessment(allergenAssessment: AllergenAssessment | null): this {
    this.value = {...this.value, allergenAssessment};
    return this;
  }

  /** Adds one deterministic detected assessment for presentation fixtures. */
  public withDetectedAllergenSignals(): this {
    return this.withAllergenAssessment(buildDetectedAssessment());
  }

  public withMetadata(metadata: Partial<ProductMetadata>): this {
    this.value = {...this.value, metadata: {...this.value.metadata, ...metadata}};
    return this;
  }

  public build(): Product {
    return {
      ...this.value,
      metadata: {...this.value.metadata},
      classification:
        this.value.classification === null ? null : {...this.value.classification, hierarchy: [...this.value.classification.hierarchy]},
      allergenAssessment:
        this.value.allergenAssessment === null
          ? null
          : {...this.value.allergenAssessment, signals: [...this.value.allergenAssessment.signals]},
    };
  }

  public buildMany(count: number): Product[] {
    return Array.from({length: count}, (_, index) =>
      this.withName(`Mock Product ${index + 1}`)
        .withProductCode(createProductCode(index + 1))
        .build(),
    );
  }
}

/** Creates a fluent canonical product builder. */
export function createProductBuilder(): ProductBuilder {
  return new ProductBuilder();
}

/** Generates one complete deterministic product DTO. */
export function generateRandomProduct(): Product {
  return new ProductBuilder().build();
}

/** Generates complete deterministic product DTOs. */
export function generateRandomProducts(count: number): Product[] {
  return new ProductBuilder().buildMany(count);
}

export const mockProduct = new ProductBuilder().withName("Test Product").withPrice(9.99).withQuantity(2).build();
export const mockProductList = generateRandomProducts(10);
