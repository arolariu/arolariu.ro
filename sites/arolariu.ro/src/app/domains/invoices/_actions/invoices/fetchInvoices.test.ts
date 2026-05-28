/**
 * @fileoverview Unit tests for fetchInvoices server action.
 * @module app/domains/invoices/_actions/invoices/fetchInvoices.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {buildInvoice, createJsonResponse, createTextResponse} from "../../../../../../tests/helpers/invoiceDomain";
import {fetchInvoices} from "./fetchInvoices";

// Hoist the actual createErrorResult before mocking
const {createErrorResult: actualCreateErrorResult} = await vi.hoisted(async () => {
  const mod = await import("../../../../../../src/lib/utils.server.ts");
  return {createErrorResult: mod.createErrorResult};
});

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("@/lib/utils.server", async () => {
  return {
    createErrorResult: actualCreateErrorResult,
    fetchWithTimeout: vi.fn(),
    DEFAULT_FETCH_TIMEOUT: 30_000,
  };
});

const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked((await import("@/lib/utils.server")).fetchWithTimeout);

describe("fetchInvoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1"});
    mockFetchWithTimeout.mockResolvedValue(
      createJsonResponse([buildInvoice(), buildInvoice({id: "22222222-2222-4222-8222-222222222222"})]) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );
  });

  it("gets all invoices with bearer authorization", async () => {
    const result = await fetchInvoices();

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      "/rest/v1/invoices/",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );

    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("returns the server-error user message for 5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Server error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result = await fetchInvoices();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to fetch invoices");
    }
  });

  it("returns the fallback user message for non-5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Bad request", {status: 400, statusText: "Bad Request"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result = await fetchInvoices();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to fetch invoices");
    }
  });

  it("returns an error result when auth or fetch throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    const result = await fetchInvoices();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Auth failed");
    }
  });
});
