/**
 * @fileoverview Native-boundary tests for the strict invoice PATCH action.
 * @module app/domains/invoices/_actions/invoices/patchInvoice.test
 */

import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {ClassificationSystem} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {patchInvoice} from "./patchInvoice";

const invoiceId = "11111111-1111-4111-8111-111111111111";

function createCompleteInvoiceResponse(): Response {
  return Response.json(
    {
      id: invoiceId,
      userIdentifier: "22222222-2222-7222-8222-222222222222",
      sharedWith: [],
      name: "Updated Invoice",
      description: "",
      classification: null,
      scans: [],
      paymentInformation: {
        transactionDate: "2026-08-17T12:30:00+00:00",
        paymentType: 200,
        currency: {name: "Romanian Leu", code: "RON", symbol: "lei"},
        totalCostAmount: 10,
        totalTaxAmount: 1,
        subtotalAmount: 9,
        tipAmount: 0,
      },
      merchantReference: "00000000-0000-0000-0000-000000000000",
      items: [],
      possibleRecipes: [],
      additionalMetadata: {},
      receiptType: "",
      countryRegion: "",
      taxDetails: [],
      payments: [],
      isImportant: false,
      isSoftDeleted: false,
      createdAt: "2026-08-17T12:00:00+00:00",
      createdBy: "22222222-2222-7222-8222-222222222222",
      lastUpdatedAt: "2026-08-17T12:00:00+00:00",
      lastUpdatedBy: "22222222-2222-7222-8222-222222222222",
      numberOfUpdates: 0,
    },
    {status: 202},
  );
}

describe("patchInvoice", () => {
  it("rejects null outer input without crossing the authentication or network boundary", async () => {
    // Act
    const result = await patchInvoice(null);

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });

  it("rejects unknown payload keys and malformed manual classifications", async () => {
    // Act
    const unknownKeyResult = await patchInvoice({
      invoiceId,
      payload: {category: 100},
    });
    const malformedClassificationResult = await patchInvoice({
      invoiceId,
      payload: {
        classification: {
          system: ClassificationSystem.EcoicopV2,
          code: "01.1",
          officialLabel: "Food",
        },
      },
    });

    // Assert
    expect(unknownKeyResult).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(malformedClassificationResult).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });

  it("sends an exact valid PATCH and accepts only a complete validated invoice response", async () => {
    // Arrange
    installAnalysisFetchHandler((request) => {
      if (request.url === `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}`) {
        return createCompleteInvoiceResponse();
      }

      return new Response("Unexpected request", {status: 500});
    });
    const payload = {
      name: "Updated Invoice",
      classification: {system: ClassificationSystem.EcoicopV2, code: "01.1"},
    } as const;

    // Act
    const result = await patchInvoice({invoiceId, payload});

    // Assert
    expect(result).toMatchObject({success: true, data: {id: invoiceId, name: "Updated Invoice"}});
    expect(getAnalysisApiRequests()).toContainEqual({
      url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}`,
      init: expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    });
  });

  it("returns a safe server result when the complete response shape is malformed", async () => {
    // Arrange
    installAnalysisFetchHandler((request) =>
      request.url === `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}`
        ? Response.json({id: invoiceId, name: "Updated Invoice", description: ""}, {status: 202})
        : new Response("Unexpected request", {status: 500}),
    );

    // Act
    const result = await patchInvoice({invoiceId, payload: {}});

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "SERVER_ERROR"}});
  });

  it("maps backend rejections to a safe status-derived error", async () => {
    // Arrange
    installAnalysisFetchHandler((request) =>
      request.url === `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}`
        ? new Response("private backend detail", {status: 500, statusText: "Internal Server Error"})
        : new Response("Unexpected request", {status: 500}),
    );

    // Act
    const result = await patchInvoice({invoiceId, payload: {}});

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {code: "SERVER_ERROR", message: "A server error occurred. Please try again later."},
    });
  });
});
