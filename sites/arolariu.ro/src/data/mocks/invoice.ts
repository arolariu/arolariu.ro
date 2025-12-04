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
  InvoiceScanType,
  RecipeComplexity,
  type Invoice,
  type InvoiceScan,
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
  /**
   * Internal invoice state being constructed.
   *
   * @remarks
   * Mutated by `with*()` methods during builder configuration.
   * A shallow copy is returned by {@link build} to prevent external mutation.
   */
  private invoice: Invoice;

  /**
   * Creates a new InvoiceBuilder with randomized default values.
   *
   * @remarks
   * **Initialization Strategy:** Uses faker.js to generate realistic random data
   * for all required Invoice fields. This ensures test invoices are immediately
   * valid without requiring manual configuration.
   *
   * **Default Values:**
   * - `id`: Random UUIDv4
   * - `name`: Random 3-word sentence
   * - `description`: Random 7-30 word sentence
   * - `category`: {@link InvoiceCategory.GROCERY}
   * - `isSoftDeleted`: `false` (active invoice)
   * - `items`: Empty array (use {@link withRandomItems} to populate)
   * - `possibleRecipes`: Empty array (use {@link withRandomRecipes} to populate)
   * - `scans`: Single JPEG scan with random URL
   *
   * **Payment Defaults:**
   * - Random currency (code, name, symbol)
   * - Total amount between 10-1000
   * - Tax amount between 5-50% of total
   *
   * @example
   * ```typescript
   * // Create with all random defaults
   * const invoice = new InvoiceBuilder().build();
   *
   * // Override specific fields
   * const customInvoice = new InvoiceBuilder()
   *   .withId("my-id")
   *   .withCategory(InvoiceCategory.FAST_FOOD)
   *   .build();
   * ```
   *
   * @see {@link createInvoiceBuilder} for factory function alternative
   */
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
      scans: [
        {
          scanType: InvoiceScanType.JPEG,
          location: faker.image.url({width: 800, height: 600}),
          metadata: {},
        },
      ],
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
   * @remarks
   * **Identity Semantics:** The ID is the primary key for invoice identity.
   * Two invoices with the same ID are considered the same entity.
   *
   * **Format:** Should be a valid UUIDv4 string for consistency with backend.
   * Non-UUID values are accepted for testing flexibility.
   *
   * @param id - UUID string identifying this invoice. Should be UUIDv4 format.
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const invoice = new InvoiceBuilder()
   *   .withId("550e8400-e29b-41d4-a716-446655440000")
   *   .build();
   * ```
   *
   * @see {@link Invoice.id}
   */
  withId(id: string): this {
    // @ts-expect-error -- id is readonly in the BaseEntity interface
    this.invoice.id = id;
    return this;
  }

  /**
   * Sets the display name for the invoice.
   *
   * @remarks
   * **UI Display:** This name appears in invoice lists, search results,
   * and as the primary label in invoice cards.
   *
   * **Searchability:** Name is indexed for full-text search in the UI.
   *
   * @param name - Human-readable name or title for the invoice
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const invoice = new InvoiceBuilder()
   *   .withName("Weekly Groceries - Dec 2025")
   *   .build();
   * ```
   *
   * @see {@link NamedEntity.name}
   */
  withName(name: string): this {
    this.invoice.name = name;
    return this;
  }

  /**
   * Sets a detailed description for the invoice.
   *
   * @remarks
   * **UI Display:** Description appears in invoice detail views and tooltips.
   * Supports longer text than {@link withName} for detailed context.
   *
   * **Searchability:** Description is indexed for full-text search.
   *
   * @param description - Long-form description or notes about the invoice
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const invoice = new InvoiceBuilder()
   *   .withDescription("Monthly grocery shopping at Whole Foods. Includes organic produce and household items.")
   *   .build();
   * ```
   *
   * @see {@link NamedEntity.description}
   */
  withDescription(description: string): this {
    this.invoice.description = description;
    return this;
  }

  /**
   * Sets when the invoice was created.
   *
   * @remarks
   * **Audit Trail:** Part of the {@link IAuditable} contract for entity lifecycle tracking.
   *
   * **Testing Use Case:** Useful for testing date-based filtering, sorting,
   * and "created within last X days" queries.
   *
   * @param date - Timestamp of invoice creation (defaults to random past date)
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Test invoice created exactly 30 days ago
   * const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
   * const invoice = new InvoiceBuilder()
   *   .withCreatedAt(thirtyDaysAgo)
   *   .build();
   * ```
   *
   * @see {@link IAuditable.createdAt}
   */
  withCreatedAt(date: Date): this {
    // @ts-expect-error -- createdAt is readonly in the IAuditable interface
    this.invoice.createdAt = date;
    return this;
  }

  /**
   * Sets when the invoice was last modified.
   *
   * @remarks
   * **Audit Trail:** Part of the {@link IAuditable} contract for modification tracking.
   *
   * **Sorting:** Used for "recently updated" sort order in invoice lists.
   *
   * @param date - Timestamp of last modification (defaults to random recent date)
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Test invoice updated today
   * const invoice = new InvoiceBuilder()
   *   .withLastUpdatedAt(new Date())
   *   .build();
   * ```
   *
   * @see {@link IAuditable.lastUpdatedAt}
   */
  withLastUpdatedAt(date: Date): this {
    this.invoice.lastUpdatedAt = date;
    return this;
  }

  /**
   * Sets which user owns this invoice.
   *
   * @remarks
   * **Authorization:** The userIdentifier determines ownership and default access.
   * Only the owner (or shared users) can view/edit the invoice.
   *
   * **Backend Mapping:** Maps to the Clerk user ID in production.
   *
   * @param userId - UUID of the user who owns this invoice (Clerk user ID in production)
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const invoice = new InvoiceBuilder()
   *   .withUserIdentifier("user_2abc123def")
   *   .build();
   * ```
   *
   * @see {@link Invoice.userIdentifier}
   * @see {@link withSharedWith} for granting access to other users
   */
  withUserIdentifier(userId: string): this {
    this.invoice.userIdentifier = userId;
    return this;
  }

  /**
   * Sets which users have shared access to this invoice.
   *
   * @remarks
   * **Access Control:**
   * - Empty array = private invoice (only owner can access)
   * - Special UUID = public invoice (anyone can view)
   * - User UUIDs = specific users have view/edit access
   *
   * **Testing Collaboration:** Useful for testing multi-user scenarios,
   * shared invoice lists, and permission checks.
   *
   * @param userIds - Array of user UUID strings with view/edit access
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Private invoice (default)
   * const privateInvoice = new InvoiceBuilder().withSharedWith([]).build();
   *
   * // Shared with specific users
   * const sharedInvoice = new InvoiceBuilder()
   *   .withSharedWith(["user-1", "user-2"])
   *   .build();
   * ```
   *
   * @see {@link Invoice.sharedWith}
   * @see {@link withUserIdentifier} for the invoice owner
   */
  withSharedWith(userIds: string[]): this {
    this.invoice.sharedWith = userIds;
    return this;
  }

  /**
   * Sets the business category classification for the invoice.
   *
   * @remarks
   * **Filtering:** Category enables filtering invoices by type in the UI.
   *
   * **Analytics:** Used for spending breakdown by category in reports.
   *
   * **AI Analysis:** Influences recipe suggestions and merchant detection.
   *
   * @param category - Category enum value from {@link InvoiceCategory}
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const groceryInvoice = new InvoiceBuilder()
   *   .withCategory(InvoiceCategory.GROCERY)
   *   .build();
   *
   * const restaurantInvoice = new InvoiceBuilder()
   *   .withCategory(InvoiceCategory.FAST_FOOD)
   *   .build();
   * ```
   *
   * @see {@link InvoiceCategory} for available categories
   */
  withCategory(category: InvoiceCategory): this {
    this.invoice.category = category;
    return this;
  }

  /**
   * Sets the invoice scans (receipt images/PDFs).
   *
   * @remarks
   * **Multiple Scans:** Supports multiple scans for multi-page receipts
   * or different views (front/back) of the same receipt.
   *
   * **Scan Types:** Supports JPEG, PNG, PDF formats via {@link InvoiceScanType}.
   *
   * **Storage:** Scan locations are CDN URLs pointing to Azure Blob Storage.
   *
   * @param scans - Array of {@link InvoiceScan} objects representing invoice photos/documents
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const invoice = new InvoiceBuilder()
   *   .withScans([
   *     { scanType: InvoiceScanType.JPEG, location: "https://cdn.example.com/scan1.jpg", metadata: {} },
   *     { scanType: InvoiceScanType.PDF, location: "https://cdn.example.com/scan2.pdf", metadata: {} },
   *   ])
   *   .build();
   * ```
   *
   * @see {@link InvoiceScan} for scan structure
   * @see {@link withRandomScans} for generating random test scans
   */
  withScans(scans: InvoiceScan[]): this {
    this.invoice.scans = scans;
    return this;
  }

  /**
   * Links the invoice to a specific merchant/store.
   *
   * @remarks
   * **Foreign Key:** References a Merchant entity in the invoices domain.
   *
   * **AI Detection:** Can be populated by AI analysis of receipt content.
   *
   * **Sentinel Value:** {@link Guid.Empty} indicates unenriched/unknown merchant.
   *
   * @param merchantId - UUID of the Merchant entity
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const invoice = new InvoiceBuilder()
   *   .withMerchantReference("merchant-uuid-here")
   *   .build();
   * ```
   *
   * @see {@link Invoice.merchantReference}
   */
  withMerchantReference(merchantId: string): this {
    this.invoice.merchantReference = merchantId;
    return this;
  }

  /**
   * Sets the list of purchased products/line items.
   *
   * @remarks
   * **Line Items:** Each Product represents a single line item on the receipt
   * with name, quantity, unit price, and total price.
   *
   * **AI Extraction:** Products are typically extracted by AI from receipt scans.
   *
   * **Recipe Generation:** Items are analyzed for possible recipe suggestions.
   *
   * @param items - Array of {@link Product} objects representing purchased items
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const invoice = new InvoiceBuilder()
   *   .withItems([
   *     { rawName: "Milk 2%", genericName: "Milk", quantity: 2, price: 3.99, ... },
   *     { rawName: "Bread", genericName: "Bread", quantity: 1, price: 2.50, ... },
   *   ])
   *   .build();
   * ```
   *
   * @see {@link Product} for item structure
   * @see {@link withRandomItems} for generating random test items
   * @see {@link generateRandomProduct} for single product generation
   */
  withItems(items: Product[]): this {
    this.invoice.items = items;
    return this;
  }

  /**
   * Sets payment method and transaction details for the invoice.
   *
   * @remarks
   * **Payment Details:**
   * - Transaction date
   * - Payment type (cash, card, etc.)
   * - Currency with code, name, symbol
   * - Total cost and tax amounts
   *
   * **Null Handling:** Pass `null` to represent an unpaid/pending invoice.
   *
   * @param paymentInfo - Payment information object or null if unpaid
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const invoice = new InvoiceBuilder()
   *   .withPaymentInformation({
   *     transactionDate: new Date(),
   *     paymentType: PaymentType.CreditCard,
   *     currency: { code: "USD", name: "US Dollar", symbol: "$" },
   *     totalCostAmount: 99.99,
   *     totalTaxAmount: 8.50,
   *   })
   *   .build();
   * ```
   *
   * @see {@link PaymentInformation} for structure details
   * @see {@link PaymentType} for payment method options
   */
  withPaymentInformation(paymentInfo: PaymentInformation): this {
    this.invoice.paymentInformation = paymentInfo;
    return this;
  }

  /**
   * Sets AI-generated recipe suggestions based on invoice items.
   *
   * @remarks
   * **AI Feature:** Recipes are generated by analyzing purchased ingredients
   * against a recipe database. This is an AI enrichment artifact.
   *
   * **Recipe Structure:** Each recipe includes name, complexity level,
   * cooking/prep times, ingredients list, and instructions.
   *
   * @param recipes - Array of {@link Recipe} suggestions from AI analysis
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const invoice = new InvoiceBuilder()
   *   .withPossibleRecipes([
   *     {
   *       name: "Banana Smoothie",
   *       complexity: RecipeComplexity.Easy,
   *       duration: 5,
   *       cookingTime: 0,
   *       preparationTime: 5,
   *       ingredients: ["banana", "milk", "honey"],
   *       instructions: "Blend all ingredients until smooth.",
   *       description: "Quick and healthy breakfast smoothie.",
   *       referenceForMoreDetails: "https://recipes.example.com/banana-smoothie",
   *     },
   *   ])
   *   .build();
   * ```
   *
   * @see {@link Recipe} for structure details
   * @see {@link RecipeComplexity} for difficulty levels
   * @see {@link withRandomRecipes} for generating random test recipes
   */
  withPossibleRecipes(recipes: Recipe[]): this {
    this.invoice.possibleRecipes = recipes;
    return this;
  }

  /**
   * Sets custom key-value metadata for extensibility.
   *
   * @remarks
   * **Extensibility:** Allows storing arbitrary key-value pairs without
   * schema changes. Useful for feature flags, A/B test data, or custom fields.
   *
   * **Type Safety:** All values must be strings. Serialize complex objects
   * to JSON strings if needed.
   *
   * **Special Keys:** Some keys have special meaning:
   * - `isImportant`: User-marked priority flag
   * - `requiresAnalysis`: Pending AI processing flag
   *
   * @param metadata - Additional properties as string key-value pairs
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const invoice = new InvoiceBuilder()
   *   .withAdditionalMetadata({
   *     source: "mobile-app",
   *     importSource: "email-attachment",
   *     customTag: "monthly-expense",
   *   })
   *   .build();
   * ```
   *
   * @see {@link Invoice.additionalMetadata}
   */
  withAdditionalMetadata(metadata: Record<string, string>): this {
    this.invoice.additionalMetadata = metadata;
    return this;
  }

  /**
   * Generates random product items using faker.js for testing.
   *
   * @remarks
   * **Random Generation:** Uses {@link generateRandomProduct} to create
   * each item with realistic fake data.
   *
   * **Generated Properties:**
   * - Random product names and categories
   * - Prices between 0.50 and 100.00
   * - Quantities between 1 and 10
   * - Random allergen information
   * - Product codes and metadata
   *
   * **Default Count:** When `count` is omitted, generates between 3-10 items
   * (random selection each time).
   *
   * @param count - Number of items to generate. If omitted, random 3-10 items.
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Generate random count (3-10 items)
   * const invoice1 = new InvoiceBuilder().withRandomItems().build();
   *
   * // Generate exactly 5 items
   * const invoice2 = new InvoiceBuilder().withRandomItems(5).build();
   * ```
   *
   * @see {@link generateRandomProduct} for individual product generation
   * @see {@link withItems} for setting specific items
   */
  withRandomItems(count?: number): this {
    const itemCount = count ?? faker.number.int({min: 3, max: 10});
    this.invoice.items = Array.from({length: itemCount}, generateRandomProduct);
    return this;
  }

  /**
   * Generates random invoice scans using faker.js for testing.
   *
   * @remarks
   * **Scan Types:** Randomly selects from JPEG, PNG, or PDF formats.
   *
   * **Generated Properties:**
   * - Random scan type from {@link InvoiceScanType}
   * - Fake image URL (800x600) for location
   * - Empty metadata object
   *
   * **Default Count:** When `count` is omitted, generates between 1-3 scans.
   *
   * @param count - Number of scans to generate. If omitted, random 1-3 scans.
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Generate random count (1-3 scans)
   * const invoice1 = new InvoiceBuilder().withRandomScans().build();
   *
   * // Generate exactly 2 scans
   * const invoice2 = new InvoiceBuilder().withRandomScans(2).build();
   * ```
   *
   * @see {@link InvoiceScan} for scan structure
   * @see {@link InvoiceScanType} for supported formats
   * @see {@link withScans} for setting specific scans
   */
  withRandomScans(count?: number): this {
    const scanCount = count ?? faker.number.int({min: 1, max: 3});
    const scanTypes = [InvoiceScanType.JPEG, InvoiceScanType.PNG, InvoiceScanType.PDF];
    this.invoice.scans = Array.from({length: scanCount}, () => ({
      scanType: faker.helpers.arrayElement(scanTypes),
      location: faker.image.url({width: 800, height: 600}),
      metadata: {},
    }));
    return this;
  }

  /**
   * Generates random recipe suggestions using faker.js for testing.
   *
   * @remarks
   * **Generated Properties:**
   * - Fake recipe name (3-word sentence)
   * - Random complexity from {@link RecipeComplexity}
   * - Cooking and preparation times (5-120 minutes each)
   * - Duration (total time)
   * - Fake description and instructions
   * - Reference URL for more details
   * - Empty ingredients array (use for testing display, not validation)
   *
   * **Default Count:** When `count` is omitted, generates between 0-3 recipes.
   * Zero recipes simulates invoices without recipe suggestions.
   *
   * @param count - Number of recipes to generate. If omitted, random 0-3 recipes.
   * @returns This InvoiceBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * // Generate random count (0-3 recipes)
   * const invoice1 = new InvoiceBuilder().withRandomRecipes().build();
   *
   * // Generate exactly 2 recipes
   * const invoice2 = new InvoiceBuilder().withRandomRecipes(2).build();
   *
   * // No recipes (simulating unanalyzed invoice)
   * const invoice3 = new InvoiceBuilder().withRandomRecipes(0).build();
   * ```
   *
   * @see {@link Recipe} for structure details
   * @see {@link RecipeComplexity} for difficulty levels
   * @see {@link withPossibleRecipes} for setting specific recipes
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
   *
   * @remarks
   * **Shallow Copy:** Creates a shallow copy of the internal invoice state.
   * Nested objects (items, scans, recipes) are shared references.
   *
   * **Immutability:** The returned invoice should be treated as immutable.
   * Modifications to the returned object do not affect the builder state.
   *
   * **Reusability:** The builder can be reused after calling `build()`.
   * Each call returns a new invoice instance.
   *
   * @returns The constructed {@link Invoice} object ready for use
   *
   * @example
   * ```typescript
   * const builder = new InvoiceBuilder().withName("Test");
   *
   * const invoice1 = builder.build();
   * const invoice2 = builder.withId("new-id").build();
   *
   * // invoice1 and invoice2 are separate objects
   * console.log(invoice1.id !== invoice2.id); // true
   * ```
   *
   * @see {@link buildMany} for creating multiple instances
   */
  build(): Invoice {
    return {...this.invoice};
  }

  /**
   * Creates multiple invoice instances with identical configuration.
   *
   * @remarks
   * **Same Configuration:** All invoices share the same property values,
   * including IDs. This is useful for testing scenarios requiring
   * identical test data.
   *
   * **Unique IDs Warning:** For invoices with unique IDs, use
   * {@link generateRandomInvoices} instead, which generates fresh
   * random data for each invoice.
   *
   * **Shallow Copies:** Each invoice is a separate object (via `build()`),
   * but nested arrays reference the same objects.
   *
   * @param count - How many invoice copies to create. Must be positive integer.
   * @returns Array of {@link Invoice} objects with same configuration
   *
   * @example
   * ```typescript
   * // Create 5 invoices with same configuration
   * const invoices = new InvoiceBuilder()
   *   .withCategory(InvoiceCategory.GROCERY)
   *   .withUserIdentifier("test-user")
   *   .buildMany(5);
   *
   * // All have same category and user
   * invoices.every(inv => inv.category === InvoiceCategory.GROCERY); // true
   * ```
   *
   * @see {@link build} for single invoice creation
   * @see {@link generateRandomInvoices} for unique random invoices
   */
  buildMany(count: number): Invoice[] {
    return Array.from({length: count}, () => this.build());
  }
}

