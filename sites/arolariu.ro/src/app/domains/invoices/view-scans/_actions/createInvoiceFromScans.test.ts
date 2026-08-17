/**
 * @fileoverview Real-boundary tests for invoice creation from scans and durable enqueueing.
 * @module app/domains/invoices/view-scans/_actions/createInvoiceFromScans.test
 */

import {analysisClerk} from "@/../tests/helpers/analysisClerk";
import {
  ANALYSIS_API_URL,
  getAnalysisApiRequests,
  installAnalysisFetchHandler,
  type AnalysisFetchRequest,
} from "@/../tests/helpers/analysisBoundary";
import type {Scan} from "@/types/scans";
import {ScanStatus, ScanType} from "@/types/scans";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createInvoiceFromScans} from "./createInvoiceFromScans";

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
const analysisRunIdentifier = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

let apiHandler: (request: AnalysisFetchRequest) => Response | Promise<Response>;

function createScan(overrides: Partial<Scan> = {}): Scan {
  return {
    id: "scan-1",
    userIdentifier: "user-1",
    name: "receipt.jpg",
    blobUrl: "https://storage.example.test/scans/scan-1.jpg",
    mimeType: "image/jpeg",
    sizeInBytes: 1024,
    scanType: ScanType.JPEG,
    uploadedAt: new Date("2026-08-17T19:40:42.187Z"),
    status: ScanStatus.READY,
    metadata: {
      scanId: "scan-1",
      ownerId: "user-1",
      displayName: "receipt.jpg",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedAt: new Date("2026-08-17T19:40:42.187Z"),
      uploadedBy: "user-1",
    },
    ...overrides,
  };
}

function acceptedAnalysisResponse(): Response {
  return new Response(
    JSON.stringify({
      runId: analysisRunIdentifier,
      targetType: "invoice",
      targetId: invoiceIdentifier,
      status: "queued",
      profile: "comprehensive",
      acceptedCapabilities: [
        "documentExtraction",
        "merchantResolution",
        "invoiceSummary",
        "productClassification",
        "allergenAssessment",
        "invoiceClassification",
        "recipeGeneration",
      ],
      acceptedAt: "2026-08-17T19:40:42.187Z",
    }),
    {status: 202},
  );
}

function createdInvoiceResponse(): Response {
  return new Response(JSON.stringify({id: invoiceIdentifier, userIdentifier: "user-1"}), {status: 201});
}

function createSecondScan(): Scan {
  const firstScan = createScan();
  return {
    ...firstScan,
    id: "scan-2",
    metadata: {...firstScan.metadata, scanId: "scan-2", displayName: "receipt-2.jpg"},
    name: "receipt-2.jpg",
  };
}

