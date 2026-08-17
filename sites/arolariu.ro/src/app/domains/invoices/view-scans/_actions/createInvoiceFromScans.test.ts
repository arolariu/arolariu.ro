/**
 * @fileoverview Security and durable-enqueue tests for invoice creation from scans.
 * @module app/domains/invoices/view-scans/_actions/createInvoiceFromScans.test
 */

import {logWithTrace} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import type {Scan} from "@/types/scans";
import {ScanStatus, ScanType} from "@/types/scans";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createInvoiceFromScans} from "./createInvoiceFromScans";

const mockFetchBffUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
const mockLogWithTrace = vi.mocked(logWithTrace);

const INVOICE_IDENTIFIER = "11111111-1111-4111-8111-111111111111";
const ANALYSIS_RUN_IDENTIFIER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

/**
 * Creates a deterministic scan for server-action boundary tests.
 *
 * @param overrides - Optional scan field overrides.
 * @returns A ready scan fixture.
 */
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

/**
 * Returns a response that represents a durable analysis enqueue acknowledgement.
 *
 * @returns A valid HTTP 202 response.
 */
function acceptedAnalysisResponse(): Response {
  return new Response(
    JSON.stringify({
      runId: ANALYSIS_RUN_IDENTIFIER,
      targetType: "invoice",
      targetId: INVOICE_IDENTIFIER,
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

/**
 * Returns the smallest invoice shape consumed by this composite action.
 *
 * @returns A successful invoice-creation response.
 */
function createdInvoiceResponse(): Response {
  return new Response(JSON.stringify({id: INVOICE_IDENTIFIER, userIdentifier: "user-1"}), {status: 201});
}

/**
 * Creates a second unique scan for batch and partial-success tests.
 *
 * @returns A ready scan with a distinct identifier.
 */
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
    vi.clearAllMocks();
    mockFetchBffUser.mockResolvedValue({
      userIdentifier: "user-1",
      userJwt: "jwt-1",
      user: null,
    });
  });

  it("waits for the durable HTTP 202 acknowledgement without waiting for analysis work", async () => {
    // Arrange
    let resolveAcknowledgement: ((response: Response) => void) | undefined;
    mockFetchWithTimeout.mockImplementation((url: string) => {
      if (url.endsWith("/analyze")) {
        return new Promise<Response>((resolve) => {
          resolveAcknowledgement = resolve;
        });
      }

      return Promise.resolve(createdInvoiceResponse());
    });

    // Act
    const creation = createInvoiceFromScans({scans: [createScan()], mode: "single"});
    let hasSettled = false;
    void creation.then(() => {
      hasSettled = true;
    });

    await vi.waitFor(() => {
      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        `/rest/v1/invoices/${INVOICE_IDENTIFIER}/analyze`,
        expect.objectContaining({method: "POST"}),
        15_000,
      );
    });
    await Promise.resolve();

    // Assert
    expect(hasSettled).toBe(false);
    resolveAcknowledgement?.(acceptedAnalysisResponse());
    await expect(creation).resolves.toMatchObject({
      success: true,
      data: {
        invoices: [{id: INVOICE_IDENTIFIER}],
        analysis: [{invoiceIdentifier: INVOICE_IDENTIFIER, status: "queued"}],
      },
    });
  });

  it("preserves a created invoice when analysis enqueue is rejected and reports only a safe code", async () => {
    // Arrange
    const fakeSasUrl = "https://storage.example.test/scans/scan-1.jpg?sig=fake-sensitive-signature";
    const fakeOcrText = "OCR text for customer ocr@example.test";
    const fakeBackendBody = "provider body containing internal detail";
    mockFetchWithTimeout.mockImplementation((url: string) =>
      Promise.resolve(url.endsWith("/analyze") ? new Response(fakeBackendBody, {status: 503}) : createdInvoiceResponse()),
    );

    // Act
    const result = await createInvoiceFromScans({
      scans: [createScan({blobUrl: fakeSasUrl, name: fakeOcrText})],
      mode: "single",
    });

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        invoices: [{id: INVOICE_IDENTIFIER}],
        analysis: [{invoiceIdentifier: INVOICE_IDENTIFIER, status: "not_queued", errorCode: "SERVER_ERROR"}],
      },
    });
    const capturedValues = JSON.stringify([result, ...mockLogWithTrace.mock.calls]);
    for (const sensitiveValue of [fakeSasUrl, fakeOcrText, fakeBackendBody]) {
      expect(capturedValues).not.toContain(sensitiveValue);
    }
  });

  it("does not read, log, or return a rejected invoice-creation response body", async () => {
    // Arrange
    const fakeSasUrl = "https://storage.example.test/scans/scan-1.jpg?sig=fake-sensitive-signature";
    const fakeOcrText = "OCR content that must not be returned";
    const fakeBackendBody = "backend body with provider content";
    const rejectedResponse = new Response(fakeBackendBody, {status: 500, statusText: "Internal Server Error"});
    const readResponseBody = vi.spyOn(rejectedResponse, "text");
    mockFetchWithTimeout.mockResolvedValue(rejectedResponse);

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
    const capturedValues = JSON.stringify([result, ...mockLogWithTrace.mock.calls]);
    for (const sensitiveValue of [fakeSasUrl, fakeOcrText, fakeBackendBody]) {
      expect(capturedValues).not.toContain(sensitiveValue);
    }
  });

  it("returns an explicit safe auth failure instead of a success-shaped fallback", async () => {
    // Arrange
    mockFetchBffUser.mockResolvedValue({userIdentifier: "", userJwt: "jwt-1", user: null});

    // Act
    const result = await createInvoiceFromScans({scans: [createScan()], mode: "single"});

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "You must be authenticated to create invoices.",
      },
    });
  });

  it("continues single-mode creation after a safe per-scan rejection", async () => {
    // Arrange
    let createAttempts = 0;
    mockFetchWithTimeout.mockImplementation((url: string) => {
      if (url.endsWith("/analyze")) {
        return Promise.resolve(acceptedAnalysisResponse());
      }

      createAttempts += 1;
      return Promise.resolve(createAttempts === 1 ? new Response(null, {status: 422}) : createdInvoiceResponse());
    });

    // Act
    const result = await createInvoiceFromScans({scans: [createScan(), createSecondScan()], mode: "single"});

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        invoices: [{id: INVOICE_IDENTIFIER}],
        convertedScanIds: ["scan-2"],
        errors: [{scanId: "scan-1", code: "VALIDATION_ERROR"}],
        analysis: [{invoiceIdentifier: INVOICE_IDENTIFIER, status: "queued"}],
      },
    });
  });

  it("creates a batch invoice, attaches remaining scans, and awaits its durable enqueue acknowledgement", async () => {
    // Arrange
    mockFetchWithTimeout.mockImplementation((url: string) => {
      if (url.endsWith("/analyze")) {
        return Promise.resolve(acceptedAnalysisResponse());
      }

      if (url.endsWith("/scans")) {
        return Promise.resolve(new Response(null, {status: 201}));
      }

      return Promise.resolve(createdInvoiceResponse());
    });

    // Act
    const result = await createInvoiceFromScans({scans: [createScan(), createSecondScan()], mode: "batch"});

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        invoices: [{id: INVOICE_IDENTIFIER}],
        convertedScanIds: ["scan-1", "scan-2"],
        errors: [],
        analysis: [{invoiceIdentifier: INVOICE_IDENTIFIER, status: "queued"}],
      },
    });
  });

  it("preserves a batch invoice when an additional scan cannot be attached", async () => {
    // Arrange
    mockFetchWithTimeout.mockImplementation((url: string) => {
      if (url.endsWith("/analyze")) {
        return Promise.resolve(acceptedAnalysisResponse());
      }

      if (url.endsWith("/scans")) {
        return Promise.resolve(new Response(null, {status: 404}));
      }

      return Promise.resolve(createdInvoiceResponse());
    });

    // Act
    const result = await createInvoiceFromScans({scans: [createScan(), createSecondScan()], mode: "batch"});

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        invoices: [{id: INVOICE_IDENTIFIER}],
        convertedScanIds: ["scan-1"],
        errors: [{scanId: "scan-2", code: "NOT_FOUND"}],
        analysis: [{invoiceIdentifier: INVOICE_IDENTIFIER, status: "queued"}],
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
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("returns a stable network result when all requested invoice creations fail before a response", async () => {
    // Arrange
    const sensitiveException = "provider response included OCR text and a SAS query string";
    mockFetchWithTimeout.mockRejectedValue(new Error(sensitiveException));

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
    mockFetchWithTimeout.mockImplementation((url: string) =>
      Promise.resolve(url.endsWith("/analyze") ? new Response(JSON.stringify({}), {status: 202}) : createdInvoiceResponse()),
    );

    // Act
    const result = await createInvoiceFromScans({scans: [createScan()], mode: "single"});

    // Assert
    expect(result).toMatchObject({
      success: true,
      data: {
        invoices: [{id: INVOICE_IDENTIFIER}],
        analysis: [{invoiceIdentifier: INVOICE_IDENTIFIER, status: "not_queued", errorCode: "UNKNOWN_ERROR"}],
      },
    });
  });
});
