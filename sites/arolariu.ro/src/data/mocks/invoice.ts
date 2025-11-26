/**
 * @fileoverview Invoice mock builder for testing and development.
 * @module data/mocks/invoice
 *
 * @remarks
 * Provides fluent builder pattern for creating realistic invoice test data.
 *
 * **Key Features:**
 * - Fluent API with method chaining
 * - Faker.js integration for realistic random data
 * - Support for nested objects (products, recipes, payment info)
 * - Batch generation capabilities
 * - Pre-built mock instances
 *
 * **Builder Pattern Benefits:**
 * - Explicit control over test data properties
 * - Type-safe construction
 * - Reusable configuration through method chaining
 * - Maintains domain invariants (e.g., totalPrice calculations)
 *
 * @see {@link InvoiceBuilder} - Main builder class
 * @see {@link generateRandomInvoice} - Quick random generation
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
 * Fluent builder for creating mock Invoice objects with customizable properties.
 *
 * @remarks
 * **Design Pattern**: Implements the Builder pattern for flexible object construction.
 *
 * **Default Initialization:**
 * - Random UUIDs for identifiers
 * - Realistic fake data from faker.js
 * - Valid currency with code, name, and symbol
 * - Empty arrays for items and shared users
 * - Non-deleted state (isSoftDeleted: false)
 * - GROCERY category as default
 *
 * **Method Chaining:**
 * All `with*()` methods return `this` for fluent API usage.
 *
 * **Batch Building:**
 * Use `buildMany()` to create multiple instances with same configuration.
 *
 * **Random Data:**
 * Use `withRandomItems()` and `withRandomRecipes()` for quick test data.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const invoice = new InvoiceBuilder()
 *   .withId("invoice-123")
 *   .withName("Grocery Shopping")
 *   .withCategory(InvoiceCategory.GROCERY)
 *   .build();
 * ```
 *
 * @example
 * ```typescript
 * // With nested data
 * const invoice = new InvoiceBuilder()
 *   .withUserIdentifier("user-456")
 *   .withRandomItems(5)
 *   .withRandomRecipes(2)
 *   .withMerchantReference("merchant-789")
 *   .build();
 * ```
 *
 * @example
 * ```typescript
 * // Batch creation
 * const invoices = new InvoiceBuilder()
 *   .withCategory(InvoiceCategory.RESTAURANT)
 *   .withRandomItems()
 *   .buildMany(10);
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
   *
   * @param id - UUID string identifying this invoice. Should be UUIDv4 format.
   * @returns This InvoiceBuilder instance for method chaining
   */
  withId(id: string): this {
    this.invoice.id = id;
    return this;
  }

  /**
   * Sets the display name for the invoice.
   *
   * @param name - Human-readable name or title for the invoice
   * @returns This InvoiceBuilder instance for method chaining
   */
  withName(name: string): this {
    this.invoice.name = name;
    return this;
  }

  /**
   * Sets a detailed description for the invoice.
   *
   * @param description - Optional long-form description or notes
   * @returns This InvoiceBuilder instance for method chaining
   */
  withDescription(description: string): this {
    this.invoice.description = description;
    return this;
  }

  /**
   * Sets when the invoice was created.
   *
   * @param date - Timestamp of invoice creation
   * @returns This InvoiceBuilder instance for method chaining
   */
  withCreatedAt(date: Date): this {
    this.invoice.createdAt = date;
    return this;
  }

  /**
   * Sets when the invoice was last modified.
   *
   * @param date - Timestamp of last modification
   * @returns This InvoiceBuilder instance for method chaining
   */
  withLastUpdatedAt(date: Date): this {
    this.invoice.lastUpdatedAt = date;
    return this;
  }

  /**
   * Sets which user owns this invoice.
   *
   * @param userId - UUID of the user who owns this invoice
   * @returns This InvoiceBuilder instance for method chaining
   */
  withUserIdentifier(userId: string): this {
    this.invoice.userIdentifier = userId;
    return this;
  }

  /**
   * Sets which users have shared access to this invoice.
   *
   * @param userIds - Array of user UUID strings with view/edit access
   * @returns This InvoiceBuilder instance for method chaining
   */
  withSharedWith(userIds: string[]): this {
    this.invoice.sharedWith = userIds;
    return this;
  }

  /**
   * Sets the business category classification for the invoice.
   *
   * @param category - Category enum value (GROCERY, RESTAURANT, etc.)
   * @returns This InvoiceBuilder instance for method chaining
   */
  withCategory(category: InvoiceCategory): this {
    this.invoice.category = category;
    return this;
  }

  /**
   * Sets the storage URL for the invoice receipt image.
   *
   * @param url - CDN or cloud storage URL where photo is hosted
   * @returns This InvoiceBuilder instance for method chaining
   */
  withPhotoLocation(url: string): this {
    this.invoice.photoLocation = url;
    return this;
  }

  /**
   * Links the invoice to a specific merchant/store.
   *
   * @param merchantId - UUID of the {@link Merchant} entity
   * @returns This InvoiceBuilder instance for method chaining
   */
  withMerchantReference(merchantId: string): this {
    this.invoice.merchantReference = merchantId;
    return this;
  }

  /**
   * Sets the list of purchased products/line items.
   *
   * @param items - Array of {@link Product} objects on this invoice
   * @returns This InvoiceBuilder instance for method chaining
   */
  withItems(items: Product[]): this {
    this.invoice.items = items;
    return this;
  }

  /**
   * Sets payment method and transaction details for the invoice.
   *
   * @param paymentInfo - Payment information object or null if unpaid
   * @returns This InvoiceBuilder instance for method chaining
   */
  withPaymentInformation(paymentInfo: PaymentInformation | null): this {
    this.invoice.paymentInformation = paymentInfo;
    return this;
  }

  /**
   * Sets AI-generated recipe suggestions based on invoice items.
   *
   * @param recipes - Array of {@link Recipe} suggestions
   * @returns This InvoiceBuilder instance for method chaining
   */
  withPossibleRecipes(recipes: Recipe[]): this {
    this.invoice.possibleRecipes = recipes;
    return this;
  }

  /**
   * Sets custom key-value metadata for extensibility.
   *
   * @param metadata - Additional properties as string key-value pairs
   * @returns This InvoiceBuilder instance for method chaining
   */
  withAdditionalMetadata(metadata: Record<string, string>): this {
    this.invoice.additionalMetadata = metadata;
    return this;
  }

  /**
   * Generates random product items using faker.js for testing.
   *
   * @remarks
   * Each product is created with realistic fake data including:
   * - Random names and categories
   * - Prices between 0.50 and 100.00
   * - Quantities between 1 and 10
   * - Optional allergen information
   *
   * @param count - Number of items to generate (default: random 3-10)
   * @returns This InvoiceBuilder instance for method chaining
   */
  withRandomItems(count?: number): this {
    const itemCount = count ?? faker.number.int({min: 3, max: 10});
    this.invoice.items = Array.from({length: itemCount}, generateRandomProduct);
    return this;
  }

  /**
   * Generates random recipe suggestions using faker.js for testing.
   *
   * @remarks
   * Each recipe includes:
   * - Fake name and description
   * - Random complexity level (EASY, MEDIUM, HARD, EXPERT)
   * - Cooking and preparation times
   * - Reference URL for details
   *
   * @param count - Number of recipes to generate (default: random 0-3)
   * @returns This InvoiceBuilder instance for method chaining
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
   * Constructs the final immutable invoice object from builder state.
   *
   * @remarks
   * Creates a shallow copy of the internal invoice state to prevent external mutations.
   *
   * @returns The constructed {@link Invoice} object ready for use
   */
  build(): Invoice {
    return {...this.invoice};
  }

  /**
   * Creates multiple invoice instances with identical configuration.
   *
   * @remarks
   * **Warning**: All invoices will share the same IDs and references.
   * For unique invoices, call `build()` multiple times or use {@link generateRandomInvoices}.
   *
   * @param count - How many invoice copies to create
   * @returns Array of {@link Invoice} objects with same configuration
   */
  buildMany(count: number): Invoice[] {
    return Array.from({length: count}, () => this.build());
  }
}