/**
 * Factory function for creating new invoice builder instances.
 *
 * @remarks
 * **Factory Pattern:** Provides a functional alternative to `new InvoiceBuilder()`.
 * Preferred in functional programming contexts or when composition is needed.
 *
 * **Equivalence:** `createInvoiceBuilder()` is equivalent to `new InvoiceBuilder()`.
 * Both return a fresh builder with random default values.
 *
 * @returns Fresh {@link InvoiceBuilder} instance with random defaults
 *
 * @example
 * ```typescript
 * // Factory function style
 * const invoice1 = createInvoiceBuilder()
 *   .withName("My Invoice")
 *   .build();
 *
 * // Equivalent to constructor style
 * const invoice2 = new InvoiceBuilder()
 *   .withName("My Invoice")
 *   .build();
 * ```
 *
 * @see {@link InvoiceBuilder} for the builder class
 */
export function createInvoiceBuilder(): InvoiceBuilder {
  return new InvoiceBuilder();
}

/**
 * Generates a complete random invoice with items and recipes for testing.
 *
 * @remarks
 * **Convenience Function:** Shorthand for creating a fully-populated
 * test invoice with a single function call.
 *
 * **Generated Data:**
 * - Random UUIDv4 for all identifiers
 * - 3-10 random product items with realistic data
 * - 0-3 random recipe suggestions
 * - Realistic payment information with random currency
 * - {@link InvoiceCategory.GROCERY} as default category
 * - Single JPEG scan with random URL
 *
 * **Use Cases:**
 * - Unit test fixtures requiring complete invoices
 * - Storybook component examples
 * - Development seed data
 * - Integration test scenarios
 *
 * **Determinism:** Each call generates different random data.
 * For deterministic tests, use {@link mockInvoice} or configure
 * faker.js seed.
 *
 * @returns Fully populated random {@link Invoice} object
 *
 * @example
 * ```typescript
 * const testInvoice = generateRandomInvoice();
 *
 * expect(testInvoice.id).toBeDefined();
 * expect(testInvoice.items.length).toBeGreaterThan(0);
 * expect(testInvoice.paymentInformation).toBeDefined();
 * ```
 *
 * @see {@link generateRandomInvoices} for batch generation
 * @see {@link InvoiceBuilder} for customized invoice creation
 * @see {@link mockInvoice} for deterministic test data
 */
