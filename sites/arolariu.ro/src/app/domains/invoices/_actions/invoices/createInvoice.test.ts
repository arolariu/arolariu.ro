/**
 * @fileoverview Real-boundary tests for invoice creation server actions.
 * @module app/domains/invoices/_actions/invoices/createInvoice.test
 */

import {analysisClerk} from "@/../tests/helpers/analysisClerk";
import {
  ANALYSIS_API_URL,
  getAnalysisApiRequests,
  installAnalysisFetchHandler,
  type AnalysisFetchRequest,
} from "@/../tests/helpers/analysisBoundary";
import {EMPTY_GUID} from "@/lib/utils.generic";
import {InvoiceScanType} from "@/types/invoices";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createInvoice} from "./createInvoice";

let apiHandler: (request: AnalysisFetchRequest) => Response | Promise<Response>;

function getOnlyApiRequest(): AnalysisFetchRequest {
  const requestAtBoundary = getAnalysisApiRequests()[0];
  if (!requestAtBoundary) {
    throw new Error("Expected the real action to send an API request.");
  }

  return requestAtBoundary;
}

function getRequestPayload(requestAtBoundary: AnalysisFetchRequest): unknown {
  if (typeof requestAtBoundary.init?.body !== "string") {
    throw new Error("Expected the real action to send a JSON request body.");
  }

  return JSON.parse(requestAtBoundary.init.body) as unknown;
}

describe("createInvoice", () => {
  beforeEach(() => {
    apiHandler = () => new Response(JSON.stringify({id: "11111111-1111-4111-8111-111111111111"}), {status: 201});
    installAnalysisFetchHandler((requestAtBoundary) => apiHandler(requestAtBoundary));
  });

  it("posts a creation payload with the real guest userIdentifier when missing", async () => {
    // Arrange
    const payload = {
      initialScan: {
        scanType: InvoiceScanType.JPEG,
        location: "https://storage.test/scan.jpg",
        metadata: {},
      },
      metadata: {isImportant: "false", requiresAnalysis: "true"},
    };

    // Act
    const result = await createInvoice(payload);

    // Assert
    expect(result.success).toBe(true);
    const requestAtBoundary = getOnlyApiRequest();
    expect(requestAtBoundary).toMatchObject({
      url: `${ANALYSIS_API_URL}/rest/v1/invoices`,
      init: expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer /u),
          "Content-Type": "application/json",
        }),
      }),
    });
    expect(getRequestPayload(requestAtBoundary)).toMatchObject({userIdentifier: EMPTY_GUID});
  });

  it("preserves an explicit userIdentifier in the payload", async () => {
    // Arrange
    const payload = {
      userIdentifier: "custom-user-id",
      initialScan: {
        scanType: InvoiceScanType.JPEG,
        location: "https://storage.test/scan.jpg",
        metadata: {},
      },
      metadata: {isImportant: "false", requiresAnalysis: "true"},
    };

    // Act
    await createInvoice(payload);

    // Assert
    expect(getRequestPayload(getOnlyApiRequest())).toMatchObject({userIdentifier: "custom-user-id"});
  });

  it("returns a stable server-error result without reading or exposing the backend body", async () => {
    // Arrange
    const sensitiveBackendBody = "OCR text: card 4111 1111 1111 1111; provider response";
    const rejectedResponse = new Response(sensitiveBackendBody, {status: 500, statusText: "Internal Server Error"});
    const readResponseBody = vi.spyOn(rejectedResponse, "text");
    apiHandler = () => rejectedResponse;

    // Act
    const result = await createInvoice({});

    // Assert
    expect(result).toEqual({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Invoice creation is temporarily unavailable. Please try again.",
        status: 500,
      },
    });
    expect(JSON.stringify(result)).not.toContain(sensitiveBackendBody);
    expect(readResponseBody).not.toHaveBeenCalled();
  });

  it("returns a stable validation result for non-5xx responses", async () => {
    // Arrange
    apiHandler = () => new Response(null, {status: 400, statusText: "Bad Request"});

    // Act
    const result = await createInvoice({});

    // Assert
    expect(result).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Unable to create invoice with the provided details.",
        status: 400,
      },
    });
  });

  it("preserves an authentication rejection as a stable auth result", async () => {
    // Arrange
    apiHandler = () => new Response(null, {status: 401, statusText: "Unauthorized"});

    // Act
    const result = await createInvoice({});

    // Assert
    expect(result).toEqual({
      success: false,
      error: {
        code: "AUTH_ERROR",
        message: "You are not authorized to create invoices.",
        status: 401,
      },
    });
  });

  it("does not expose an authentication exception message", async () => {
    // Arrange
    const sensitiveException = "authorization provider token for user@example.test";
    analysisClerk.auth.mockRejectedValue(new Error(sensitiveException));

    // Act
    const result = await createInvoice({});

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "NETWORK_ERROR", message: "Unable to create invoice. Please try again."}});
    expect(JSON.stringify(result)).not.toContain(sensitiveException);
  });

  it("does not log or return a submitted SAS URL, OCR text, or backend exception", async () => {
    // Arrange
    const fakeSasUrl = "https://storage.example.test/invoices/scan.jpg?sv=2025-01-01&sig=fake-sensitive-signature";
    const fakeOcrText = "OCR: customer email ocr-customer@example.test";
    const fakeBackendBody = "provider response: internal reasoning";
    const sensitiveException = `${fakeOcrText}; ${fakeBackendBody}`;
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    apiHandler = () => Promise.reject(new Error(sensitiveException));

    // Act
    const result = await createInvoice({
      initialScan: {
        scanType: InvoiceScanType.JPEG,
        location: fakeSasUrl,
        metadata: {},
      },
      metadata: {isImportant: "false", requiresAnalysis: "true", ocrPreview: fakeOcrText},
    });

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "NETWORK_ERROR", message: "Unable to create invoice. Please try again."}});
    const capturedOutput = JSON.stringify([...consoleInfoSpy.mock.calls, ...consoleErrorSpy.mock.calls, result]);
    for (const sensitiveValue of [fakeSasUrl, fakeOcrText, fakeBackendBody, sensitiveException]) {
      expect(capturedOutput).not.toContain(sensitiveValue);
    }
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("returns a fallback error message when native fetch throws a non-Error", async () => {
    // Arrange
    apiHandler = () => Promise.reject({code: "TIMEOUT"});

    // Act
    const result = await createInvoice({});

    // Assert
    expect(result).toMatchObject({success: false, error: {message: "Unable to create invoice. Please try again."}});
  });
});
