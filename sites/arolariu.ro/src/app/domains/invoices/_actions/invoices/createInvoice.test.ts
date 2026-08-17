/**
 * @fileoverview Unit tests for createInvoice server action.
 * @module app/domains/invoices/_actions/invoices/createInvoice.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";

const {createInvoice} = await import("./createInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("createInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse(TestDataBuilder.build("invoice")) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("posts a creation payload with authenticated userIdentifier when missing", async () => {
    const payload = {
      initialScan: TestDataBuilder.build("invoiceScan", {
        location: "https://storage.test/scan.jpg",
      }),
      metadata: {isImportant: "false", requiresAnalysis: "true"},
    };

    const result = await createInvoice(payload);

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      "/rest/v1/invoices",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );

    const callArgs = mockFetchWithTimeout.mock.calls[0];
    const body = JSON.parse(callArgs?.[1]?.body as string);
    expect(body.userIdentifier).toBe("user-1");
  });

  it("preserves an explicit userIdentifier in the payload", async () => {
    const payload = TestDataBuilder.build("createInvoicePayload", {
      userIdentifier: "custom-user-id",
      initialScan: TestDataBuilder.build("invoiceScan", {
        location: "https://storage.test/scan.jpg",
      }),
      metadata: {isImportant: "false", requiresAnalysis: "true"},
    });

    await createInvoice(payload);

    const callArgs = mockFetchWithTimeout.mock.calls[0];
    const body = JSON.parse(callArgs?.[1]?.body as string);
    expect(body.userIdentifier).toBe("custom-user-id");
  });

  it("returns a stable server-error result without reading or exposing the backend body", async () => {
    // Arrange
    const sensitiveBackendBody = "OCR text: card 4111 1111 1111 1111; provider response";
    const readResponseBody = vi.fn(async () => sensitiveBackendBody);
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: readResponseBody,
    } as unknown as Response);

    // Act
    const result = await createInvoice({});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual({
        code: "SERVER_ERROR",
        message: "Invoice creation is temporarily unavailable. Please try again.",
        status: 500,
      });
      expect(JSON.stringify(result.error)).not.toContain(sensitiveBackendBody);
    }
    expect(readResponseBody).not.toHaveBeenCalled();
  });

  it("returns a stable validation result for non-5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
    } as Response);

    const result = await createInvoice({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual({
        code: "VALIDATION_ERROR",
        message: "Unable to create invoice with the provided details.",
        status: 400,
      });
    }
  });

  it("preserves an authentication rejection as a stable auth result", async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as unknown as Response);

    const result = await createInvoice({});

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
    const sensitiveException = "authorization provider token for user@example.test";
    mockFetchUser.mockRejectedValue(new Error(sensitiveException));

    const result = await createInvoice({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toBe("Unable to create invoice. Please try again.");
      expect(JSON.stringify(result.error)).not.toContain(sensitiveException);
    }
  });

  it("does not log or return a submitted SAS URL, OCR text, or backend exception", async () => {
    // Arrange
    const fakeSasUrl = "https://storage.example.test/invoices/scan.jpg?sv=2025-01-01&sig=fake-sensitive-signature";
    const fakeOcrText = "OCR: customer email ocr-customer@example.test";
    const fakeBackendBody = "provider response: internal reasoning";
    const sensitiveException = `${fakeOcrText}; ${fakeBackendBody}`;
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchWithTimeout.mockRejectedValue(new Error(sensitiveException));

    // Act
    const result = await createInvoice({
      initialScan: TestDataBuilder.build("invoiceScan", {location: fakeSasUrl}),
      metadata: {isImportant: "false", requiresAnalysis: "true", ocrPreview: fakeOcrText},
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toBe("Unable to create invoice. Please try again.");
    }
    const capturedOutput = JSON.stringify([...consoleInfoSpy.mock.calls, ...consoleErrorSpy.mock.calls, result]);
    for (const sensitiveValue of [fakeSasUrl, fakeOcrText, fakeBackendBody, sensitiveException]) {
      expect(capturedOutput).not.toContain(sensitiveValue);
    }
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("returns a fallback error message when fetch throws a non-Error", async () => {
    mockFetchWithTimeout.mockRejectedValue({code: "TIMEOUT"});

    const result = await createInvoice({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unable to create invoice. Please try again.");
    }
  });
});