/**
 * Factory function for creating new invoice builder instances.
 *
 * @remarks
 * Preferred over `new InvoiceBuilder()` for consistency with functional style.
 *
 * @returns Fresh {@link InvoiceBuilder} instance with random defaults
 *
 * @example
 * ```typescript
 * const builder = createInvoiceBuilder();
 * const invoice = builder.withName("My Invoice").build();
 * ```
 */
export function createInvoiceBuilder(): InvoiceBuilder {
  return new InvoiceBuilder();
}

/**
 * Generates a complete random invoice with items and recipes for testing.
 *
 * @remarks
 * **Generated Data:**
 * - Random UUIDs for all identifiers
 * - 3-10 random product items with prices and quantities
 * - 0-3 random recipe suggestions
 * - Realistic payment information
 * - Random category (GROCERY, RESTAURANT, etc.)
 *
 * **Use Cases:**
 * - Unit test fixtures
 * - Storybook component examples
 * - Development seed data
 * - Integration test scenarios
 *
 * @returns Fully populated random {@link Invoice} object
 *
 * @example
 * ```typescript
 * const testInvoice = generateRandomInvoice();
 * expect(testInvoice.items.length).toBeGreaterThan(0);
 * ```
 */
export function generateRandomInvoice(): Invoice {
  return new InvoiceBuilder().withRandomItems().withRandomRecipes().build();
}

/**
 * Generates multiple complete random invoices for batch testing.
 *
 * @remarks
 * Each invoice is independently generated with unique IDs and random data.
 *
 * **Performance**: Generates synchronously. For large counts (>1000),
 * consider batching or async generation.
 *
 * @param count - How many random invoices to generate
 * @returns Array of fully populated random {@link Invoice} objects
 *
 * @example
 * ```typescript
 * const testData = generateRandomInvoices(50);
 * const pagination = usePaginationWithSearch({items: testData});
 * ```
 */
export function generateRandomInvoices(count: number): Invoice[] {
  return Array.from({length: count}, generateRandomInvoice);
}

/**
 * Pre-built mock invoice with predictable values for quick testing.
 *
 * @remarks
 * **Fixed Values:**
 * - ID: "invoice-1"
 * - Name: "Test Invoice"
 * - Category: GROCERY
 * - User: "user-123"
 *
 * **Use Cases:**
 * - Snapshot tests (deterministic data)
 * - Quick unit test assertions
 * - Example data in documentation
 */
export const mockInvoice = new InvoiceBuilder()
  .withId("invoice-1")
  .withName("Test Invoice")
  .withCategory(InvoiceCategory.GROCERY)
  .withUserIdentifier("user-123")
  .build();

/**
 * Pre-built list of 5 random invoices for quick testing.
 *
 * @remarks
 * Generated once at module load time. Values will be consistent within
 * a single test run but differ across runs due to faker randomness.
 *
 * **Use Cases:**
 * - List/table component tests
 * - Pagination testing
 * - Filtering/sorting tests
 */
export const mockInvoiceList = generateRandomInvoices(5);