export function generateRandomInvoice(): Invoice {
  return new InvoiceBuilder().withRandomItems().withRandomRecipes().build();
}

/**
 * Generates multiple complete random invoices for batch testing.
 *
 * @remarks
 * **Unique Invoices:** Each invoice is independently generated with
 * unique IDs and random data. Unlike {@link InvoiceBuilder.buildMany},
 * this creates truly distinct invoices.
 *
 * **Performance Considerations:**
 * - Generates synchronously (blocks event loop)
 * - For large counts (>1000), consider chunked async generation
 * - Each invoice includes 3-10 random items (can be expensive)
 *
 * **Use Cases:**
 * - Pagination testing with realistic data volumes
 * - List/table component stress testing
 * - Filtering and sorting algorithm testing
 * - Performance benchmarking
 *
 * @param count - How many random invoices to generate. Must be positive integer.
 * @returns Array of fully populated random {@link Invoice} objects, each unique
 *
 * @example
 * ```typescript
 * // Generate test dataset
 * const testData = generateRandomInvoices(50);
 *
 * // All invoices have unique IDs
 * const ids = testData.map(inv => inv.id);
 * const uniqueIds = new Set(ids);
 * console.log(ids.length === uniqueIds.size); // true
 *
 * // Use in pagination testing
 * const pagination = usePaginationWithSearch({ items: testData });
 * ```
 *
 * @see {@link generateRandomInvoice} for single invoice generation
 * @see {@link mockInvoiceList} for pre-built list (5 invoices)
 */
