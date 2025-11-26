/**
 * @fileoverview Merchant mock builder for testing and development.
 * @module data/mocks/merchant
 *
 * @remarks
 * Provides fluent builder pattern for creating realistic merchant/store test data.
 *
 * **Key Features:**
 * - Fluent API for merchant configuration
 * - Faker.js integration for realistic business data
 * - Support for merchant hierarchies (parent companies)
 * - Category-based classification
 * - Batch generation with unique IDs
 *
 * @see {@link MerchantBuilder} - Main builder class
 * @see {@link generateRandomMerchant} - Quick random generation
 */

import {MerchantCategory, type Merchant} from "@/types/invoices";
import {faker} from "@faker-js/faker";

/**
 * Fluent builder for creating mock Merchant objects with customizable properties.
 *
 * @remarks
 * **Design Pattern**: Implements the Builder pattern for flexible object construction.
 *
 * **Default Initialization:**
 * - Random UUIDs for all identifiers
 * - Realistic company names from faker.js
 * - Random addresses and phone numbers
 * - LOCAL_SHOP category as default
 * - Non-deleted state (isSoftDeleted: false)
 *
 * **Method Chaining:**
 * All `with*()` methods return `this` for fluent API usage.
 *
 * **Batch Building:**
 * Use `buildMany()` to create multiple merchants with unique IDs.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const merchant = new MerchantBuilder()
 *   .withName("SuperMart")
 *   .withCategory(MerchantCategory.SUPERMARKET)
 *   .withAddress("123 Main St")
 *   .build();
 * ```
 *
 * @example
 * ```typescript
 * // Merchant chain
 * const parentId = faker.string.uuid();
 * const merchants = new MerchantBuilder()
 *   .withParentCompanyId(parentId)
 *   .withCategory(MerchantCategory.RESTAURANT_CHAIN)
 *   .buildMany(5); // 5 locations of same chain
 * ```
 */
export class MerchantBuilder {
  private merchant: Merchant;

  /**
   * Creates a new MerchantBuilder with default random values.
   *
   * @remarks
   * **Initialization Strategy:**
   * - Generates unique UUIDs for all identifiers
   * - Uses faker.company.name() for realistic business names
   * - Creates fake addresses with street + city format
   * - Generates realistic phone numbers
   * - Defaults to LOCAL_SHOP category
   * - Sets random past/recent timestamps
   * - Randomly assigns importance flag
   *
   * @example
   * ```typescript
   * const builder = new MerchantBuilder();
   * const merchant = builder.build();
   * // Result: Merchant with random but realistic data
   * ```
   */
  constructor() {
    this.merchant = {
      id: faker.string.uuid(),
      name: faker.company.name(),
      description: faker.lorem.sentence(10),
      createdAt: faker.date.past(),
      createdBy: faker.string.uuid(),
      lastUpdatedAt: faker.date.recent(),
      lastUpdatedBy: faker.string.uuid(),
      numberOfUpdates: faker.number.int({min: 0, max: 100}),
      isImportant: faker.datatype.boolean(),
      isSoftDeleted: false,
      category: MerchantCategory.LOCAL_SHOP,
      address: faker.location.streetAddress(true),
      phoneNumber: faker.phone.number(),
      parentCompanyId: faker.string.uuid(),
    };
  }

  /**
   * Sets the unique identifier for the merchant.
   *
   * @param id - Unique identifier (typically UUID format)
   * @returns The MerchantBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const merchant = new MerchantBuilder()
   *   .withId("123e4567-e89b-12d3-a456-426614174000")
   *   .build();
   * ```
   */
  withId(id: string): this {
    this.merchant.id = id;
    return this;
  }

  /**
   * Sets the business/store name for the merchant.
   *
   * @param name - Business name (e.g., "SuperMart", "Joe's Pizza")
   * @returns The MerchantBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const merchant = new MerchantBuilder()
   *   .withName("Whole Foods Market")
   *   .build();
   * ```
   */
  withName(name: string): this {
    this.merchant.name = name;
    return this;
  }

  /**
   * Sets a detailed description for the merchant.
   *
   * @param description - Merchant description or notes
   * @returns The MerchantBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const merchant = new MerchantBuilder()
   *   .withDescription("Organic grocery store specializing in local produce")
   *   .build();
   * ```
   */
  withDescription(description: string): this {
    this.merchant.description = description;
    return this;
  }

