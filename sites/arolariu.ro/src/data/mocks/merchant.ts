/**
 * @fileoverview Merchant mock builder for testing
 * @module data/mocks/merchant
 */

import {MerchantCategory, type Merchant} from "@/types/invoices";
import {faker} from "@faker-js/faker";

/**
 * Builder class for creating mock Merchant objects with fluent API
 *
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
   */
  withId(id: string): this {
    this.merchant.id = id;
    return this;
  }

  /**
   * Set the merchant name
   */
  withName(name: string): this {
    this.merchant.name = name;
    return this;
  }

  /**
   * Set the merchant description
   */
  withDescription(description: string): this {
    this.merchant.description = description;
    return this;
  }

  /**
   * Set the creation date
   */
  withCreatedAt(date: Date): this {
    this.merchant.createdAt = date;
    return this;
  }

  /**
   * Set the creator ID
   */
  withCreatedBy(userId: string): this {
    this.merchant.createdBy = userId;
    return this;
  }

  /**
   * Set the last updated date
   */
  withLastUpdatedAt(date: Date): this {
    this.merchant.lastUpdatedAt = date;
    return this;
  }

  /**
   * Set the last updater ID
   */
  withLastUpdatedBy(userId: string): this {
    this.merchant.lastUpdatedBy = userId;
    return this;
  }

  /**
   * Set the number of updates
   */
  withNumberOfUpdates(count: number): this {
    this.merchant.numberOfUpdates = count;
    return this;
  }

  /**
   * Set whether the merchant is important
   */
  withIsImportant(isImportant: boolean): this {
    this.merchant.isImportant = isImportant;
    return this;
  }

  /**
   * Set whether the merchant is soft deleted
   */
  withIsSoftDeleted(isSoftDeleted: boolean): this {
    this.merchant.isSoftDeleted = isSoftDeleted;
    return this;
  }

  /**
   * Set the merchant category
   */
  withCategory(category: MerchantCategory): this {
    this.merchant.category = category;
    return this;
  }

  /**
   * Set the merchant address
   */
  withAddress(address: string): this {
    this.merchant.address = address;
    return this;
  }

  /**
   * Set the merchant phone number
   */
  withPhoneNumber(phoneNumber: string): this {
    this.merchant.phoneNumber = phoneNumber;
    return this;
  }

  /**
   * Set the parent company ID
   */
  withParentCompanyId(companyId: string): this {
    this.merchant.parentCompanyId = companyId;
    return this;
  }

  /**
   * Build and return the merchant object
   */
  build(): Merchant {
    return {...this.merchant};
  }

  /**
   * Create multiple merchants with the same configuration
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
 */
export function createMerchantBuilder(): MerchantBuilder {
  return new MerchantBuilder();
}

/**
 * Generate a single random merchant
 */
export function generateRandomMerchant(): Merchant {
  return new MerchantBuilder().build();
}

/**
 * Generate multiple random merchants
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
