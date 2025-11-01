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
   * Set the merchant ID
   * @param id The merchant ID
   * @returns The MerchantBuilder instance for chaining
   */
  withId(id: string): this {
    this.merchant.id = id;
    return this;
  }

  /**
   * Set the merchant name
   * @param name The merchant name
   * @returns The MerchantBuilder instance for chaining
   */
  withName(name: string): this {
    this.merchant.name = name;
    return this;
  }

  /**
   * Set the merchant description
   * @param description The merchant description
   * @returns The MerchantBuilder instance for chaining
   */
  withDescription(description: string): this {
    this.merchant.description = description;
    return this;
  }

  /**
   * Set the creation date
   * @param date The creation date
   * @returns The MerchantBuilder instance for chaining
   */
  withCreatedAt(date: Date): this {
    this.merchant.createdAt = date;
    return this;
  }

  /**
   * Set the creator ID
   * @param userId The creator user ID
   * @returns The MerchantBuilder instance for chaining
   */
  withCreatedBy(userId: string): this {
    this.merchant.createdBy = userId;
    return this;
  }

  /**
   * Set the last updated date
   * @param date The last updated date
   * @returns The MerchantBuilder instance for chaining
   */
  withLastUpdatedAt(date: Date): this {
    this.merchant.lastUpdatedAt = date;
    return this;
  }

  /**
   * Set the last updater ID
   * @param userId The last updater user ID
   * @returns The MerchantBuilder instance for chaining
   */
  withLastUpdatedBy(userId: string): this {
    this.merchant.lastUpdatedBy = userId;
    return this;
  }

  /**
   * Set the number of updates
   * @param count The number of updates
   * @returns The MerchantBuilder instance for chaining
   */
  withNumberOfUpdates(count: number): this {
    this.merchant.numberOfUpdates = count;
    return this;
  }

  /**
   * Set whether the merchant is important
   * @param isImportant Whether the merchant is important
   * @returns The MerchantBuilder instance for chaining
   */
  withIsImportant(isImportant: boolean): this {
    this.merchant.isImportant = isImportant;
    return this;
  }

  /**
   * Set whether the merchant is soft deleted
   * @param isSoftDeleted Whether the merchant is soft deleted
   * @returns The MerchantBuilder instance for chaining
   */
  withIsSoftDeleted(isSoftDeleted: boolean): this {
    this.merchant.isSoftDeleted = isSoftDeleted;
    return this;
  }

  /**
   * Set the merchant category
   * @param category The merchant category
   * @returns The MerchantBuilder instance for chaining
   */
  withCategory(category: MerchantCategory): this {
    this.merchant.category = category;
    return this;
  }

  /**
   * Set the merchant address
   * @param address The merchant address
   * @returns The MerchantBuilder instance for chaining
   */
  withAddress(address: string): this {
    this.merchant.address = address;
    return this;
  }

  /**
   * Set the merchant phone number
   * @param phoneNumber The merchant phone number
   * @returns The MerchantBuilder instance for chaining
   */
  withPhoneNumber(phoneNumber: string): this {
    this.merchant.phoneNumber = phoneNumber;
    return this;
  }

  /**
   * Set the parent company ID
   * @param companyId The parent company ID
   * @returns The MerchantBuilder instance for chaining
   */
  withParentCompanyId(companyId: string): this {
    this.merchant.parentCompanyId = companyId;
    return this;
  }

  /**
   * Build and return the merchant object
   * @returns The constructed {@link Merchant} object
   */
  build(): Merchant {
    return {...this.merchant};
  }

  /**
   * Create multiple merchants with the same configuration
   * @param count The number of merchants to create
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
 * Factory function to create a new MerchantBuilder
 * @returns A new instance of {@link MerchantBuilder}
 */
export function createMerchantBuilder(): MerchantBuilder {
  return new MerchantBuilder();
}

/**
 * Generate a single random merchant
 * @returns A randomly generated {@link Merchant} object
 */
export function generateRandomMerchant(): Merchant {
  return new MerchantBuilder().build();
}

/**
 * Generate multiple random merchants
 * @param count The number of merchants to generate
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