  /**
   * Sets when the merchant record was created.
   *
   * @param date - Creation timestamp
   * @returns The MerchantBuilder instance for method chaining
   *
   * @remarks
   * Useful for testing temporal queries or filtering by creation date.
   */
  withCreatedAt(date: Date): this {
    this.merchant.createdAt = date;
    return this;
  }

  /**
   * Sets who created the merchant record.
   *
   * @param userId - Creator's user identifier (UUID format)
   * @returns The MerchantBuilder instance for method chaining
   */
  withCreatedBy(userId: string): this {
    this.merchant.createdBy = userId;
    return this;
  }

  /**
   * Sets when the merchant record was last modified.
   *
   * @param date - Last modification timestamp
   * @returns The MerchantBuilder instance for method chaining
   */
  withLastUpdatedAt(date: Date): this {
    this.merchant.lastUpdatedAt = date;
    return this;
  }

  /**
   * Sets who last modified the merchant record.
   *
   * @param userId - Last updater's user identifier (UUID format)
   * @returns The MerchantBuilder instance for method chaining
   */
  withLastUpdatedBy(userId: string): this {
    this.merchant.lastUpdatedBy = userId;
    return this;
  }

  /**
   * Sets how many times the merchant record was updated.
   *
   * @param count - Total number of updates (must be non-negative)
   * @returns The MerchantBuilder instance for method chaining
   *
   * @remarks
   * Useful for testing audit trails or versioning logic.
   */
  withNumberOfUpdates(count: number): this {
    this.merchant.numberOfUpdates = count;
    return this;
  }

  /**
   * Marks whether this merchant is important for the user.
   * @param isImportant Flag indicating importance
   * @returns The MerchantBuilder instance for chaining
   */
  withIsImportant(isImportant: boolean): this {
    this.merchant.isImportant = isImportant;
    return this;
  }

  /**
   * Marks whether the merchant is logically deleted.
   * @param isSoftDeleted Flag indicating soft deletion status
   * @returns The MerchantBuilder instance for chaining
   */
  withIsSoftDeleted(isSoftDeleted: boolean): this {
    this.merchant.isSoftDeleted = isSoftDeleted;
    return this;
  }

  /**
   * Sets the business category of the merchant.
   * @param category Business type classification
   * @returns The MerchantBuilder instance for chaining
   */
  withCategory(category: MerchantCategory): this {
    this.merchant.category = category;
    return this;
  }

  /**
   * Sets the merchant's physical address.
   *
   * @param address - Street address, city, state, zip
   * @returns The MerchantBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const merchant = new MerchantBuilder()
   *   .withAddress("123 Main St, Springfield, IL 62701")
   *   .build();
   * ```
   */
  withAddress(address: string): this {
    this.merchant.address = address;
    return this;
  }

  /**
   * Sets the merchant's contact phone number.
   *
   * @param phoneNumber - Phone number in any format
   * @returns The MerchantBuilder instance for method chaining
   *
   * @example
   * ```typescript
   * const merchant = new MerchantBuilder()
   *   .withPhoneNumber("+1-555-123-4567")
   *   .build();
   * ```
   */
  withPhoneNumber(phoneNumber: string): this {
    this.merchant.phoneNumber = phoneNumber;
    return this;
  }

  /**
   * Sets the parent company identifier for franchise/chain relationships.
   *
   * @param companyId - UUID of parent company/chain
   * @returns The MerchantBuilder instance for method chaining
   *
   * @remarks
   * Used to group multiple locations under a single parent entity (e.g., all McDonald's locations).
   *
   * @example
   * ```typescript
   * const parentId = "corp-uuid";
   * const location1 = new MerchantBuilder()
   *   .withParentCompanyId(parentId)
   *   .withName("McDonald's - Downtown")
   *   .build();
   * const location2 = new MerchantBuilder()
   *   .withParentCompanyId(parentId)
   *   .withName("McDonald's - Airport")
   *   .build();
   * ```
   */
  withParentCompanyId(companyId: string): this {
    this.merchant.parentCompanyId = companyId;
    return this;
  }

  /**
   * Constructs the final merchant object from builder state.
   * @returns The constructed {@link Merchant} object
   */
  build(): Merchant {
    return {...this.merchant};
  }

