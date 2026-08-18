/**
 * @fileoverview Fluent test builder for complete canonical invoice DTOs.
 * @module data/mocks/invoice
 */

import {
  ClassificationOrigin,
  ClassificationSystem,
  InvoiceScanType,
  PaymentType,
  RecipeDifficulty,
  type Invoice,
  type InvoiceScan,
  type PaymentInformation,
  type Product,
  type RecipeSuggestion,
  type StandardClassification,
} from "@/types/invoices";
import {faker} from "@faker-js/faker";
import {generateRandomProducts} from "./product";

function buildEcoicopClassification(): StandardClassification {
  return {
    system: ClassificationSystem.EcoicopV2,
    version: "2026.08",
    code: "01.1.1",
    officialLabel: "Food",
    hierarchy: [
      {level: "division", code: "01", officialLabel: "Food and non-alcoholic beverages"},
      {level: "group", code: "01.1", officialLabel: "Food"},
      {level: "class", code: "01.1.1", officialLabel: "Food"},
    ],
    origin: ClassificationOrigin.Analysis,
    confidence: 0.9,
    evidence: [],
  };
}

function buildPaymentInformation(): PaymentInformation {
  return {
    transactionDate: faker.date.recent(),
    paymentType: PaymentType.Card,
    currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
    totalCostAmount: 100,
    totalTaxAmount: 19,
    subtotalAmount: 81,
    tipAmount: 0,
  };
}

function buildRecipe(): RecipeSuggestion {
  return {
    name: "Mock recipe",
    description: "A complete structured mock recipe.",
    servings: 2,
    preparationMinutes: 10,
    cookingMinutes: 20,
    totalMinutes: 30,
    difficulty: RecipeDifficulty.Easy,
    purchasedIngredients: [],
    assumedPantryStaples: [],
    missingOptionalIngredients: [],
    steps: [{sequence: 1, instruction: "Cook and serve.", notes: null}],
    allergenWarnings: [],
  };
}

/** Builds complete invoice DTOs using immutable replacement updates. */
export class InvoiceBuilder {
  private value: Invoice;

  public constructor() {
    const now = faker.date.recent();
    this.value = {
      id: faker.string.uuid(),
      name: "Mock Invoice",
      description: faker.lorem.sentence(),
      userIdentifier: faker.string.uuid(),
      sharedWith: [],
      classification: buildEcoicopClassification(),
      scans: [{type: InvoiceScanType.JPEG, location: faker.internet.url()}],
      paymentInformation: buildPaymentInformation(),
      merchantReference: faker.string.uuid(),
      items: [],
      possibleRecipes: [],
      additionalMetadata: {},
      receiptType: "Itemized",
      countryRegion: "RO",
      taxDetails: [],
      payments: [],
      createdAt: now,
      createdBy: faker.string.uuid(),
      lastUpdatedAt: now,
      lastUpdatedBy: faker.string.uuid(),
      numberOfUpdates: 0,
      isImportant: false,
      isSoftDeleted: false,
    };
  }

  public withId(id: string): this {
    this.value = {...this.value, id};
    return this;
  }
  public withName(name: string): this {
    this.value = {...this.value, name};
    return this;
  }
  public withDescription(description: string): this {
    this.value = {...this.value, description};
    return this;
  }
  public withCreatedAt(createdAt: Date): this {
    this.value = {...this.value, createdAt};
    return this;
  }
  public withLastUpdatedAt(lastUpdatedAt: Date): this {
    this.value = {...this.value, lastUpdatedAt};
    return this;
  }
  public withUserIdentifier(userIdentifier: string): this {
    this.value = {...this.value, userIdentifier};
    return this;
  }
  public withSharedWith(sharedWith: readonly string[]): this {
    this.value = {...this.value, sharedWith};
    return this;
  }

  /** Assigns a canonical ECOICOP classification, or clears it. */
  public withClassification(classification: StandardClassification | null): this {
    this.value = {...this.value, classification};
    return this;
  }

  public withScans(scans: readonly InvoiceScan[]): this {
    this.value = {...this.value, scans};
    return this;
  }
  public withMerchantReference(merchantReference: string): this {
    this.value = {...this.value, merchantReference};
    return this;
  }
  public withItems(items: readonly Product[]): this {
    this.value = {...this.value, items};
    return this;
  }
  public withPaymentInformation(paymentInformation: PaymentInformation): this {
    this.value = {...this.value, paymentInformation};
    return this;
  }
  public withPaymentAmount(totalCostAmount: number): this {
    this.value = {...this.value, paymentInformation: {...this.value.paymentInformation, totalCostAmount}};
    return this;
  }
  public withTransactionDate(transactionDate: Date): this {
    this.value = {...this.value, paymentInformation: {...this.value.paymentInformation, transactionDate}};
    return this;
  }
  public withPaymentCurrency(code: string): this {
    this.value = {...this.value, paymentInformation: {...this.value.paymentInformation, currency: {code, name: code, symbol: code}}};
    return this;
  }
  public withPossibleRecipes(possibleRecipes: readonly RecipeSuggestion[]): this {
    this.value = {...this.value, possibleRecipes};
    return this;
  }
  public withAdditionalMetadata(additionalMetadata: Readonly<Record<string, string | null>>): this {
    this.value = {...this.value, additionalMetadata};
    return this;
  }
  public withRandomItems(count = 3): this {
    return this.withItems(generateRandomProducts(count));
  }
  public withRandomScans(count = 1): this {
    return this.withScans(Array.from({length: count}, () => ({type: InvoiceScanType.JPEG, location: faker.internet.url()})));
  }
  public withRandomRecipes(count = 1): this {
    return this.withPossibleRecipes(Array.from({length: count}, buildRecipe));
  }

  public build(): Invoice {
    return {
      ...this.value,
      sharedWith: [...this.value.sharedWith],
      scans: [...this.value.scans],
      items: [...this.value.items],
      possibleRecipes: [...this.value.possibleRecipes],
      additionalMetadata: {...this.value.additionalMetadata},
      classification:
        this.value.classification === null ? null : {...this.value.classification, hierarchy: [...this.value.classification.hierarchy]},
    };
  }

  public buildMany(count: number): Invoice[] {
    return Array.from({length: count}, () => this.withId(faker.string.uuid()).build());
  }
}

/** Creates a fluent canonical invoice builder. */
export function createInvoiceBuilder(): InvoiceBuilder {
  return new InvoiceBuilder();
}
/** Generates a complete canonical invoice DTO. */
export function generateRandomInvoice(): Invoice {
  return new InvoiceBuilder().build();
}
/** Generates complete canonical invoice DTOs. */
export function generateRandomInvoices(count: number): Invoice[] {
  return Array.from({length: count}, generateRandomInvoice);
}

export const mockInvoice = new InvoiceBuilder().withName("Test Invoice").withRandomItems(3).build();
export const mockInvoiceList = generateRandomInvoices(5);
