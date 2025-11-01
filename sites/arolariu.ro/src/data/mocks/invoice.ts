/**
 * @fileoverview Invoice mock builder for testing
 * @module data/mocks/invoice
 */

import type {Currency} from "@/types/DDD";
import {
  InvoiceCategory,
  RecipeComplexity,
  type Invoice,
  type PaymentInformation,
  type PaymentType,
  type Product,
  type Recipe,
} from "@/types/invoices";
import {faker} from "@faker-js/faker";
import {generateRandomProduct} from "./product";

/**
 * Builder class for creating mock Invoice objects with fluent API
 *
 * @example
 * ```typescript
 * const invoice = new InvoiceBuilder()
 *   .withId("invoice-123")
 *   .withName("Test Invoice")
 *   .withCategory(InvoiceCategory.GROCERY)
 *   .build();
 * ```
 */
export class InvoiceBuilder {
  private invoice: Invoice;

  constructor() {
    // Initialize with sensible defaults
    const currency: Currency = {
      code: faker.finance.currencyCode(),
      name: faker.finance.currencyName(),
      symbol: faker.finance.currencySymbol(),
    };

    const totalAmount = faker.number.float({min: 10, max: 1000, multipleOf: 0.01});

    this.invoice = {
      id: faker.string.uuid(),
      name: faker.lorem.sentence(3),
      description: faker.lorem.sentence({min: 7, max: 30}),
      createdAt: faker.date.past(),
      createdBy: faker.string.uuid(),
      lastUpdatedAt: faker.date.recent(),
      lastUpdatedBy: faker.string.uuid(),
      numberOfUpdates: faker.number.int({min: 0, max: 100}),
      isImportant: faker.datatype.boolean(),
      isSoftDeleted: false,
      userIdentifier: faker.string.uuid(),
      sharedWith: [],
      category: InvoiceCategory.GROCERY,
      photoLocation: faker.image.url({width: 800, height: 600}),
      merchantReference: faker.string.uuid(),
      items: [],
      paymentInformation: {
        transactionDate: faker.date.past(),
        paymentType: faker.number.int({min: 0, max: 4}) as PaymentType,
        currency,
        totalCostAmount: totalAmount,
        totalTaxAmount: faker.number.float({min: totalAmount * 0.05, max: totalAmount / 2, multipleOf: 0.01}),
      },
      possibleRecipes: [],
      additionalMetadata: {},
    };
  }

  /**
   * Set the invoice ID
   */
  withId(id: string): this {
    this.invoice.id = id;
    return this;
  }

  /**
   * Set the invoice name
   */
  withName(name: string): this {
    this.invoice.name = name;
    return this;
  }

  /**
   * Set the invoice description
   */
  withDescription(description: string): this {
    this.invoice.description = description;
    return this;
  }

  /**
   * Set the creation date
   */
  withCreatedAt(date: Date): this {
    this.invoice.createdAt = date;
    return this;
  }

  /**
   * Set the last updated date
   */
  withLastUpdatedAt(date: Date): this {
    this.invoice.lastUpdatedAt = date;
    return this;
  }

  /**
   * Set the user identifier
   */
  withUserIdentifier(userId: string): this {
    this.invoice.userIdentifier = userId;
    return this;
  }

  /**
   * Set the shared with list
   */
  withSharedWith(userIds: string[]): this {
    this.invoice.sharedWith = userIds;
    return this;
  }

  /**
   * Set the invoice category
   */
  withCategory(category: InvoiceCategory): this {
    this.invoice.category = category;
    return this;
  }

  /**
   * Set the photo location
   */
  withPhotoLocation(url: string): this {
    this.invoice.photoLocation = url;
    return this;
  }

  /**
   * Set the merchant reference
   */
  withMerchantReference(merchantId: string): this {
    this.invoice.merchantReference = merchantId;
    return this;
  }

  /**
   * Set the items list
   */
  withItems(items: Product[]): this {
    this.invoice.items = items;
    return this;
  }

  /**
   * Set payment information
   */
  withPaymentInformation(paymentInfo: PaymentInformation | null): this {
    this.invoice.paymentInformation = paymentInfo;
    return this;
  }

  /**
   * Set possible recipes
   */
  withPossibleRecipes(recipes: Recipe[]): this {
    this.invoice.possibleRecipes = recipes;
    return this;
  }

  /**
   * Set additional metadata
   */
  withAdditionalMetadata(metadata: Record<string, string>): this {
    this.invoice.additionalMetadata = metadata;
    return this;
  }

  /**
   * Generate a random number of items for the invoice
   */
  withRandomItems(count?: number): this {
    const itemCount = count ?? faker.number.int({min: 3, max: 10});
    this.invoice.items = Array.from({length: itemCount}, generateRandomProduct);
    return this;
  }

  /**
   * Generate random recipes
   */
  withRandomRecipes(count?: number): this {
    const recipeCount = count ?? faker.number.int({min: 0, max: 3});
    this.invoice.possibleRecipes = Array.from({length: recipeCount}, () => ({
      name: faker.lorem.sentence(3),
      complexity: faker.number.int({min: 0, max: 3}) as RecipeComplexity,
      ingredients: [],
      duration: faker.number.int({min: 5, max: 120}),
      description: faker.lorem.sentence({min: 10, max: 80}),
      referenceForMoreDetails: faker.internet.url(),
      cookingTime: faker.number.int({min: 5, max: 120}),
      preparationTime: faker.number.int({min: 5, max: 120}),
      instructions: faker.lorem.sentence({min: 10, max: 50}),
    }));
    return this;
  }

  /**
   * Build and return the invoice object
   */
  build(): Invoice {
    return {...this.invoice};
  }

  /**
   * Create multiple invoices with the same configuration
   */
  buildMany(count: number): Invoice[] {
    return Array.from({length: count}, () => this.build());
  }
}

/**
 * Factory function to create a new InvoiceBuilder
 */
export function createInvoiceBuilder(): InvoiceBuilder {
  return new InvoiceBuilder();
}

/**
 * Generate a single random invoice
 */
export function generateRandomInvoice(): Invoice {
  return new InvoiceBuilder().withRandomItems().withRandomRecipes().build();
}

/**
 * Generate multiple random invoices
 */
export function generateRandomInvoices(count: number): Invoice[] {
  return Array.from({length: count}, generateRandomInvoice);
}

// Pre-built mock instances for quick testing
export const mockInvoice = new InvoiceBuilder()
  .withId("invoice-1")
  .withName("Test Invoice")
  .withCategory(InvoiceCategory.GROCERY)
  .withUserIdentifier("user-123")
  .build();

export const mockInvoiceList = generateRandomInvoices(5);
