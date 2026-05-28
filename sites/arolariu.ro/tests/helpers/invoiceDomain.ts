/**
 * @fileoverview Test helpers for invoice domain fixtures and mock responses.
 * @module tests/helpers/invoiceDomain
 *
 * @remarks
 * Provides typed builders for creating test fixtures of invoice domain entities
 * (Invoice, Product, Merchant, Scan) and mock fetch responses. Used across
 * invoice action and hook unit tests to reduce repetitive fixture creation.
 *
 * **Usage Context:**
 * - Import builders in `.test.ts` files for invoice/merchant/product/scan tests
 * - Use `createJsonResponse` to mock server action responses
 * - Use `buildInvoice`, `buildProduct`, etc. for stable test fixtures
 *
 * **Design Principles:**
 * - All builders accept partial overrides for flexibility
 * - Default values are deterministic (no random data)
 * - Types mirror production domain types exactly
 * - No runtime dependencies (pure TypeScript helpers)
 */

import type {Invoice, Merchant, Product} from "@/types/invoices";
import type {ContactInformation} from "@/types/invoices/Merchant";
import type {PaymentInformation} from "@/types/invoices/Payment";
import {InvoiceCategory, MerchantCategory, PaymentType, ProductCategory} from "@/types/invoices";
import type {CachedScan, Scan} from "@/types/scans";
import {ScanStatus, ScanType} from "@/types/scans";

/**
 * Utility type to make readonly properties mutable for test fixtures.
 */
type Mutable<T> = {-readonly [K in keyof T]: T[K]};

/**
 * Mock response object matching the Fetch API Response shape.
 *
 * @remarks
 * Used to mock server action responses in tests without requiring actual
 * HTTP calls. Implements the minimal Response interface needed for tests.
 */
export type MockResponse = Readonly<{
  /** True if status is in 200-299 range */
  ok: boolean;
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Async JSON parser returning the mocked data */
  json: () => Promise<unknown>;
  /** Async text parser returning stringified data */
  text: () => Promise<string>;
}>;

/**
 * Creates a mock JSON response for testing server actions.
 *
 * @param data - The data to return from `response.json()`
 * @param init - Optional response configuration
 * @returns A mock Response object with typed data
 *
 * @example
 * ```typescript
 * const invoice = buildInvoice({id: "test-id"});
 * const response = createJsonResponse(invoice, {status: 200});
 *
 * expect(response.ok).toBe(true);
 * await expect(response.json()).resolves.toMatchObject({id: "test-id"});
 * ```
 */
export function createJsonResponse(
  data: unknown,
  init: Readonly<{ok?: boolean; status?: number; statusText?: string; text?: string}> = {},
): MockResponse {
  const status = init.status ?? 200;
  return {
    ok: init.ok ?? status < 400,
    status,
    statusText: init.statusText ?? "OK",
    json: async () => data,
    text: async () => init.text ?? JSON.stringify(data),
  };
}

/**
 * Creates a mock error response for testing failure scenarios.
 *
 * @param text - Error message text
 * @param init - Response configuration (status required)
 * @returns A mock error Response object
 *
 * @example
 * ```typescript
 * const response = createTextResponse("Not found", {status: 404, statusText: "Not Found"});
 *
 * expect(response.ok).toBe(false);
 * await expect(response.text()).resolves.toBe("Not found");
 * ```
 */
export function createTextResponse(
  text: string,
  init: Readonly<{status: number; statusText?: string}>,
): MockResponse {
  return {
    ok: init.status < 400,
    status: init.status,
    statusText: init.statusText ?? "Error",
    json: async () => ({message: text}),
    text: async () => text,
  };
}

/**
 * Builds a test Product fixture with deterministic defaults.
 *
 * @param overrides - Partial product properties to override defaults
 * @returns A complete Product object suitable for testing
 *
 * @example
 * ```typescript
 * const product = buildProduct({name: "Test Item", quantity: 2});
 * expect(product.totalPrice).toBe(10);
 * expect(product.category).toBe(ProductCategory.GROCERIES);
 * ```
 */
export function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    name: "Coffee",
    category: ProductCategory.GROCERIES,
    quantity: 1,
    quantityUnit: "pcs",
    productCode: "",
    price: 10,
    totalPrice: 10,
    detectedAllergens: [],
    metadata: {
      isEdited: false,
      isComplete: true,
      isSoftDeleted: false,
      confidence: 1.0,
    },
    ...overrides,
  };
}

/**
 * Builds a test PaymentInformation fixture with deterministic defaults.
 *
 * @param overrides - Partial payment properties to override defaults
 * @returns A complete PaymentInformation object
 *
 * @example
 * ```typescript
 * const payment = buildPaymentInformation({totalCostAmount: 100});
 * expect(payment.paymentType).toBe(PaymentType.Card);
 * ```
 */
