/**
 * @fileoverview Unit tests for analyzeInvoice server action.
 * @module app/domains/invoices/_actions/invoices/analyzeInvoice.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import type {ServerActionResult} from "@/lib/utils.server";
import {fetchWithTimeout} from "@/lib/utils.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createTextResponse} from "../../../../../../tests/helpers/invoiceDomain";

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
const {analyzeInvoice} = await import("./analyzeInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("analyzeInvoice", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";
  const analysisOptions = {type: "detailed"} as const;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1"});
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      status: 202,
      statusText: "Accepted",
      text: async () => "",
    } as Response);
  });

  it("posts an analysis request with a sixty-second timeout", async () => {
    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, analysisOptions});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      expect.stringContaining(invoiceId),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
      60_000,
    );

    const callArgs = mockFetchWithTimeout.mock.calls[0];
    const body = JSON.parse(callArgs?.[1]?.body as string);
    expect(body.userIdentifier).toBe("user-1");
    expect(body.analysisOptions).toEqual(analysisOptions);
  });

  it("returns an error result for an invalid invoice id", async () => {
    const result = await analyzeInvoice({invoiceIdentifier: "not-a-guid", analysisOptions});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("invoiceIdentifier");
    }
  });

  it("returns the server-error user message for 5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Server error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, analysisOptions});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to analyze invoice");
    }
  });

  it("returns the retry user message for non-5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Bad request", {status: 400, statusText: "Bad Request"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, analysisOptions});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to analyze");
    }
  });

  it("returns an error result when auth throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, analysisOptions});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Auth failed");
    }
  });

  it("returns an error result when fetch throws", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("Network error"));

    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, analysisOptions});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Network error");
    }
  });

  it("returns a fallback error message when auth throws a non-Error", async () => {
    mockFetchUser.mockRejectedValue("Auth string error");

    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, analysisOptions});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Unknown analysis error");
    }
  });
});