  /**
   * Creates multiple merchant instances with the same configuration.
   * @param count How many merchants to create
   * @returns An array of constructed {@link Merchant} objects
   */
  buildMany(count: number): Merchant[] {
    return Array.from({length: count}, () => {
      // Generate a new ID for each instance to ensure uniqueness
      const merchant = this.build();
      merchant.id = faker.string.uuid();
      return merchant;
    });
  }
}

/**
 * Factory function that creates a new MerchantBuilder instance.
 *
 * @returns A new MerchantBuilder with default random values
 *
 * @remarks
 * Convenience function providing a more functional programming style than `new MerchantBuilder()`.
 *
 * @example
 * ```typescript
 * const merchant = createMerchantBuilder()
 *   .withName("Quick Mart")
 *   .build();
 * ```
 */
export function createMerchantBuilder(): MerchantBuilder {
  return new MerchantBuilder();
}

/**
 * Generates a single random Merchant with realistic data.
 *
 * @returns A randomly configured Merchant object
 *
 * @remarks
 * **Use Cases:**
 * - Quick test data generation
 * - Seeding development databases
 * - Populating UI prototypes
 *
 * **Randomization:**
 * - All properties use faker.js for realistic values
 * - Merchant categories are randomly selected
 * - Addresses, phone numbers, and names are locale-appropriate
 *
 * @example
 * ```typescript
 * const merchant = generateRandomMerchant();
 * // Result: {
 * //   id: "uuid...",
 * //   name: "Johnson Group",
 * //   category: MerchantCategory.SUPERMARKET,
 * //   address: "123 Oak St, Denver CO",
 * //   ...
 * // }
 * ```
 *
 * @see {@link generateRandomMerchants} for batch generation
 */
export function generateRandomMerchant(): Merchant {
  return new MerchantBuilder().build();
}

/**
 * Generates multiple random Merchants with realistic data.
 *
 * @param count - Number of merchants to generate
 * @returns Array of randomly configured Merchant objects
 *
 * @remarks
 * Each merchant is independently randomized with unique IDs and properties.
 *
 * **Performance:**
 * - Efficient for large datasets (uses array generation)
 * - Each merchant has distinct faker-generated values
 *
 * @example
 * ```typescript
 * const merchants = generateRandomMerchants(50);
 * // Returns 50 unique merchants with random data
 * ```
 *
 * @example
 * ```typescript
 * // Seed database with diverse merchants
 * const testMerchants = generateRandomMerchants(100);
 * await db.merchants.insertMany(testMerchants);
 * ```
 *
 * @see {@link generateRandomMerchant} for single merchant generation
 */
export function generateRandomMerchants(count: number): Merchant[] {
  return Array.from({length: count}, generateRandomMerchant);
}

/**
 * Pre-built mock merchant for consistent testing.
 *
 * @remarks
 * **Use Case:** Use when you need a deterministic merchant across test cases.
 *
 * **Characteristics:**
 * - Fixed ID: "merchant-1"
 * - Name: "Test Merchant"
 * - Category: SUPERMARKET
 * - Other properties are faker-generated but deterministic
 *
 * @example
 * ```typescript
 * import {mockMerchant} from "@/data/mocks";
 *
 * it("should process merchant correctly", () => {
 *   const result = processMerchant(mockMerchant);
 *   expect(result.merchantId).toBe("merchant-1");
 * });
 * ```
 */
export const mockMerchant = new MerchantBuilder()
  .withId("merchant-1")
  .withName("Test Merchant")
  .withCategory(MerchantCategory.SUPERMARKET)
  .build();

/**
 * Pre-built list of 5 mock merchants for testing collections.
 *
 * @remarks
 * **Use Case:** Use when testing list rendering, filtering, or batch operations.
 *
 * **Characteristics:**
 * - Contains 5 distinct merchants
 * - Each with unique randomized properties
 * - Fixed for a given execution (deterministic)
 *
 * @example
 * ```typescript
 * import {mockMerchantList} from "@/data/mocks";
 *
 * it("should render merchant list", () => {
 *   render(<MerchantList merchants={mockMerchantList} />);
 *   expect(screen.getAllByRole("listitem")).toHaveLength(5);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Test filtering
 * const supermarkets = mockMerchantList.filter(
 *   m => m.category === MerchantCategory.SUPERMARKET
 * );
 * ```
 */
export const mockMerchantList = generateRandomMerchants(5);
