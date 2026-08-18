import {describe, expect, it} from "vitest";
import {parseInvoiceTransport, parseMerchantTransport} from "./transport";

const richInvoiceResponse = {
  id: "11111111-1111-7111-8111-111111111111",
  userIdentifier: "22222222-2222-7222-8222-222222222222",
  sharedWith: ["33333333-3333-7333-8333-333333333333"],
  name: "Bakery receipt",
  description: "Wholemeal bread",
  classification: {
    system: "ECOICOP_V2",
    version: "2026.08",
    code: "01.1",
    officialLabel: "Food",
    hierarchy: [{level: "division", code: "01.1", officialLabel: "Food"}],
    origin: "Analysis",
    confidence: 0.97,
    evidence: [{source: "receipt", value: "Wholemeal bread"}],
  },
  scans: [{type: 3, location: "https://example.test/receipt.pdf"}],
  paymentInformation: {
    transactionDate: "2026-08-17T12:30:00+00:00",
    paymentType: 200,
    currency: {name: "Romanian Leu", code: "RON", symbol: "lei"},
    totalCostAmount: 12.5,
    totalTaxAmount: 2,
    subtotalAmount: 10,
    tipAmount: 0.5,
  },
  merchantReference: "44444444-4444-7444-8444-444444444444",
  items: [
    {
      name: "Wholemeal bread",
      classification: {
        system: "GS1_GPC",
        version: "2026.08",
        code: "10000045",
        officialLabel: "Bread",
        hierarchy: [{level: "segment", code: "10000045", officialLabel: "Bread"}],
        origin: "Manual",
        confidence: null,
        evidence: [],
      },
      quantity: 1,
      quantityUnit: "pcs",
      productCode: "5940000000001",
      price: 12.5,
      totalPrice: 12.5,
      allergenAssessment: {
        status: "detected",
        signals: [
          {
            code: "cerealsContainingGluten",
            evidenceLevel: "explicit",
            confidence: 0.99,
            evidence: [{source: "ingredient.label", value: "Contains wheat"}],
          },
        ],
      },
      metadata: {isEdited: true, isComplete: true, isSoftDeleted: false, confidence: 0.99},
    },
  ],
  possibleRecipes: [
    {
      name: "Toast",
      description: "A simple toast.",
      servings: 1,
      preparationMinutes: 1,
      cookingMinutes: 2,
      totalMinutes: 3,
      difficulty: "easy",
      purchasedIngredients: [{name: "Bread", quantity: "2 slices", preparation: null}],
      assumedPantryStaples: [{name: "Salt", quantity: "a pinch", preparation: "Optional"}],
      missingOptionalIngredients: [{name: "Butter", quantity: "1 tsp", preparation: null}],
      steps: [{sequence: 1, instruction: "Toast the bread.", notes: null}],
      allergenWarnings: ["cerealsContainingGluten"],
    },
  ],
  additionalMetadata: {"user.note": "Use before Friday", "user.optional": null},
  receiptType: "Itemized",
  countryRegion: "RO",
  taxDetails: [{amount: 2, rate: 19, netAmount: 10, description: "VAT"}],
  payments: [{method: "Credit Card", amount: 12.5}],
  isImportant: true,
  isSoftDeleted: false,
  createdAt: "2026-08-17T12:00:00+00:00",
  createdBy: "22222222-2222-7222-8222-222222222222",
  lastUpdatedAt: "2026-08-18T12:00:00+00:00",
  lastUpdatedBy: "55555555-5555-7555-8555-555555555555",
  numberOfUpdates: 7,
};

const richMerchantResponse = {
  id: "66666666-6666-7666-8666-666666666666",
  name: "Bakery",
  description: "A local bakery",
  classification: null,
  address: {
    fullName: "Bakery SRL",
    address: "Main Street 1",
    phoneNumber: "",
    emailAddress: "",
    website: "",
  },
  parentCompanyId: "00000000-0000-0000-0000-000000000000",
  referencedInvoiceCount: 1,
  referencedInvoiceIds: ["11111111-1111-7111-8111-111111111111"],
  additionalMetadata: {},
  isImportant: false,
  isSoftDeleted: false,
  createdAt: "2026-08-17T12:00:00+00:00",
  createdBy: "00000000-0000-0000-0000-000000000000",
  lastUpdatedAt: "2026-08-18T12:00:00+00:00",
  lastUpdatedBy: "77777777-7777-7777-8777-777777777777",
  numberOfUpdates: 2,
};

