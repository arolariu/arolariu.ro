/**
 * @fileoverview Deterministic test builders for invoice domain entities.
 * @module tests/helpers/builders/domain
 *
 * @remarks
 * Provides deterministic, test-only builders for creating invoice domain entities.
 * These builders are designed for predictable test scenarios with stable default values.
 *
 * **Design Principles:**
 * - All builders accept partial overrides for flexibility
 * - Default values are deterministic (no random data, stable dates)
 * - Types mirror production domain types exactly
 * - No runtime dependencies (pure TypeScript helpers)
 * - Builders are test-only and must not be imported in production code
 *
 * **Builder Coverage:**
 * - Core entities: Product, Merchant, Invoice, Scan
 * - Value objects: InvoiceScan, Recipe, PaymentInformation
 * - DTOs: CreateInvoiceDtoPayload, CreateInvoiceScanDtoPayload
 * - Enums: InvoiceAnalysisOptions
 *
 * **Usage Context:**
 * - Import builders in `.test.ts` files for invoice/merchant/product/scan tests
 * - Use for unit tests, integration tests, and mock data generation
 * - Complement existing `invoiceDomain.ts` helpers (backward compatible)
 *
 * @example
 * ```typescript
 * import {TestDataBuilder} from '@/tests/helpers';
 *
 * describe('Invoice processing', () => {
 *   it('calculates total correctly', () => {
 *     const product1 = buildProduct({price: 10, quantity: 2});
 *     const product2 = buildProduct({price: 5, quantity: 3});
 *     const invoice = buildInvoice({items: [product1, product2]});
 *
 *     expect(calculateTotal(invoice)).toBe(35);
 *   });
 * });
 * ```
 */

import type {
  ContactInformation,
  CreateInvoiceDtoPayload,
  CreateInvoiceScanDtoPayload,
  Invoice,
  InvoiceScan,
  Merchant,
  PaymentInformation,
  Product,
  RecipeSuggestion,
} from "../../../src/types/invoices";
import {InvoiceScanType, PaymentType, RecipeDifficulty} from "../../../src/types/invoices";
import type {Scan} from "../../../src/types/scans";
import {ScanStatus, ScanType} from "../../../src/types/scans";

/**
 * Deterministic date constant for test stability.
 *
 * @remarks
 * All builders use this date by default to ensure predictable test outcomes.
 * Set to a fixed point in time (2026-01-01T00:00:00.000Z).
 */
const TEST_DATE = new Date("2026-01-01T00:00:00.000Z");

/**
 * Builds a test Product with deterministic defaults.
 *
 * @param overrides - Partial product properties to override defaults
 * @returns A complete Product object suitable for testing
 *
 * @remarks
 * **Default Values:**
 * - name: "Test Product"
 * - category: GROCERIES
 * - quantity: 1
 * - price: 10.00
 * - Full metadata with confidence: 1.0
 *
 * **Use Cases:**
 * - Invoice line items
 * - Product listing tests
 * - Price calculation tests
 *
 * @example
 * ```typescript
 * const product = buildProduct({name: "Milk", price: 5.50, quantity: 2});
 * expect(product.totalPrice).toBe(11.00);
 * expect(product.category).toBe(ProductCategory.GROCERIES);
 * ```
 */
export function buildProduct(overrides: Partial<Product> = {}): Product {
  const quantity = overrides.quantity ?? 1;
  const price = overrides.price ?? 10;
  const totalPrice = overrides.totalPrice ?? price * quantity;

  return {
    name: "Test Product",
    quantity,
    quantityUnit: "pcs",
    productCode: "",
    price,
    totalPrice,
    metadata: {
      isEdited: false,
      isComplete: true,
      isSoftDeleted: false,
      confidence: 1.0,
    },
    classification: null,
    allergenAssessment: null,
    ...overrides,
  };
}

/**
 * Builds test ContactInformation with deterministic defaults.
 *
 * @param overrides - Partial contact properties to override defaults
 * @returns A complete ContactInformation object
 *
 * @remarks
 * Helper for building Merchant address information.
 *
 * @example
 * ```typescript
 * const contact = buildContactInformation({fullName: "Lidl Romania"});
 * expect(contact.address).toBe("123 Test Street, Test City");
 * ```
 */
function buildContactInformation(overrides: Partial<ContactInformation> = {}): ContactInformation {
  return {
    fullName: "Test Merchant",
    address: "123 Test Street, Test City",
    phoneNumber: "+40 21 123 4567",
    emailAddress: "contact@testmerchant.test",
    website: "https://testmerchant.test",
    ...overrides,
  };
}

