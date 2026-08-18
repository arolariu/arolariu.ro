/**
 * @fileoverview Fluent test builder for complete canonical merchant DTOs.
 * @module data/mocks/merchant
 */

import {ClassificationOrigin, ClassificationSystem, type Merchant, type StandardClassification} from "@/types/invoices";
import {faker} from "@faker-js/faker";

function buildNaceClassification(): StandardClassification {
  return {
    system: ClassificationSystem.Nace21,
    version: "2026.08",
    code: "G47",
    officialLabel: "Retail trade",
    hierarchy: [
      {level: "section", code: "G", officialLabel: "Wholesale and retail trade"},
      {level: "division", code: "G47", officialLabel: "Retail trade"},
    ],
    origin: ClassificationOrigin.Analysis,
    confidence: 0.9,
    evidence: [],
  };
}

/** Builds complete merchant DTOs with NACE classifications. */
export class MerchantBuilder {
  private value: Merchant;

  public constructor() {
    const now = faker.date.recent();
    this.value = {
      id: faker.string.uuid(),
      name: faker.company.name(),
      description: faker.lorem.sentence(),
      classification: buildNaceClassification(),
      address: {
        fullName: faker.company.name(),
        address: faker.location.streetAddress(true),
        phoneNumber: faker.phone.number(),
        emailAddress: faker.internet.email(),
        website: faker.internet.url(),
      },
      parentCompanyId: "00000000-0000-0000-0000-000000000000",
      referencedInvoiceCount: 0,
      referencedInvoiceIds: [],
      additionalMetadata: {},
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
  public withCreatedBy(createdBy: string): this {
    this.value = {...this.value, createdBy};
    return this;
  }
  public withLastUpdatedAt(lastUpdatedAt: Date): this {
    this.value = {...this.value, lastUpdatedAt};
    return this;
  }
  public withLastUpdatedBy(lastUpdatedBy: string): this {
    this.value = {...this.value, lastUpdatedBy};
    return this;
  }
  public withNumberOfUpdates(numberOfUpdates: number): this {
    this.value = {...this.value, numberOfUpdates};
    return this;
  }
  public withIsImportant(isImportant: boolean): this {
    this.value = {...this.value, isImportant};
    return this;
  }
  public withIsSoftDeleted(isSoftDeleted: boolean): this {
    this.value = {...this.value, isSoftDeleted};
    return this;
  }

  /** Assigns a canonical NACE classification, or clears it. */
  public withClassification(classification: StandardClassification | null): this {
    this.value = {...this.value, classification};
    return this;
  }

  public withAddress(address: string): this {
    this.value = {...this.value, address: {...this.value.address, address}};
    return this;
  }
  public withPhoneNumber(phoneNumber: string): this {
    this.value = {...this.value, address: {...this.value.address, phoneNumber}};
    return this;
  }
  public withParentCompanyId(parentCompanyId: string): this {
    this.value = {...this.value, parentCompanyId};
    return this;
  }

  public build(): Merchant {
    return {
      ...this.value,
      address: {...this.value.address},
      classification:
        this.value.classification === null ? null : {...this.value.classification, hierarchy: [...this.value.classification.hierarchy]},
    };
  }

  public buildMany(count: number): Merchant[] {
    return Array.from({length: count}, () => this.withId(faker.string.uuid()).build());
  }
}

/** Creates a fluent canonical merchant builder. */
export function createMerchantBuilder(): MerchantBuilder {
  return new MerchantBuilder();
}
/** Generates a complete canonical merchant DTO. */
export function generateRandomMerchant(): Merchant {
  return new MerchantBuilder().build();
}
/** Generates complete canonical merchant DTOs. */
export function generateRandomMerchants(count: number): Merchant[] {
  return Array.from({length: count}, generateRandomMerchant);
}

export const mockMerchant = new MerchantBuilder().withId("merchant-1").withName("Test Merchant").build();
export const mockMerchantList = generateRandomMerchants(5);
