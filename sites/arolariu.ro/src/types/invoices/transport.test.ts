import {describe, expect, it} from "vitest";
import {parseInvoiceTransport} from "./transport";

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
});
