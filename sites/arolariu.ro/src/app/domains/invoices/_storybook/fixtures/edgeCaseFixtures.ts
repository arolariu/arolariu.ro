/**
 * @fileoverview Edge-case invoice/merchant fixtures (empty, huge, long-text) for stories.
 * @module app/domains/invoices/_storybook/fixtures/edgeCaseFixtures
 *
 * @remarks
 * Provides deterministic fixtures for the story variation matrix:
 * empty-state, huge-data (overflow), and long-text (truncation/wrapping).
 */

import type {Invoice, InvoiceCategory} from "@/types/invoices/Invoice";
import type {Merchant} from "@/types/invoices/Merchant";
import type {Product, ProductCategory, ProductMetadata} from "@/types/invoices/Product";
import {storyInvoice} from "./invoiceFixtures";
import {storyMerchant} from "./merchantFixtures";

/**
 * Builds a ProductMetadata fixture with high confidence.
 *
 * @param overrides - Partial metadata overrides.
 * @returns Complete ProductMetadata fixture.
 */
function buildProductMetadata(overrides: Partial<ProductMetadata> = {}): ProductMetadata {
  return {
    isEdited: false,
    isComplete: true,
    isSoftDeleted: false,
    confidence: 0.9,
    ...overrides,
  };
}

/**
 * Invoice with no items, scans, or recipes — exercises empty-state rendering.
 */
export const storyEmptyInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-empty-001",
  name: "Empty Invoice",
  description: "",
  items: [],
  scans: [],
  possibleRecipes: [],
  taxDetails: [],
  payments: [],
  additionalMetadata: {},
};

/**
 * Builds N synthetic products for huge-data stories.
 *
 * @param count - Number of products to generate.
 * @returns An array of synthetic products.
 */
function buildProducts(count: number): Product[] {
  return Array.from({length: count}, (_, i) => ({
    name: `Synthetic Product ${i + 1}`,
    category: 200 as ProductCategory,
    quantity: (i % 5) + 1,
    quantityUnit: "pcs",
    productCode: `590000000${String(i).padStart(4, "0")}`,
    price: Number(((i % 50) + 1.99).toFixed(2)),
    totalPrice: Number((((i % 5) + 1) * ((i % 50) + 1.99)).toFixed(2)),
    detectedAllergens: [],
    metadata: buildProductMetadata(),
  }));
}

/**
 * Invoice with 120 products — exercises overflow/scroll/perf rendering.
 */
export const storyHugeInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-huge-001",
  name: "Huge Invoice — Monthly Bulk Restock",
  items: buildProducts(120),
};

/**
 * Invoice with very long name/description — exercises truncation/wrapping.
 */
export const storyLongNameInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-longname-001",
  name: "Annual Wholesale Procurement Order — Central Distribution Warehouse Bucuresti Militari Branch Nr. 42 (Consolidated, Itemized, VAT-Inclusive)",
  description:
    "This invoice intentionally carries an extremely long description to verify that text wrapping, clamping, and ellipsis behaviour render correctly across cards, tables, and dialog headers without breaking layout or overflowing containers.",
};

/**
 * Merchant with an extremely long name for truncation tests.
 */
export const storyLongNameMerchant: Merchant = {
  ...storyMerchant,
  id: "merchant-story-longname-001",
  name: "Mega Image Supermarket International Premium Gold Deluxe Extra — Downtown Central Branch Nr. 42",
};

/**
 * ~60 invoices for grid/table/list overflow stories.
 */
export const storyManyInvoices: Invoice[] = Array.from({length: 60}, (_, i) => ({
  ...storyInvoice,
  id: `invoice-story-many-${String(i).padStart(3, "0")}`,
  name: `Invoice #${i + 1} — ${i % 2 === 0 ? "Groceries" : "Electronics"}`,
  category: (i % 2 === 0 ? 100 : 9999) as InvoiceCategory,
  isImportant: i % 7 === 0,
}));
