/**
 * @fileoverview Unit tests for updateInvoice server action.
 * @module app/domains/invoices/_actions/invoices/updateInvoice.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {buildInvoice, createJsonResponse, createTextResponse} from "../../../../../../tests/helpers/invoiceDomain";
import {updateInvoice} from "./updateInvoice";

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

  it("returns an error result when auth or fetch throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    const invoice = buildInvoice({id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Auth failed");
    }
  });
});
