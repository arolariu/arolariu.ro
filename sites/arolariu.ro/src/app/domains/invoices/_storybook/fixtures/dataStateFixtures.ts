/**
 * @fileoverview Data/state scenario fixtures (currency, amount edges, confidence,
 * sharing, dates, scans) for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/fixtures/dataStateFixtures
 */

import {LAST_GUID} from "@/lib/utils.generic";
import type {Currency} from "@/types/DDD/SharedKernel/Currency";
import type {Invoice} from "@/types/invoices/Invoice";
import type {Merchant} from "@/types/invoices/Merchant";
import type {Product, ProductCategory, ProductMetadata} from "@/types/invoices/Product";
import {storyInvoice} from "./invoiceFixtures";
import {storyMerchant} from "./merchantFixtures";

/**
 * Helper function to create a Currency fixture.
 */
function currency(code: string, name: string, symbol: string): Currency {
  return {name, code, symbol};
}

/**
 * Helper function to create an invoice with a specific currency.
 */
function withCurrency(code: string, name: string, symbol: string): Invoice {
  return {
    ...storyInvoice,
    id: `invoice-story-${code.toLowerCase()}-001`,
    name: `Invoice in ${code}`,
    paymentInformation: {...storyInvoice.paymentInformation, currency: currency(code, name, symbol)},
  };
}

/** Invoice fixture with EUR currency. */
export const storyEurInvoice: Invoice = withCurrency("EUR", "Euro", "€");

/** Invoice fixture with USD currency. */
export const storyUsdInvoice: Invoice = withCurrency("USD", "US Dollar", "$");

/** Invoice fixture with GBP currency. */
export const storyGbpInvoice: Invoice = withCurrency("GBP", "Pound Sterling", "£");

/** Invoice fixture with zero total amounts. */
export const storyZeroTotalInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-zero-001",
  name: "Zero-total Invoice",
  paymentInformation: {...storyInvoice.paymentInformation, totalCostAmount: 0, totalTaxAmount: 0, subtotalAmount: 0, tipAmount: 0},
};

/** Invoice fixture with large total amounts. */
export const storyLargeTotalInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-large-001",
  name: "Large-total Invoice",
  paymentInformation: {
    ...storyInvoice.paymentInformation,
    totalCostAmount: 1_234_567.89,
    totalTaxAmount: 197_530.86,
    subtotalAmount: 1_037_037.03,
    tipAmount: 0,
  },
};

/** Invoice fixture with tip amount. */
export const storyTipInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-tip-001",
  name: "Invoice with Tip",
  paymentInformation: {...storyInvoice.paymentInformation, tipAmount: 25},
};

/** Invoice fixture that is soft-deleted. */
export const storyDeletedInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-deleted-001",
  name: "Deleted Invoice",
  isSoftDeleted: true,
};

/** Invoice fixture with many updates. */
export const storyManyUpdatesInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-updates-001",
  name: "Frequently Updated Invoice",
  numberOfUpdates: 42,
};

/** Invoice fixture shared with many users. */
export const storySharedManyInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-sharedmany-001",
  name: "Widely Shared Invoice",
  sharedWith: Array.from({length: 8}, (_, i) => `00000000-0000-0000-0000-00000000000${i}`),
};

/** Invoice fixture with future transaction date. */
export const storyFutureDatedInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-future-001",
  name: "Future-dated Invoice",
  paymentInformation: {...storyInvoice.paymentInformation, transactionDate: new Date("2099-12-31T10:00:00.000Z")},
};

/** Invoice fixture with epoch transaction date. */
export const storyEpochDateInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-epoch-001",
  name: "Epoch-dated Invoice",
  paymentInformation: {...storyInvoice.paymentInformation, transactionDate: new Date(0)},
};

/**
 * Helper function to create ProductMetadata with specified confidence.
 */
function metaOf(confidence: number, overrides: Partial<ProductMetadata> = {}): ProductMetadata {
  return {isEdited: false, isComplete: true, isSoftDeleted: false, confidence, ...overrides};
}

/**
 * Helper function to create array of products with specified confidence.
 */
function productsOf(count: number, confidence: number): Product[] {
  return Array.from({length: count}, (_, i) => ({
    name: `Item ${i + 1}`,
    category: 200 as ProductCategory,
    quantity: 1,
    quantityUnit: "pcs",
    productCode: `5900000${String(i).padStart(5, "0")}`,
    price: 9.99,
    totalPrice: 9.99,
    detectedAllergens: [],
    metadata: metaOf(confidence),
  }));
}

/** Invoice fixture with low confidence items. */
export const storyLowConfidenceInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-lowconf-001",
  name: "Low-confidence Invoice",
  items: productsOf(5, 0.3),
};

/** Invoice fixture with mixed confidence items. */
export const storyMixedConfidenceInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-mixedconf-001",
  name: "Mixed-confidence Invoice",
  items: [...productsOf(2, 0.95), ...productsOf(2, 0.4)],
};

/** Invoice fixture with soft-deleted items. */
export const storySoftDeletedItemsInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-softitems-001",
  name: "Invoice with Removed Items",
  items: [
    ...storyInvoice.items,
    {
      name: "Removed Item",
      category: 200 as ProductCategory,
      quantity: 1,
      quantityUnit: "pcs",
      productCode: "5900000999999",
      price: 5,
      totalPrice: 5,
      detectedAllergens: [],
      metadata: metaOf(0.9, {isSoftDeleted: true}),
    },
  ],
};

/** Invoice fixture with many allergens per item. */
export const storyManyAllergensInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-allergens-001",
  name: "Allergen-heavy Invoice",
  items: storyInvoice.items.map((item) => ({
    ...item,
    detectedAllergens: [
      {name: "Lactose", description: "Milk sugar", learnMoreAddress: "https://www.who.int/allergens/lactose"},
      {name: "Gluten", description: "Wheat protein", learnMoreAddress: "https://www.who.int/allergens/gluten"},
      {name: "Nuts", description: "Tree nuts", learnMoreAddress: "https://www.who.int/allergens/nuts"},
    ],
  })),
};

/** Invoice fixture with zero-price items. */
export const storyZeroPriceItemsInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-zeroprice-001",
  name: "Zero-price Items Invoice",
  items: storyInvoice.items.map((item) => ({...item, price: 0, totalPrice: 0})),
};

/** Merchant fixture with minimal contact information. */
export const storyMinimalMerchant: Merchant = {
  ...storyMerchant,
  id: "merchant-story-minimal-001",
  name: "Minimal Merchant",
  address: {...storyMerchant.address, address: "", phoneNumber: "", emailAddress: "", website: ""},
};

/** Public share GUID sentinel value. */
export const PUBLIC_SHARE_GUID = LAST_GUID;
