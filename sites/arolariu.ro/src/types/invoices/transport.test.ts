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
  parseInvoiceCreationResponse,
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
  isImportant: false,
  isSoftDeleted: false,
};

const validProductJson = {
  name: "Organic Milk",
  quantity: 2,
  quantityUnit: "pcs",
  productCode: "",
  price: 8.99,
  totalPrice: 17.98,
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
  isImportant: false,
  isSoftDeleted: false,
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

  describe("parseInvoiceCreationResponse", () => {
    it("accepts the empty name emitted before invoice enrichment", () => {
      const invoice = parseInvoiceCreationResponse({...validInvoiceJson, name: ""});

      expect(invoice.name).toBe("");
      expect(invoice.createdAt).toBeInstanceOf(Date);
    });

    it("keeps regular invoice parsing strict for an empty name", () => {
      expect(() => parseInvoiceResponse({...validInvoiceJson, name: ""})).toThrow(
        new TransportValidationError("invoice.name", "expected non-empty string"),
      );
    });

    it("still rejects a missing name from a creation response", () => {
      const {name: _name, ...withoutName} = validInvoiceJson;

      expect(() => parseInvoiceCreationResponse(withoutName)).toThrow(new TransportValidationError("invoice.name", "expected string"));
    });
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
    expect(() => parseInvoiceResponse({...validInvoiceJson, merchantReference: "not-a-guid"})).toThrow(TransportValidationError);
  });

  it.each(["isImportant", "isSoftDeleted"] as const)("rejects a missing required boolean field: %s", (field) => {
    const {[field]: _omitted, ...withoutField} = validInvoiceJson;
    expect(() => parseInvoiceResponse(withoutField)).toThrow(TransportValidationError);
  });

  it.each(["isImportant", "isSoftDeleted"] as const)("rejects a malformed required boolean field: %s", (field) => {
    expect(() => parseInvoiceResponse({...validInvoiceJson, [field]: "false"})).toThrow(TransportValidationError);
  });

  it.each(["description", "receiptType", "countryRegion", "createdBy", "lastUpdatedBy"] as const)(
    "rejects a malformed present optional string field: %s",
    (field) => {
      expect(() => parseInvoiceResponse({...validInvoiceJson, [field]: 123})).toThrow(TransportValidationError);
    },
  );

  it("rejects a malformed sharedWith entry instead of filtering it out", () => {
    expect(() => parseInvoiceResponse({...validInvoiceJson, sharedWith: ["user-1", {unexpected: true}]})).toThrow(
      new TransportValidationError("invoice.sharedWith[1]", "expected string"),
    );
  });

  it("rejects a malformed tax detail instead of dropping it", () => {
    expect(() =>
      parseInvoiceResponse({
        ...validInvoiceJson,
        taxDetails: [{amount: "12.5", rate: 0.19, netAmount: 10.5, description: "VAT"}],
      }),
    ).toThrow(new TransportValidationError("invoice.taxDetails[0].amount", "expected finite number"));
  });

  it("rejects a malformed payment detail instead of dropping it", () => {
    expect(() =>
      parseInvoiceResponse({
        ...validInvoiceJson,
        payments: [{method: "card", amount: "100"}],
      }),
    ).toThrow(new TransportValidationError("invoice.payments[0].amount", "expected finite number"));
  });

  it.each(["seven", -1, 1.5])("rejects a malformed present numberOfUpdates value: %j", (numberOfUpdates) => {
    expect(() => parseInvoiceResponse({...validInvoiceJson, numberOfUpdates})).toThrow(
      new TransportValidationError("invoice.numberOfUpdates", "expected non-negative safe integer or null"),
    );
  });

  it("preserves valid optional collections and audit fields", () => {
    const invoice = parseInvoiceResponse({
      ...validInvoiceJson,
      sharedWith: ["user-1"],
      taxDetails: [{amount: 19, rate: 0.19, netAmount: 81, description: "VAT"}],
      payments: [{method: "card", amount: 100}],
      createdBy: "user-1",
      lastUpdatedBy: "user-2",
      numberOfUpdates: 2,
    });

    expect(invoice.sharedWith).toEqual(["user-1"]);
    expect(invoice.taxDetails).toEqual([{amount: 19, rate: 0.19, netAmount: 81, description: "VAT"}]);
    expect(invoice.payments).toEqual([{method: "card", amount: 100}]);
    expect(invoice.createdBy).toBe("user-1");
    expect(invoice.lastUpdatedBy).toBe("user-2");
    expect(invoice.numberOfUpdates).toBe(2);
  });

  it("rejects malformed scan metadata values instead of deleting them", () => {
    expect(() =>
      parseInvoiceResponse({
        ...validInvoiceJson,
        scans: [{type: 0, location: "https://example.com/scan.jpg", metadata: {rotation: 90}}],
      }),
    ).toThrow(new TransportValidationError("invoice.scans[0].metadata.rotation", "expected string or object"));
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

  it.each(["isImportant", "isSoftDeleted"] as const)("rejects a missing required boolean field: %s", (field) => {
    const {[field]: _omitted, ...withoutField} = validMerchantJson;
    expect(() => parseMerchantResponse(withoutField)).toThrow(TransportValidationError);
  });

  it.each(["isImportant", "isSoftDeleted"] as const)("rejects a malformed required boolean field: %s", (field) => {
    expect(() => parseMerchantResponse({...validMerchantJson, [field]: "false"})).toThrow(TransportValidationError);
  });

  it.each(["description", "parentCompanyId", "createdBy", "lastUpdatedBy"] as const)(
    "rejects a malformed present optional string field: %s",
    (field) => {
      expect(() => parseMerchantResponse({...validMerchantJson, [field]: 123})).toThrow(TransportValidationError);
    },
  );

  it.each(["seven", -1, 1.5])("rejects a malformed present numberOfUpdates value: %j", (numberOfUpdates) => {
    expect(() => parseMerchantResponse({...validMerchantJson, numberOfUpdates})).toThrow(
      new TransportValidationError("merchant.numberOfUpdates", "expected non-negative safe integer or null"),
    );
  });
});
