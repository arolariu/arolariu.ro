/**
 * @fileoverview Merchant mock builder for testing
 * @module data/mocks/merchant
 */

import {MerchantCategory, type Merchant} from "@/types/invoices";
import {faker} from "@faker-js/faker";

/**
 * Builder class for creating mock Merchant objects with fluent API
 * @example
 * ```typescript
 * const merchant = new MerchantBuilder()
 *   .withId("merchant-123")
 *   .withName("Test Store")
 *   .withCategory(MerchantCategory.SUPERMARKET)
 *   .build();
 * ```
 */
export class MerchantBuilder {
  private merchant: Merchant;

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
   * @param id Unique identifier to assign
   * @returns The MerchantBuilder instance for chaining
   */
  withId(id: string): this {
    this.merchant.id = id;
    return this;
  }

  /**
   * Sets the display name for the merchant.
   * @param name Business or store name
   * @returns The MerchantBuilder instance for chaining
   */
  withName(name: string): this {
    this.merchant.name = name;
    return this;
  }

  /**
   * Sets a detailed description for the merchant.
   * @param description Description text to assign
   * @returns The MerchantBuilder instance for chaining
   */
  withDescription(description: string): this {
    this.merchant.description = description;
    return this;
  }

  /**
   * Sets when the merchant was created.
   * @param date Creation timestamp
   * @returns The MerchantBuilder instance for chaining
   */
  withCreatedAt(date: Date): this {
    this.merchant.createdAt = date;
    return this;
  }

  /**
   * Sets who created the merchant record.
   * @param userId Creator's user identifier
   * @returns The MerchantBuilder instance for chaining
   */
  withCreatedBy(userId: string): this {
    this.merchant.createdBy = userId;
    return this;
  }

  /**
   * Sets when the merchant was last modified.
   * @param date Last modification timestamp
   * @returns The MerchantBuilder instance for chaining
   */
  withLastUpdatedAt(date: Date): this {
    this.merchant.lastUpdatedAt = date;
    return this;
  }

  /**
   * Sets who last modified the merchant record.
   * @param userId Last updater's user identifier
   * @returns The MerchantBuilder instance for chaining
   */
  withLastUpdatedBy(userId: string): this {
    this.merchant.lastUpdatedBy = userId;
    return this;
  }

  /**
   * Sets how many times the merchant record was updated.
   * @param count Total number of updates
   * @returns The MerchantBuilder instance for chaining
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
   * Sets the physical location of the merchant.
   * @param address Street address or location
   * @returns The MerchantBuilder instance for chaining
   */
  withAddress(address: string): this {
    this.merchant.address = address;
    return this;
  }

  /**
   * Sets the contact phone number for the merchant.
   * @param phoneNumber Phone number in any format
   * @returns The MerchantBuilder instance for chaining
   */
  withPhoneNumber(phoneNumber: string): this {
    this.merchant.phoneNumber = phoneNumber;
    return this;
  }

  /**
   * Links the merchant to a parent company entity.
   * @param companyId Parent company identifier
   * @returns The MerchantBuilder instance for chaining
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
 * Creates a new merchant builder instance for fluent configuration.
 * @returns A new instance of {@link MerchantBuilder}
 */
export function createMerchantBuilder(): MerchantBuilder {
  return new MerchantBuilder();
}

/**
 * Generates a complete random merchant for testing purposes.
 * @returns A randomly generated {@link Merchant} object
 */
export function generateRandomMerchant(): Merchant {
  return new MerchantBuilder().build();
}

/**
 * Generates multiple random merchants for testing purposes.
 * @param count How many merchants to generate
 * @returns An array of randomly generated {@link Merchant} objects
 */
export function generateRandomMerchants(count: number): Merchant[] {
  return Array.from({length: count}, generateRandomMerchant);
}

// Pre-built mock instances for quick testing
export const mockMerchant = new MerchantBuilder()
  .withId("merchant-1")
  .withName("Test Merchant")
  .withCategory(MerchantCategory.SUPERMARKET)
  .build();

export const mockMerchantList = generateRandomMerchants(5);
