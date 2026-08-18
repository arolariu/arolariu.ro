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
import {generateRandomProducts} from "./product";

const fixtureDate = new Date("2026-01-15T12:00:00.000Z");

function createInvoiceIdentifier(index: number): string {
  return `11111111-1111-7111-8111-${String(index).padStart(12, "0")}`;
}

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
    transactionDate: fixtureDate,
    paymentType: PaymentType.Card,
    currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
    totalCostAmount: 0,
    totalTaxAmount: 0,
    subtotalAmount: 0,
    tipAmount: 0,
  };
}

function buildRecipe(index: number): RecipeSuggestion {
  return {
    name: `Mock recipe ${index + 1}`,
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
    this.value = {
      id: createInvoiceIdentifier(1),
      name: "Mock Invoice",
      description: "A deterministic invoice fixture.",
      userIdentifier: "22222222-2222-7222-8222-222222222222",
      sharedWith: [],
      classification: buildEcoicopClassification(),
      scans: [{type: InvoiceScanType.JPEG, location: "https://storage.example.test/mock-receipt.jpg"}],
      paymentInformation: buildPaymentInformation(),
      merchantReference: "33333333-3333-7333-8333-333333333333",
      items: [],
      possibleRecipes: [],
      additionalMetadata: {},
      receiptType: "Itemized",
      countryRegion: "RO",
      taxDetails: [],
      payments: [],
      createdAt: fixtureDate,
      createdBy: "22222222-2222-7222-8222-222222222222",
      lastUpdatedAt: fixtureDate,
      lastUpdatedBy: "22222222-2222-7222-8222-222222222222",
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
    const totalPrice = items.reduce((total, item) => total + item.totalPrice, 0);
    this.value = {
      ...this.value,
      items,
      paymentInformation: {
        ...this.value.paymentInformation,
        totalCostAmount: totalPrice,
        totalTaxAmount: 0,
        subtotalAmount: totalPrice,
        tipAmount: 0,
      },
    };
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
    return this.withScans(
      Array.from({length: count}, (_, index) => ({
        type: InvoiceScanType.JPEG,
        location: `https://storage.example.test/mock-receipt-${index + 1}.jpg`,
      })),
    );
  }
  public withRandomRecipes(count = 1): this {
    return this.withPossibleRecipes(Array.from({length: count}, (_, index) => buildRecipe(index)));
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
    return Array.from({length: count}, (_, index) => this.withId(createInvoiceIdentifier(index + 1)).build());
  }
}

/** Creates a fluent canonical invoice builder. */
export function createInvoiceBuilder(): InvoiceBuilder {
  return new InvoiceBuilder();
}
/** Generates a complete deterministic invoice DTO. */
export function generateRandomInvoice(): Invoice {
  return new InvoiceBuilder().build();
}
/** Generates complete deterministic invoice DTOs. */
export function generateRandomInvoices(count: number): Invoice[] {
  return new InvoiceBuilder().buildMany(count);
}

export const mockInvoice = new InvoiceBuilder().withName("Test Invoice").withRandomItems(3).build();
export const mockInvoiceList = generateRandomInvoices(5);