/**
 * Builds a test Merchant with deterministic defaults.
 *
 * @param overrides - Partial merchant properties to override defaults
 * @returns A complete Merchant object suitable for testing
 *
 * @remarks
 * **Default Values:**
 * - id: "merchant-test-001"
 * - name: "Test Merchant"
 * - category: SUPERMARKET
 * - Complete contact information
 * - Full IAuditable fields
 *
 * **Use Cases:**
 * - Invoice merchant references
 * - Merchant management tests
 * - Filter/search tests
 *
 * @example
 * ```typescript
 * const merchant = buildMerchant({
 *   id: "merchant-1",
 *   name: "Local Shop",
 *   category: MerchantCategory.LOCAL_SHOP
 * });
 * expect(merchant.category).toBe(MerchantCategory.LOCAL_SHOP);
 * ```
 */
export function buildMerchant(overrides: Partial<Merchant> = {}): Merchant {
  return {
    id: "merchant-test-001",
    name: "Test Merchant",
    description: "Test merchant description",
    address: buildContactInformation(),
    parentCompanyId: "",
    createdAt: TEST_DATE,
    createdBy: "test-user",
    lastUpdatedAt: TEST_DATE,
    lastUpdatedBy: "test-user",
    numberOfUpdates: 0,
    isImportant: false,
    isSoftDeleted: false,
    classification: null,
    ...overrides,
  };
}

/**
 * Builds a test InvoiceScan with deterministic defaults.
 *
 * @param overrides - Partial scan properties to override defaults
 * @returns A complete InvoiceScan object
 *
 * @remarks
 * **Default Values:**
 * - scanType: JPEG
 * - location: "https://storage.test/invoice-scan.jpg"
 * - Empty metadata
 *
 * **Use Cases:**
 * - Invoice scan attachments
 * - OCR processing tests
 * - File upload tests
 *
 * @example
 * ```typescript
 * const scan = buildInvoiceScan({
 *   location: "https://cdn.test/receipt.pdf",
 *   scanType: InvoiceScanType.PDF
 * });
 * expect(scan.scanType).toBe(InvoiceScanType.PDF);
 * ```
 */
export function buildInvoiceScan(overrides: Partial<InvoiceScan> = {}): InvoiceScan {
  return {
    type: InvoiceScanType.JPEG,
    location: "https://storage.test/invoice-scan.jpg",
    metadata: {},
    ...overrides,
  };
}

/**
 * Builds test PaymentInformation with deterministic defaults.
 *
 * @param overrides - Partial payment properties to override defaults
 * @returns A complete PaymentInformation object
 *
 * @remarks
 * **Default Values:**
 * - transactionDate: TEST_DATE (2026-01-01)
 * - paymentType: Card
 * - currency: RON (Romanian Leu)
 * - totalCostAmount: 10.00
 * - totalTaxAmount: 2.00
 *
 * @example
 * ```typescript
 * const payment = buildPaymentInformation({
 *   totalCostAmount: 100,
 *   paymentType: PaymentType.Cash
 * });
 * expect(payment.currency.code).toBe("RON");
 * ```
 */
function buildPaymentInformation(overrides: Partial<PaymentInformation> = {}): PaymentInformation {
  return {
    transactionDate: TEST_DATE,
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
 * Builds a minimal valid test RecipeSuggestion with deterministic defaults.
 *
 * @param overrides - Partial recipe suggestion properties to override defaults
 * @returns A complete RecipeSuggestion object suitable for testing
 *
 * @remarks
 * Mirrors `RecipeSuggestionResponseDto` field-for-field.
 * `steps` contains exactly one entry to satisfy the backend invariant.
 */
export function buildRecipeSuggestion(overrides: Partial<RecipeSuggestion> = {}): RecipeSuggestion {
  return {
    name: "Test Recipe Suggestion",
    description: "",
    servings: 2,
    preparationMinutes: 10,
    cookingMinutes: 15,
    totalMinutes: 25,
    difficulty: RecipeDifficulty.Easy,
    purchasedIngredients: [],
    assumedPantryStaples: [],
    missingOptionalIngredients: [],
    steps: [{sequence: 1, instruction: "Cook everything.", notes: null}],
    allergenWarnings: [],
    ...overrides,
  };
}

/**
 * Builds a test Invoice with deterministic defaults.
 *
 * @param overrides - Partial invoice properties to override defaults
 * @returns A complete Invoice object suitable for testing
 *
 * @remarks
 * **Default Values:**
 * - id: "invoice-test-001"
 * - name: "Test Invoice"
 * - category: GROCERY
 * - Single product (Test Product, 10.00 RON)
 * - Card payment
 * - Single scan
 * - Full IAuditable fields
 * - Empty possibleRecipes
 *
 * **Use Cases:**
 * - Invoice processing tests
 * - API endpoint tests
 * - Business logic validation
 *
 * @example
 * ```typescript
 * const invoice = buildInvoice({
 *   id: "invoice-1",
 *   merchantReference: "merchant-1",
 *   items: [buildProduct({name: "Milk", price: 5})],
 *   scans: [buildInvoiceScan()],
 *   possibleRecipes: [buildRecipe()]
 * });
 * expect(invoice.items).toHaveLength(1);
 * expect(invoice.paymentInformation.totalCostAmount).toBe(10);
 * ```
 */
export function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "invoice-test-001",
    name: "Test Invoice",
    description: "Test invoice description",
    userIdentifier: "test-user",
    sharedWith: [],
    scans: [buildInvoiceScan()],
    paymentInformation: buildPaymentInformation(),
    merchantReference: "merchant-test-001",
    items: [buildProduct()],
    possibleRecipes: [],
    classification: null,
    additionalMetadata: {},
    receiptType: "Itemized",
    countryRegion: "RO",
    taxDetails: [],
    payments: [],
    createdAt: TEST_DATE,
    createdBy: "test-user",
    lastUpdatedAt: TEST_DATE,
    lastUpdatedBy: "test-user",
    numberOfUpdates: 0,
    isImportant: false,
    isSoftDeleted: false,
    ...overrides,
  };
}

