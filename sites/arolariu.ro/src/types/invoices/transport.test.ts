/**
 * @fileoverview Tests for the invoice transport validation boundary.
 * @module types/invoices/transport.test
 *
 * @remarks
 * These tests drive the TDD implementation of `transport.ts`. All fixtures are adapted
 * to the REAL Invoice / Product / Merchant TypeScript types — no field guessing.
 * Zero `any` throughout.
 */

import {describe, expect, it} from "vitest";
import {
  TransportValidationError,
  parseAnalysisAcceptedResponse,
  parseInvoiceResponse,
  parseInvoicesResponse,
  parseMerchantResponse,
  parseProductResponse,
  tryParse,
} from "./transport";

// ---------------------------------------------------------------------------
// Shared test fixtures — adapted to real backend wire shape
// ---------------------------------------------------------------------------

/** A valid UUIDv4 accepted by the existing validateStringIsGuidType helper. */
const TEST_GUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

/**
 * The all-zero sentinel GUID.
 *
 * @remarks
 * The backend emits this for `merchantReference` when no merchant is linked, and for
 * `userIdentifier` on guest invoices. It is neither a v4 nor a v7 UUID, so it only
 * parses because `validateStringIsGuidType` special-cases it. That behaviour is
 * load-bearing for every freshly created invoice.
 */
const EMPTY_GUID_VALUE = "00000000-0000-0000-0000-000000000000";

const validPaymentInfoJson = {
  transactionDate: "2026-08-01T10:00:00Z",
  paymentType: 0,
  currency: {name: "Romanian Leu", code: "RON", symbol: "lei"},
  totalCostAmount: 100,
  totalTaxAmount: 19,
  subtotalAmount: 81,
  tipAmount: 0,
};

const validClassificationJson = {
  system: "ECOICOP_V2",
  version: "2.0",
  code: "01.1.1",
  officialLabel: "Bread and cereals",
  hierarchy: [{level: "division", code: "01", officialLabel: "Food"}],
  origin: "Analysis",
  confidence: 0.87,
  evidence: [{source: "model", value: "bread detected"}],
};

const validInvoiceJson = {
  id: TEST_GUID,
  userIdentifier: TEST_GUID,
  name: "Groceries",
  description: "Weekly shop",
  classification: validClassificationJson,
  scans: [{type: 0, location: "https://example.com/scan.jpg"}],
  paymentInformation: validPaymentInfoJson,
  merchantReference: TEST_GUID,
  items: [],
  possibleRecipes: [],
  additionalMetadata: {},
  receiptType: "Itemized",
  countryRegion: "RO",
  createdAt: "2026-08-01T10:00:00Z",
  lastUpdatedAt: "2026-08-01T10:00:00Z",
};

const validProductJson = {
  name: "Organic Milk",
  category: 300,
  quantity: 2,
  quantityUnit: "pcs",
  productCode: "",
  price: 8.99,
  totalPrice: 17.98,
  detectedAllergens: [],
  metadata: {isEdited: false, isComplete: true, isSoftDeleted: false, confidence: 0.95},
  classification: null,
  allergenAssessment: {
    status: "detected",
    signals: [
      {
        code: "milk",
        evidenceLevel: "explicit",
        confidence: 0.95,
        evidence: [{source: "productLabel", value: "contains milk"}],
      },
    ],
  },
};

const validMerchantJson = {
  id: TEST_GUID,
  name: "Lidl",
  description: "Supermarket chain",
  category: 200,
  address: {
    fullName: "Lidl SRL",
    address: "Str. Test 1",
    phoneNumber: "+40 21 000 0000",
    emailAddress: "contact@lidl.ro",
    website: "https://lidl.ro",
  },
  parentCompanyId: "",
  classification: null,
  createdAt: "2026-08-01T10:00:00Z",
  lastUpdatedAt: "2026-08-01T10:00:00Z",
};

// ---------------------------------------------------------------------------
// parseInvoiceResponse
// ---------------------------------------------------------------------------

