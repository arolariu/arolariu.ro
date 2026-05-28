/**
 * @fileoverview Unit tests for fetchInvoice server action.
 * @module app/domains/invoices/_actions/invoices/fetchInvoice.test
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
const {fetchInvoice} = await import("./fetchInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("fetchInvoice", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1"});
    mockFetchWithTimeout.mockResolvedValue(
      createJsonResponse(buildInvoice({id: invoiceId})) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("gets an invoice by id with bearer authorization", async () => {
    const result = await fetchInvoice({invoiceId});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );

    if (result.success) {
      expect(result.data.id).toBe(invoiceId);
    }
  });

  it("returns an error result for an invalid invoice id", async () => {
    const result = await fetchInvoice({invoiceId: "not-a-guid"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("invoiceId");
    }
  });

  it("maps 404 to the not-found user message", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Not found", {status: 404, statusText: "Not Found"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result = await fetchInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("404");
      expect(result.error.message).toContain("Not Found");
    }
  });

  it("maps 403 to the forbidden user message", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Forbidden", {status: 403, statusText: "Forbidden"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result = await fetchInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("403");
      expect(result.error.message).toContain("Forbidden");
    }
  });

  it("maps other non-OK responses to the fallback user message", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Bad request", {status: 400, statusText: "Bad Request"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result = await fetchInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("400");
      expect(result.error.message).toContain("Bad Request");
    }
  });

  it("returns an error result when auth throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    const result = await fetchInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Auth failed");
    }
  });

  it("returns an error result when fetch throws", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("Network error"));

    const result = await fetchInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Network error");
    }
  });

  it("returns a fallback error message when auth throws a non-Error", async () => {
    mockFetchUser.mockRejectedValue({error: "UNAUTHORIZED"});

    const result = await fetchInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("An unexpected error occurred");
    }
  });
});