describe("parseInvoiceTransport", () => {
  it("parses the complete rich API DTO and converts timestamps to dates", () => {
    const invoice = parseInvoiceTransport(richInvoiceResponse);

    expect(invoice?.createdAt).toBeInstanceOf(Date);
    expect(invoice?.paymentInformation.transactionDate).toBeInstanceOf(Date);
    expect(invoice?.items[0]?.allergenAssessment?.signals[0]?.evidenceLevel).toBe("explicit");
    expect(invoice?.possibleRecipes[0]?.steps[0]?.sequence).toBe(1);
  });

  it("rejects unknown and missing nested transport keys", () => {
    expect(parseInvoiceTransport({...richInvoiceResponse, unexpected: true})).toBeNull();
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        items: [
          {
            ...richInvoiceResponse.items[0],
            allergenAssessment: {status: "detected"},
          },
        ],
      }),
    ).toBeNull();
  });

  it("rejects malformed GUIDs while allowing documented empty references", () => {
    expect(parseInvoiceTransport({...richInvoiceResponse, id: "invoice-001"})).toBeNull();
    expect(parseInvoiceTransport({...richInvoiceResponse, userIdentifier: "user-001"})).toBeNull();
    expect(parseInvoiceTransport({...richInvoiceResponse, sharedWith: ["shared-user-001"]})).toBeNull();
    expect(parseInvoiceTransport({...richInvoiceResponse, merchantReference: "merchant-001"})).toBeNull();
    expect(parseInvoiceTransport({...richInvoiceResponse, createdBy: "creator-001"})).toBeNull();
    expect(parseInvoiceTransport({...richInvoiceResponse, lastUpdatedBy: "editor-001"})).toBeNull();

    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        userIdentifier: "00000000-0000-0000-0000-000000000000",
        merchantReference: "00000000-0000-0000-0000-000000000000",
        createdBy: "00000000-0000-0000-0000-000000000000",
      }),
    ).not.toBeNull();
  });

  it("rejects negative currency, payment, tax, and product values", () => {
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        paymentInformation: {...richInvoiceResponse.paymentInformation, totalCostAmount: -0.01},
      }),
    ).toBeNull();
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        taxDetails: [{...richInvoiceResponse.taxDetails[0], amount: -0.01}],
      }),
    ).toBeNull();
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        payments: [{...richInvoiceResponse.payments[0], amount: -0.01}],
      }),
    ).toBeNull();
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        items: [{...richInvoiceResponse.items[0], quantity: -1}],
      }),
    ).toBeNull();
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        items: [{...richInvoiceResponse.items[0], price: -1}],
      }),
    ).toBeNull();
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        items: [{...richInvoiceResponse.items[0], totalPrice: -1}],
      }),
    ).toBeNull();
  });

  it("does not invent a tax-rate relationship that the backend does not enforce", () => {
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        taxDetails: [{...richInvoiceResponse.taxDetails[0], rate: -5}],
      }),
    ).not.toBeNull();
  });

  it("rejects non-finite and out-of-domain decimal JSON values", () => {
    const infinityEquivalent: unknown = JSON.parse("1e999");

    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        paymentInformation: {...richInvoiceResponse.paymentInformation, totalCostAmount: Number.NaN},
      }),
    ).toBeNull();
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        paymentInformation: {...richInvoiceResponse.paymentInformation, totalCostAmount: Number.POSITIVE_INFINITY},
      }),
    ).toBeNull();
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        paymentInformation: {...richInvoiceResponse.paymentInformation, totalCostAmount: infinityEquivalent},
      } as unknown),
    ).toBeNull();
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        paymentInformation: {...richInvoiceResponse.paymentInformation, totalCostAmount: Number.MAX_VALUE},
      }),
    ).toBeNull();
  });

  it("rejects a line total that the backend could not have computed", () => {
    expect(
      parseInvoiceTransport({
        ...richInvoiceResponse,
        items: [{...richInvoiceResponse.items[0], totalPrice: 11}],
      }),
    ).toBeNull();
  });

  it("validates every exposed merchant and invoice-reference GUID", () => {
    expect(parseMerchantTransport(richMerchantResponse)?.id).toBe(richMerchantResponse.id);
    expect(parseMerchantTransport({...richMerchantResponse, id: "merchant-001"})).toBeNull();
    expect(parseMerchantTransport({...richMerchantResponse, parentCompanyId: "parent-001"})).toBeNull();
    expect(parseMerchantTransport({...richMerchantResponse, referencedInvoiceIds: ["invoice-001"]})).toBeNull();
    expect(parseMerchantTransport({...richMerchantResponse, createdBy: "creator-001"})).toBeNull();
    expect(parseMerchantTransport({...richMerchantResponse, lastUpdatedBy: "editor-001"})).toBeNull();
  });
});
