/**
 * @fileoverview Barrel export for all mock builders
 * @module data/mocks
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