export function buildPaymentInformation(overrides: Partial<PaymentInformation> = {}): PaymentInformation {
  return {
    transactionDate: new Date("2026-01-01T00:00:00.000Z"),
    paymentType: PaymentType.Card,
    currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
    totalCostAmount: 10,
    totalTaxAmount: 2,
    subtotalAmount: 8,
    tipAmount: 0,
    ...overrides,
  };
}

/**
 * Builds a test Invoice fixture with deterministic defaults.
 *
 * @param overrides - Partial invoice properties to override defaults
 * @returns A complete Invoice object suitable for testing
 *
 * @remarks
 * Default invoice includes:
 * - Single product (Coffee, 10 RON)
 * - Card payment
 * - No scans (add via overrides if needed)
 * - Not shared, not deleted
 *
 * @example
 * ```typescript
 * const invoice = buildInvoice({
 *   id: "11111111-1111-4111-8111-111111111111",
 *   name: "Grocery Receipt"
 * });
 *
 * expect(invoice.items).toHaveLength(1);
 * expect(invoice.paymentInformation.totalCostAmount).toBe(10);
 * ```
 */
export function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Test invoice",
    description: "Test invoice description",
    userIdentifier: "user-1",
    sharedWith: [],
    category: InvoiceCategory.GROCERY,
    scans: [],
    paymentInformation: buildPaymentInformation(),
    merchantReference: "merchant-1",
    items: [buildProduct()],
    possibleRecipes: [],
    additionalMetadata: {},
    receiptType: "Itemized",
    countryRegion: "RO",
    taxDetails: [],
    payments: [],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    isDeleted: false,
    ...overrides,
  } as Invoice;
}

/**
 * Builds a test ContactInformation fixture with deterministic defaults.
 *
 * @param overrides - Partial contact properties to override defaults
 * @returns A complete ContactInformation object
 */
export function buildContactInformation(overrides: Partial<ContactInformation> = {}): ContactInformation {
  return {
    fullName: "Test Merchant Corp",
    address: "123 Test Street, Bucharest, Romania",
    phoneNumber: "+40 21 123 4567",
    emailAddress: "contact@testmerchant.ro",
    website: "https://testmerchant.ro",
    ...overrides,
  };
}

/**
 * Builds a test Merchant fixture with deterministic defaults.
 *
 * @param overrides - Partial merchant properties to override defaults
 * @returns A complete Merchant object suitable for testing
 *
 * @example
 * ```typescript
 * const merchant = buildMerchant({
 *   id: "22222222-2222-4222-8222-222222222222",
 *   name: "Lidl"
 * });
 *
 * expect(merchant.category).toBe(MerchantCategory.SUPERMARKET);
 * ```
 */
export function buildMerchant(overrides: Partial<Merchant> = {}): Merchant {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Test merchant",
    description: "Test merchant description",
    category: MerchantCategory.SUPERMARKET,
    address: buildContactInformation(),
    parentCompanyId: "",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    isDeleted: false,
    ...overrides,
  };
}

/**
 * Builds a test Scan fixture with deterministic defaults.
 *
 * @param overrides - Partial scan properties to override defaults
 * @returns A complete Scan object suitable for testing
 *
 * @example
 * ```typescript
 * const scan = buildScan({
 *   id: "scan-1",
 *   scanType: ScanType.PDF
 * });
 *
 * expect(scan.status).toBe(ScanStatus.READY);
 * expect(scan.mimeType).toBe("image/jpeg");
 * ```
 */
export function buildScan(overrides: Partial<Scan> = {}): Scan {
  return {
    id: "scan-1",
    userIdentifier: "user-1",
    name: "receipt.jpg",
    blobUrl: "https://storage.test/invoices/scans/user-1/receipt.jpg",
    mimeType: "image/jpeg",
    sizeInBytes: 1024,
    scanType: ScanType.JPEG,
    uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
    status: ScanStatus.READY,
    metadata: {},
    ...overrides,
  };
}

/**
 * Builds a test CachedScan fixture with deterministic defaults.
 *
 * @param overrides - Partial scan properties to override defaults
 * @returns A complete CachedScan object suitable for testing
 *
 * @example
 * ```typescript
 * const cachedScan = buildCachedScan({id: "cached-scan-1"});
 * expect(cachedScan.cachedAt).toBeInstanceOf(Date);
 * ```
 */
export function buildCachedScan(overrides: Partial<CachedScan> = {}): CachedScan {
  return {
    ...buildScan(),
    cachedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Makes a readonly object mutable for test manipulation.
 *
 * @param value - The readonly object to make mutable
 * @returns A mutable version of the object
 *
 * @remarks
 * Use sparingly—prefer building new objects with overrides.
 * Only use when simulating in-place mutations for specific test scenarios.
 *
 * @example
 * ```typescript
 * const invoice = buildInvoice();
 * const mutableInvoice = mutable(invoice);
 * mutableInvoice.name = "Modified Name"; // Now allowed
 * ```
 */
export function mutable<T>(value: T): Mutable<T> {
  return value as Mutable<T>;
}