describe("createInvoiceFromScans", () => {
  beforeEach(() => {
    apiHandler = () => createdInvoiceResponse();
    installAnalysisFetchHandler((requestAtBoundary) => apiHandler(requestAtBoundary));
  });

  it("waits for the durable HTTP 202 acknowledgement without waiting for analysis work", async () => {
    // Arrange
    let resolveAcknowledgement: ((response: Response) => void) | undefined;
    apiHandler = (requestAtBoundary) => {
      if (requestAtBoundary.url.endsWith("/analyze")) {
        return new Promise<Response>((resolve) => {
          resolveAcknowledgement = resolve;
        });
      }

      return createdInvoiceResponse();
    };

    // Act
    const creation = createInvoiceFromScans({scans: [createScan()], mode: "single"});
    let hasSettled = false;
    void creation.then(() => {
      hasSettled = true;
    });

    await vi.waitFor(() => {
      expect(getAnalysisApiRequests()).toContainEqual(
        expect.objectContaining({
          url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceIdentifier}/analyze`,
          init: expect.objectContaining({method: "POST"}),
        }),
      );
    });
    await Promise.resolve();

    // Assert
    expect(hasSettled).toBe(false);
    resolveAcknowledgement?.(acceptedAnalysisResponse());
    await expect(creation).resolves.toMatchObject({
      success: true,
      data: {
        invoices: [{id: invoiceIdentifier}],
        analysis: [{invoiceIdentifier, status: "queued"}],
      },
    });
  });

  it("preserves a created invoice when analysis enqueue is rejected and reports only a safe code", async () => {
    // Arrange
    const fakeSasUrl = "https://storage.example.test/scans/scan-1.jpg?sig=fake-sensitive-signature";
    const fakeOcrText = "OCR text for customer ocr@example.test";
    const fakeBackendBody = "provider body containing internal detail";
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    apiHandler = (requestAtBoundary) =>
      requestAtBoundary.url.endsWith("/analyze") ? new Response(fakeBackendBody, {status: 503}) : createdInvoiceResponse();

    // Act
    const result = await createInvoiceFromScans({
      scans: [createScan({blobUrl: fakeSasUrl, name: fakeOcrText})],
      mode: "single",
    });

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        invoices: [{id: invoiceIdentifier}],
        analysis: [{invoiceIdentifier, status: "not_queued", errorCode: "SERVER_ERROR"}],
      },
    });
    const capturedValues = JSON.stringify([result, ...consoleInfoSpy.mock.calls, ...consoleWarnSpy.mock.calls]);
    for (const sensitiveValue of [fakeSasUrl, fakeOcrText, fakeBackendBody]) {
      expect(capturedValues).not.toContain(sensitiveValue);
    }
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("does not read, log, or return a rejected invoice-creation response body", async () => {
    // Arrange
    const fakeSasUrl = "https://storage.example.test/scans/scan-1.jpg?sig=fake-sensitive-signature";
    const fakeOcrText = "OCR content that must not be returned";
    const fakeBackendBody = "backend body with provider content";
    const rejectedResponse = new Response(fakeBackendBody, {status: 500, statusText: "Internal Server Error"});
    const readResponseBody = vi.spyOn(rejectedResponse, "text");
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    apiHandler = () => rejectedResponse;

    // Act
    const result = await createInvoiceFromScans({
      scans: [createScan({blobUrl: fakeSasUrl, name: fakeOcrText})],
      mode: "single",
    });

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Invoice creation is temporarily unavailable. Please try again.",
      },
    });
    expect(readResponseBody).not.toHaveBeenCalled();
    const capturedValues = JSON.stringify([result, ...consoleWarnSpy.mock.calls]);
    for (const sensitiveValue of [fakeSasUrl, fakeOcrText, fakeBackendBody]) {
      expect(capturedValues).not.toContain(sensitiveValue);
    }
    consoleWarnSpy.mockRestore();
  });

  it("returns an explicit safe authentication-boundary failure instead of a success-shaped fallback", async () => {
    // Arrange
    analysisClerk.auth.mockRejectedValue(new Error("Clerk unavailable"));

    // Act
    const result = await createInvoiceFromScans({scans: [createScan()], mode: "single"});

    // Assert
    expect(result).toEqual({
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Unable to create invoices. Please try again.",
      },
    });
  });

  it("continues single-mode creation after a safe per-scan rejection", async () => {
    // Arrange
    let createAttempts = 0;
    apiHandler = (requestAtBoundary) => {
      if (requestAtBoundary.url.endsWith("/analyze")) {
        return acceptedAnalysisResponse();
      }

      createAttempts += 1;
      return createAttempts === 1 ? new Response(null, {status: 422}) : createdInvoiceResponse();
    };

    // Act
    const result = await createInvoiceFromScans({scans: [createScan(), createSecondScan()], mode: "single"});

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        invoices: [{id: invoiceIdentifier}],
        convertedScanIds: ["scan-2"],
        errors: [{scanId: "scan-1", code: "VALIDATION_ERROR"}],
        analysis: [{invoiceIdentifier, status: "queued"}],
      },
    });
  });

  it("creates a batch invoice, attaches remaining scans, and awaits its durable enqueue acknowledgement", async () => {
    // Arrange
    apiHandler = (requestAtBoundary) => {
      if (requestAtBoundary.url.endsWith("/analyze")) {
        return acceptedAnalysisResponse();
      }

      if (requestAtBoundary.url.endsWith("/scans")) {
        return new Response(null, {status: 201});
      }

      return createdInvoiceResponse();
    };

    // Act
    const result = await createInvoiceFromScans({scans: [createScan(), createSecondScan()], mode: "batch"});

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        invoices: [{id: invoiceIdentifier}],
        convertedScanIds: ["scan-1", "scan-2"],
        errors: [],
        analysis: [{invoiceIdentifier, status: "queued"}],
      },
    });
  });

  it("preserves a batch invoice when an additional scan cannot be attached", async () => {
    // Arrange
    apiHandler = (requestAtBoundary) => {
      if (requestAtBoundary.url.endsWith("/analyze")) {
        return acceptedAnalysisResponse();
      }

      if (requestAtBoundary.url.endsWith("/scans")) {
        return new Response(null, {status: 404});
      }

      return createdInvoiceResponse();
    };

    // Act
    const result = await createInvoiceFromScans({scans: [createScan(), createSecondScan()], mode: "batch"});

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        invoices: [{id: invoiceIdentifier}],
        convertedScanIds: ["scan-1"],
        errors: [{scanId: "scan-2", code: "NOT_FOUND"}],
        analysis: [{invoiceIdentifier, status: "queued"}],
      },
    });
  });

  it("returns a validation failure for an empty batch without sending a request", async () => {
    // Act
    const result = await createInvoiceFromScans({scans: [], mode: "batch"});

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {code: "VALIDATION_ERROR", message: "Select at least one scan to create an invoice."},
    });
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });

  it("returns a stable network result when all requested invoice creations fail before a response", async () => {
    // Arrange
    const sensitiveException = "provider response included OCR text and a SAS query string";
    apiHandler = () => Promise.reject(new Error(sensitiveException));

    // Act
    const result = await createInvoiceFromScans({scans: [createScan()], mode: "single"});

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {code: "NETWORK_ERROR", message: "Unable to create invoices. Please try again."},
    });
    expect(JSON.stringify(result)).not.toContain(sensitiveException);
  });

  it("keeps the created invoice and reports a safe unknown code for an invalid 202 acknowledgement", async () => {
    // Arrange
    apiHandler = (requestAtBoundary) =>
      requestAtBoundary.url.endsWith("/analyze") ? new Response(JSON.stringify({}), {status: 202}) : createdInvoiceResponse();

    // Act
    const result = await createInvoiceFromScans({scans: [createScan()], mode: "single"});

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        invoices: [{id: invoiceIdentifier}],
        analysis: [{invoiceIdentifier, status: "not_queued", errorCode: "UNKNOWN_ERROR"}],
      },
    });
  });
});
