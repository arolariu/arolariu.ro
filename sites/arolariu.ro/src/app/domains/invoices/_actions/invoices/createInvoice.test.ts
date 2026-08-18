/**
 * @fileoverview Native-boundary tests for strict invoice creation.
 * @module app/domains/invoices/_actions/invoices/createInvoice.test
 */

import {
  ANALYSIS_API_URL,
  getAnalysisApiRequests,
  installAnalysisFetchHandler,
  type AnalysisFetchRequest,
} from "@/../tests/helpers/analysisBoundary";
import {createInvoiceBuilder} from "@/data/mocks/invoice";
import {ClassificationSystem, InvoiceScanType, PaymentType, type CreateInvoiceDtoPayload} from "@/types/invoices";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createInvoice} from "./createInvoice";

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
let apiHandler: (request: AnalysisFetchRequest) => Response | Promise<Response>;

function createPayload(overrides: Partial<CreateInvoiceDtoPayload> = {}): CreateInvoiceDtoPayload {
  return {
    name: "Weekly groceries",
    description: "User-entered receipt note",
    classification: {system: ClassificationSystem.EcoicopV2, code: "01.1"},
    paymentInformation: {
      transactionDate: new Date("2026-08-18T00:00:00.000Z"),
      paymentType: PaymentType.Card,
      currency: {name: "Romanian Leu", code: "RON", symbol: "lei"},
      totalCostAmount: 12.5,
      totalTaxAmount: 2,
      subtotalAmount: 10,
      tipAmount: 0.5,
    },
    merchantReference: "22222222-2222-4222-8222-222222222222",
    isImportant: true,
    scans: [
      {
        type: InvoiceScanType.HEIF,
        location: "https://storage.analysis.test/invoices/scans/scan.heif",
        metadata: {source: "upload"},
      },
    ],
    items: [
      {
        name: "Bread",
        classification: {system: ClassificationSystem.Gs1Gpc, code: "10000045"},
        quantity: 1,
        quantityUnit: "pcs",
        productCode: "5940000000001",
        price: 12.5,
      },
    ],
    metadata: {source: "create-invoice", imported: false},
    ...overrides,
  };
}

function createdInvoiceResponse(): Response {
  return Response.json(createInvoiceBuilder().withId(invoiceIdentifier).build(), {status: 201});
}

function getOnlyApiRequest(): AnalysisFetchRequest {
  const request = getAnalysisApiRequests().at(-1);
  if (request === undefined) {
    throw new Error("Expected a native API request.");
  }
  return request;
}

describe("createInvoice", () => {
  beforeEach(() => {
    apiHandler = () => createdInvoiceResponse();
    installAnalysisFetchHandler((request) => apiHandler(request));
  });

  it("omits ownership and posts every client-editable field in the exact create DTO", async () => {
    // Arrange
    const payload = createPayload();

    // Act
    const result = await createInvoice(payload);

    // Assert
    expect(result.success).toBe(true);
    const request = getOnlyApiRequest();
    expect(request).toMatchObject({
      url: `${ANALYSIS_API_URL}/rest/v1/invoices`,
      init: expect.objectContaining({method: "POST", headers: expect.objectContaining({"Content-Type": "application/json"})}),
    });
    expect(request.init?.body).toBe(
      JSON.stringify({
        ...payload,
        paymentInformation: {
          ...payload.paymentInformation,
          transactionDate: payload.paymentInformation?.transactionDate.toISOString(),
        },
      }),
    );
    expect(request.init?.body).not.toContain("userIdentifier");
  });

  it("returns only a fully revived Date-rich invoice response", async () => {
    // Act
    const result = await createInvoice(createPayload());

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(invoiceIdentifier);
      expect(result.data.createdAt).toBeInstanceOf(Date);
      expect(result.data.lastUpdatedAt).toBeInstanceOf(Date);
      expect(result.data.paymentInformation.transactionDate).toBeInstanceOf(Date);
    }
  });

  it("rejects a partial creation response instead of caching an identifier-shaped value", async () => {
    // Arrange
    apiHandler = () => Response.json({id: invoiceIdentifier}, {status: 201});

    // Act
    const result = await createInvoice(createPayload());

    // Assert
    expect(result).toEqual({
      success: false,
      error: {code: "SERVER_ERROR", message: "The invoice response was invalid. Please try again."},
    });
  });

  it("rejects malformed timestamp and unknown-key creation responses", async () => {
    // Arrange
    const malformedDate = createInvoiceBuilder().withId(invoiceIdentifier).build();
    apiHandler = () =>
      Response.json(
        {
          ...malformedDate,
          createdAt: "not-a-date",
          unexpected: true,
        },
        {status: 201},
      );

    // Act
    const result = await createInvoice(createPayload());

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "SERVER_ERROR"}});
  });

  it("rejects HEIC transport values before creating a request", async () => {
    // Arrange
    const payload = {
      ...createPayload(),
      scans: [{type: 9, location: "https://storage.analysis.test/invoices/scans/scan.heic", metadata: {}}],
    };

    // Act
    const result = await createInvoice(payload);

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });

  it("does not read, log, or return a rejected response body or submitted SAS URL", async () => {
    // Arrange
    const sensitiveBody = "provider OCR output for ocr@example.test";
    const sensitiveUrl = "https://storage.analysis.test/invoices/scans/scan.jpg?sig=sensitive";
    const rejectedResponse = new Response(sensitiveBody, {status: 500});
    const readBody = vi.spyOn(rejectedResponse, "text");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    apiHandler = () => rejectedResponse;

    // Act
    const result = await createInvoice(
      createPayload({scans: [{type: InvoiceScanType.JPEG, location: sensitiveUrl, metadata: {ocr: "sensitive"}}]}),
    );

    // Assert
    expect(readBody).not.toHaveBeenCalled();
    const output = JSON.stringify([result, ...consoleError.mock.calls, ...consoleInfo.mock.calls]);
    expect(output).not.toContain(sensitiveBody);
    expect(output).not.toContain(sensitiveUrl);
  });

  it("rejects a scan location outside the configured invoices container before creating a request", async () => {
    const result = await createInvoice(
      createPayload({
        scans: [{type: InvoiceScanType.JPEG, location: "https://storage.analysis.test/other/scan.jpg", metadata: {}}],
      }),
    );

    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });
});