export function generateRandomInvoices(count: number): Invoice[] {
  return Array.from({length: count}, generateRandomInvoice);
}

/**
 * Pre-built mock invoice with predictable values for quick testing.
 *
 * @remarks
 * **Deterministic Data:** Unlike {@link generateRandomInvoice}, this mock
 * has fixed, predictable values suitable for snapshot tests and assertions.
 *
 * **Fixed Values:**
 * - `id`: "invoice-1"
 * - `name`: "Test Invoice"
 * - `category`: {@link InvoiceCategory.GROCERY}
 * - `userIdentifier`: "user-123"
 *
 * **Random Values:** Other properties (description, dates, payment info)
 * are randomly generated at module load time. They are consistent within
 * a single test run.
 *
 * **Use Cases:**
 * - Snapshot tests requiring deterministic data
 * - Quick unit test assertions with known ID
 * - Documentation examples
 * - Default values in Storybook stories
 *
 * **Caution:** Avoid using in tests that depend on random fields being
 * specific values. Use {@link InvoiceBuilder} for full control.
 *
 * @example
 * ```typescript
 * // Use in tests with known ID
 * expect(mockInvoice.id).toBe("invoice-1");
 * expect(mockInvoice.name).toBe("Test Invoice");
 *
 * // Use as default in Storybook
 * export const Default: Story = {
 *   args: { invoice: mockInvoice },
 * };
 * ```
 *
 * @see {@link mockInvoiceList} for pre-built list
 * @see {@link InvoiceBuilder} for customized test data
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
 * **Module-Level Generation:** Invoices are generated once when the module
 * is first imported. Values are consistent within a single test run but
 * differ across runs due to faker.js randomness.
 *
 * **Invoice Count:** Fixed at 5 invoices. For different counts, use
 * {@link generateRandomInvoices}.
 *
 * **Use Cases:**
 * - List/table component testing
 * - Pagination testing (small dataset)
 * - Filtering and sorting tests
 * - Quick integration tests
 *
 * **Consistency Note:** For fully deterministic tests, configure faker.js
 * seed or use {@link InvoiceBuilder} to create specific test data.
 *
 * @example
 * ```typescript
 * // Use in list component tests
 * render(<InvoiceList invoices={mockInvoiceList} />);
 *
 * // Verify list has expected count
 * expect(mockInvoiceList).toHaveLength(5);
 *
 * // All invoices have required properties
 * for (const invoice of mockInvoiceList) {
 *   expect(invoice.id).toBeDefined();
 *   expect(invoice.items).toBeDefined();
 * }
 * ```
 *
 * @see {@link mockInvoice} for single deterministic invoice
 * @see {@link generateRandomInvoices} for custom-sized lists
 */
export const mockInvoiceList = generateRandomInvoices(5);