describe("parseInvoiceResponse", () => {
  it("parses a valid payload — name and classification.code are correct", () => {
    const invoice = parseInvoiceResponse(validInvoiceJson);
    expect(invoice.name).toBe("Groceries");
    expect(invoice.classification?.code).toBe("01.1.1");
  });

  it("converts timestamps to real Date instances", () => {
    const invoice = parseInvoiceResponse(validInvoiceJson);
    expect(invoice.createdAt).toBeInstanceOf(Date);
    expect(invoice.lastUpdatedAt).toBeInstanceOf(Date);
    expect(invoice.paymentInformation.transactionDate).toBeInstanceOf(Date);
  });

  it("does NOT throw when an unknown additive backend property is present", () => {
    expect(() => parseInvoiceResponse({...validInvoiceJson, futureField: "ignored"})).not.toThrow();
  });

  it("throws TransportValidationError for a missing required field (name)", () => {
    const {name: _n, ...withoutName} = validInvoiceJson;
    expect(() => parseInvoiceResponse(withoutName)).toThrow(TransportValidationError);
  });

  it("throws TransportValidationError for an unrecognised classification system ('UNSPSC')", () => {
    expect(() =>
      parseInvoiceResponse({
        ...validInvoiceJson,
        classification: {...validClassificationJson, system: "UNSPSC"},
      }),
    ).toThrow(TransportValidationError);
  });

  it("accepts classification: null and yields invoice.classification === null", () => {
    const invoice = parseInvoiceResponse({...validInvoiceJson, classification: null});
    expect(invoice.classification).toBeNull();
  });

  it("accepts the empty sentinel GUID for an unlinked merchant", () => {
    // A freshly created invoice has no merchant, so the backend sends Guid.Empty here.
    // This is the common case, not an edge case: rejecting it would break every new invoice.
    const invoice = parseInvoiceResponse({...validInvoiceJson, merchantReference: EMPTY_GUID_VALUE});

    expect(invoice.merchantReference).toBe(EMPTY_GUID_VALUE);
  });

  it("accepts the empty sentinel GUID for a guest user identifier", () => {
    const invoice = parseInvoiceResponse({...validInvoiceJson, userIdentifier: EMPTY_GUID_VALUE});

    expect(invoice.userIdentifier).toBe(EMPTY_GUID_VALUE);
  });

  it("still rejects a malformed identifier that is not a GUID at all", () => {
    expect(() => parseInvoiceResponse({...validInvoiceJson, merchantReference: "not-a-guid"})).toThrow(
      TransportValidationError,
    );
  });
});

// ---------------------------------------------------------------------------
// parseAnalysisAcceptedResponse
// ---------------------------------------------------------------------------

describe("parseAnalysisAcceptedResponse", () => {
  it("returns the bare string message id as-is", () => {
    expect(parseAnalysisAcceptedResponse("abc-123")).toBe("abc-123");
  });

  it("throws TransportValidationError for an object body (wrong contract)", () => {
    expect(() => parseAnalysisAcceptedResponse({messageId: "abc-123"})).toThrow(TransportValidationError);
  });

  it("throws TransportValidationError for an empty string", () => {
    expect(() => parseAnalysisAcceptedResponse("")).toThrow(TransportValidationError);
  });
});

// ---------------------------------------------------------------------------
// tryParse
// ---------------------------------------------------------------------------

describe("tryParse", () => {
  it("returns {ok:false} and does NOT throw for invalid input", () => {
    expect(() => tryParse(parseInvoiceResponse, {})).not.toThrow();
    const result = tryParse(parseInvoiceResponse, {});
    expect(result.ok).toBe(false);
  });

  it("returns {ok:true, value} for valid input", () => {
    const result = tryParse(parseInvoiceResponse, validInvoiceJson);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("Groceries");
    }
  });
});

// ---------------------------------------------------------------------------
// parseInvoicesResponse
// ---------------------------------------------------------------------------

describe("parseInvoicesResponse", () => {
  it("returns a readonly array of invoices for a valid input", () => {
    const invoices = parseInvoicesResponse([validInvoiceJson]);
    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.name).toBe("Groceries");
  });

  it("throws TransportValidationError when one element of the array is malformed", () => {
    expect(() => parseInvoicesResponse([validInvoiceJson, {invalid: true}])).toThrow(TransportValidationError);
  });
});

// ---------------------------------------------------------------------------
// parseProductResponse
// ---------------------------------------------------------------------------

describe("parseProductResponse", () => {
  it("accepts a valid product with a non-null allergenAssessment", () => {
    const product = parseProductResponse(validProductJson);
    expect(product.name).toBe("Organic Milk");
    expect(product.allergenAssessment).not.toBeNull();
  });

  it("throws TransportValidationError for a malformed product (missing name)", () => {
    const {name: _n, ...withoutName} = validProductJson;
    expect(() => parseProductResponse(withoutName)).toThrow(TransportValidationError);
  });
});

// ---------------------------------------------------------------------------
// parseMerchantResponse
// ---------------------------------------------------------------------------

describe("parseMerchantResponse", () => {
  it("accepts a valid merchant and returns the correct name", () => {
    const merchant = parseMerchantResponse(validMerchantJson);
    expect(merchant.name).toBe("Lidl");
  });
});
