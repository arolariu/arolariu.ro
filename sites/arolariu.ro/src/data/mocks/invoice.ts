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
   * Sets the unique identifier for the invoice.
   * @param id Unique identifier to assign
   * @returns The InvoiceBuilder instance for chaining
   */
  withId(id: string): this {
    this.invoice.id = id;
    return this;
  }

  /**
   * Sets the display name for the invoice.
   * @param name Display name to assign
   * @returns The InvoiceBuilder instance for chaining
   */
  withName(name: string): this {
    this.invoice.name = name;
    return this;
  }

  /**
   * Sets a detailed description for the invoice.
   * @param description Description text to assign
   * @returns The InvoiceBuilder instance for chaining
   */
  withDescription(description: string): this {
    this.invoice.description = description;
    return this;
  }

  /**
   * Sets when the invoice was created.
   * @param date Creation timestamp
   * @returns The InvoiceBuilder instance for chaining
   */
  withCreatedAt(date: Date): this {
    this.invoice.createdAt = date;
    return this;
  }

  /**
   * Sets when the invoice was last modified.
   * @param date Last modification timestamp
   * @returns The InvoiceBuilder instance for chaining
   */
  withLastUpdatedAt(date: Date): this {
    this.invoice.lastUpdatedAt = date;
    return this;
  }

  /**
   * Sets which user owns this invoice.
   * @param userId Owner's unique identifier
   * @returns The InvoiceBuilder instance for chaining
   */
  withUserIdentifier(userId: string): this {
    this.invoice.userIdentifier = userId;
    return this;
  }

  /**
   * Sets which users have access to this invoice.
   * @param userIds Array of user identifiers with shared access
   * @returns The InvoiceBuilder instance for chaining
   */
  withSharedWith(userIds: string[]): this {
    this.invoice.sharedWith = userIds;
    return this;
  }

  /**
   * Sets the business category of the invoice.
   * @param category Category classification
   * @returns The InvoiceBuilder instance for chaining
   */
  withCategory(category: InvoiceCategory): this {
    this.invoice.category = category;
    return this;
  }

  /**
   * Sets the storage URL for the invoice image.
   * @param url Location where the photo is stored
   * @returns The InvoiceBuilder instance for chaining
   */
  withPhotoLocation(url: string): this {
    this.invoice.photoLocation = url;
    return this;
  }

  /**
   * Links the invoice to a specific merchant.
   * @param merchantId Reference to the merchant entity
   * @returns The InvoiceBuilder instance for chaining
   */
  withMerchantReference(merchantId: string): this {
    this.invoice.merchantReference = merchantId;
    return this;
  }

  /**
   * Sets the list of purchased products.
   * @param items Array of products on this invoice
   * @returns The InvoiceBuilder instance for chaining
   */
  withItems(items: Product[]): this {
    this.invoice.items = items;
    return this;
  }

  /**
   * Sets how the invoice was paid.
   * @param paymentInfo Payment method and transaction details
   * @returns The InvoiceBuilder instance for chaining
   */
  withPaymentInformation(paymentInfo: PaymentInformation | null): this {
    this.invoice.paymentInformation = paymentInfo;
    return this;
  }

  /**
   * Sets potential recipes that can be made from invoice items.
   * @param recipes Array of recipe suggestions
   * @returns The InvoiceBuilder instance for chaining
   */
  withPossibleRecipes(recipes: Recipe[]): this {
    this.invoice.possibleRecipes = recipes;
    return this;
  }

  /**
   * Sets custom key-value metadata for the invoice.
   * @param metadata Additional properties as key-value pairs
   * @returns The InvoiceBuilder instance for chaining
   */
  withAdditionalMetadata(metadata: Record<string, string>): this {
    this.invoice.additionalMetadata = metadata;
    return this;
  }

  /**
   * Generates random product items for testing.
   * @param count Number of items to generate (defaults to 3-10)
   * @returns The InvoiceBuilder instance for chaining
   */
  withRandomItems(count?: number): this {
    const itemCount = count ?? faker.number.int({min: 3, max: 10});
    this.invoice.items = Array.from({length: itemCount}, generateRandomProduct);
    return this;
  }

  /**
   * Generates random recipe suggestions for testing.
   * @param count Number of recipes to generate (defaults to 0-3)
   * @returns The InvoiceBuilder instance for chaining
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
   * Constructs the final invoice object from builder state.
   * @returns The constructed {@link Invoice} object
   */
  build(): Invoice {
    return {...this.invoice};
  }

  /**
   * Creates multiple invoice instances with the same configuration.
   * @param count How many invoices to create
   * @returns An array of constructed {@link Invoice} objects
   */
  buildMany(count: number): Invoice[] {
    return Array.from({length: count}, () => this.build());
  }
}

/**
 * Creates a new invoice builder instance for fluent configuration.
 * @returns A new instance of {@link InvoiceBuilder}
 */
export function createInvoiceBuilder(): InvoiceBuilder {
  return new InvoiceBuilder();
}

/**
 * Generates a complete random invoice for testing purposes.
 * @returns A randomly generated {@link Invoice} object
 */
export function generateRandomInvoice(): Invoice {
  return new InvoiceBuilder().withRandomItems().withRandomRecipes().build();
}

/**
 * Generates multiple random invoices for testing purposes.
 * @param count How many invoices to generate
 * @returns An array of randomly generated {@link Invoice} objects
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