/**
 * Builds a CreateInvoiceScanDtoPayload with deterministic defaults.
 *
 * @param overrides - Partial payload properties to override defaults
 * @returns A complete CreateInvoiceScanDtoPayload
 *
 * @remarks
 * **Default Values:**
 * - type: JPEG
 * - location: "https://storage.test/invoice-scan.jpg"
 * - Empty additionalMetadata
 *
 * **Use Cases:**
 * - API payload tests
 * - Server action tests
 * - Scan upload tests
 *
 * @example
 * ```typescript
 * const payload = buildCreateInvoiceScanPayload({
 *   type: InvoiceScanType.PDF,
 *   location: "https://cdn.test/scan.pdf"
 * });
 * expect(payload.type).toBe(InvoiceScanType.PDF);
 * ```
 */
export function buildCreateInvoiceScanPayload(overrides: Partial<CreateInvoiceScanDtoPayload> = {}): CreateInvoiceScanDtoPayload {
  return {
    type: InvoiceScanType.JPEG,
    location: "https://storage.test/invoice-scan.jpg",
    additionalMetadata: {},
    ...overrides,
  };
}

/**
 * Builds a CreateInvoiceDtoPayload with deterministic defaults.
 *
 * @param overrides - Partial payload properties to override defaults
 * @returns A complete CreateInvoiceDtoPayload
 *
 * @remarks
 * **Default Values:**
 * - userIdentifier: "test-user"
 * - initialScan: Default InvoiceScan
 * - metadata: Empty object
 *
 * **Use Cases:**
 * - API create invoice tests
 * - Server action tests
 * - Invoice creation validation
 *
 * @example
 * ```typescript
 * const payload = buildCreateInvoicePayload({
 *   userIdentifier: "user-123",
 *   metadata: {isImportant: "true"}
 * });
 * expect(payload.initialScan.location).toBe("https://storage.test/invoice-scan.jpg");
 * ```
 */
export function buildCreateInvoicePayload(overrides: Partial<CreateInvoiceDtoPayload> = {}): CreateInvoiceDtoPayload {
  return {
    userIdentifier: "test-user",
    initialScan: buildInvoiceScan(),
    metadata: {
      isImportant: "false",
      requiresAnalysis: "false",
    },
    ...overrides,
  };
}

/**
 * Builds a standalone Scan with deterministic defaults.
 *
 * @param overrides - Partial scan properties to override defaults
 * @returns A complete Scan object
 *
 * @remarks
 * **Default Values:**
 * - id: "scan-test-001"
 * - userIdentifier: "test-user"
 * - name: "test-scan.jpg"
 * - scanType: JPEG
 * - status: READY
 * - uploadedAt: TEST_DATE
 * - Canonical typed metadata with required fields
 *
 * **Use Cases:**
 * - Scan management tests
 * - Upload workflow tests
 * - Scan list/filter tests
 *
 * @example
 * ```typescript
 * const scan = buildScan({
 *   id: "scan-1",
 *   metadata: {collectionName: "custom-collection"}
 * });
 * expect(scan.id).toBe("scan-1");
 * expect(scan.status).toBe(ScanStatus.READY);
 * expect(scan.metadata.collectionName).toBe("custom-collection");
 * ```
 */
export function buildScan(overrides: Partial<Scan> = {}): Scan {
  return {
    id: "scan-test-001",
    userIdentifier: "test-user",
    name: "test-scan.jpg",
    blobUrl: "https://storage.test/scans/test-user/test-scan.jpg",
    mimeType: "image/jpeg",
    sizeInBytes: 1024,
    scanType: ScanType.JPEG,
    uploadedAt: TEST_DATE,
    status: ScanStatus.READY,
    metadata: {
      scanId: "scan-test-001",
      ownerId: "test-user",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedAt: TEST_DATE,
      uploadedBy: "test-user",
    },
    ...overrides,
  };
}
