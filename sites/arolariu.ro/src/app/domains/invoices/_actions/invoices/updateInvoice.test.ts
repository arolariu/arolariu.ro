/**
 * @fileoverview Unit tests for updateInvoice server action.
 * @module app/domains/invoices/_actions/invoices/updateInvoice.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import type {ServerActionResult} from "@/lib/utils.server";
import {fetchWithTimeout} from "@/lib/utils.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {buildInvoice, createJsonResponse, createTextResponse} from "../../../../../../tests/helpers/invoiceDomain";

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("@/lib/utils.server", () => ({
  createErrorResult: vi.fn(<T>(error: unknown, defaultMessage = "Something went wrong") =>
    Promise.resolve({
      success: false as const,
      error: {
        code: "NETWORK_ERROR" as const,
        message: error instanceof Error ? error.message : defaultMessage,
      },
    } as ServerActionResult<T>),
  ),
  fetchWithTimeout: vi.fn(),
  DEFAULT_FETCH_TIMEOUT: 30_000,
}));
// Register before dynamically importing the action so coverage stays scoped to this action file.
vi.doMock("@/lib/utils.generic", () => ({
  generateInvoiceId: vi.fn(() => "test-id"),
  generateMerchantId: vi.fn(() => "test-merchant-id"),
  generateProductId: vi.fn(() => "test-product-id"),
  generateScanId: vi.fn(() => "test-scan-id"),
  parseInvoiceJson: vi.fn((json: string) => JSON.parse(json)),
  sleep: vi.fn(() => Promise.resolve()),
  validateStringIsGuidType: vi.fn((input: string, paramName = "identifier") => {
    const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (typeof input !== "string" || input.length === 0 || !UUID_REGEX.test(input)) {
      throw new Error(`Invalid ${paramName}: "${input}" is not a valid GUID`);
    }
  }),
}));

const {updateInvoice} = await import("./updateInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("updateInvoice", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1"});
    mockFetchWithTimeout.mockResolvedValue(
      createJsonResponse(buildInvoice({id: invoiceId})) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("posts the full invoice payload and returns the updated invoice", async () => {
    const invoice = buildInvoice({id: invoiceId, name: "Full Update Invoice"});

    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(invoice),
      }),
    );

    if (result.success) {
      expect(result.data.id).toBe(invoiceId);
    }
  });

  it("returns an error result for an invalid invoice id", async () => {
    const invoice = buildInvoice();
    const result = await updateInvoice({invoiceId: "not-a-guid", invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("invoiceId");
    }
  });

  it("returns the server-error user message for 5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Server error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const invoice = buildInvoice({id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to update invoice");
    }
  });

  it("returns the fallback user message for non-5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Bad request", {status: 400, statusText: "Bad Request"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const invoice = buildInvoice({id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to update");
    }
  });

  it("returns an error result when auth throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    const invoice = buildInvoice({id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Auth failed");
    }
  });

  it("returns an error result when fetch throws", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("Network error"));

    const invoice = buildInvoice({id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Network error");
    }
  });

  it("returns a fallback error message when auth throws a non-Error", async () => {
    mockFetchUser.mockRejectedValue(42);

    const invoice = buildInvoice({id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("An unexpected error occurred");
    }
  });
});
