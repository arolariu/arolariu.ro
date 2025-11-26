/**
 * @fileoverview Centralized mock data builders for testing and development.
 * @module data/mocks
 *
 * @remarks
 * This module provides fluent builder patterns for creating realistic test data:
 *
 * **Builder Classes:**
 * - {@link InvoiceBuilder} - Creates invoice objects with customizable properties
 * - {@link ProductBuilder} - Creates product/line item objects
 * - {@link MerchantBuilder} - Creates merchant/store objects
 *
 * **Factory Functions:**
 * - `generate*()` - Creates single random instances
 * - `generate*s()` - Creates arrays of random instances
 * - `create*Builder()` - Factory for builder instantiation
 *
 * **Pre-built Mocks:**
 * - `mock*` - Single pre-configured instances for quick testing
 * - `mock*List` - Arrays of pre-configured instances
 *
 * **Usage Patterns:**
 * ```typescript
 * // Fluent builder
 * const invoice = new InvoiceBuilder()
 *   .withName("Test")
 *   .withRandomItems(5)
 *   .build();
 *
 * // Random generation
 * const invoices = generateRandomInvoices(10);
 *
 * // Pre-built mocks
 * import {mockInvoice, mockProductList} from "@/data/mocks";
 * ```
 *
 * **Testing Context:**
 * - All data generated using faker.js for realistic values
 * - Builders ensure domain invariants are maintained
 * - Useful for unit tests, Storybook stories, and development
 *
 * @see {@link https://fakerjs.dev/ Faker.js Documentation}
 */

// Invoice builders and utilities
export {InvoiceBuilder, createInvoiceBuilder, generateRandomInvoice, generateRandomInvoices, mockInvoice, mockInvoiceList} from "./invoice";

// Product builders and utilities
export {ProductBuilder, createProductBuilder, generateRandomProduct, generateRandomProducts, mockProduct, mockProductList} from "./product";

// Merchant builders and utilities
export {
  MerchantBuilder,
  createMerchantBuilder,
  generateRandomMerchant,
  generateRandomMerchants,
  mockMerchant,
  mockMerchantList,
} from "./merchant";

// Re-export types for convenience
export type {Invoice, Merchant, Product} from "@/types/invoices";
