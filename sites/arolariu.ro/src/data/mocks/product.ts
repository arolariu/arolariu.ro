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
import {faker} from "@faker-js/faker";

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
    const price = faker.number.float({min: 0.5, max: 100, multipleOf: 0.01});
    const quantity = faker.number.int({min: 1, max: 10});
    this.value = {
      name: faker.commerce.productName(),
      classification: buildGpcClassification(),
      productCode: faker.string.alphanumeric(8).toUpperCase(),
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
    return Array.from({length: count}, () => this.withProductCode(faker.string.alphanumeric(8).toUpperCase()).build());
  }
}

/** Creates a fluent canonical product builder. */
export function createProductBuilder(): ProductBuilder {
  return new ProductBuilder();
}

/** Generates one complete randomized product DTO. */
export function generateRandomProduct(): Product {
  return new ProductBuilder().build();
}

/** Generates complete randomized product DTOs. */
export function generateRandomProducts(count: number): Product[] {
  return Array.from({length: count}, generateRandomProduct);
}

export const mockProduct = new ProductBuilder().withName("Test Product").withPrice(9.99).withQuantity(2).build();
export const mockProductList = generateRandomProducts(10);
