/**
 * @fileoverview Unit tests for fetchMerchant server action.
 * @module app/domains/invoices/_actions/merchants/fetchMerchant.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import type {Merchant} from "@/types/invoices";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {buildMerchant, createJsonResponse, createTextResponse} from "../../../../../../tests/helpers/invoiceDomain";

vi.mock("@/lib/actions/user/fetchUser");

const {fetchMerchant} = await import("./fetchMerchant");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("fetchMerchant", () => {
  const merchantId = "22222222-2222-4222-8222-222222222222";
  const mockMerchant = buildMerchant({id: merchantId, name: "Test Supermarket"});

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1"});
    mockFetchWithTimeout.mockResolvedValue(createJsonResponse(mockMerchant, {status: 200}) as Awaited<ReturnType<typeof fetchWithTimeout>>);
  });

  it("fetches a merchant successfully with valid GUID", async () => {
    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        id: merchantId,
        name: "Test Supermarket",
      });
    }
  });

  it("constructs the correct API request URL and headers", async () => {
    await fetchMerchant({merchantId});

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/merchants/${merchantId}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("fetches user JWT before making the API request", async () => {
    await fetchMerchant({merchantId});

    expect(mockFetchUser).toHaveBeenCalledOnce();
    expect(mockFetchUser).toHaveBeenCalledBefore(mockFetchWithTimeout);
  });

  it("returns an error result for an invalid merchant ID", async () => {
    const result = await fetchMerchant({merchantId: "not-a-guid"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("merchantId");
      expect(result.error.message).toContain("not a valid GUID");
    }
  });

  it("returns an error result for an empty merchant ID", async () => {
    const result = await fetchMerchant({merchantId: ""});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("merchantId");
      expect(result.error.message).toContain("expected a non-empty string");
    }
  });

  it("accepts EMPTY_GUID sentinel and attempts fetch", async () => {
    const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";
    const mockMerchantEmpty = buildMerchant({id: EMPTY_GUID, name: "Empty Merchant"});
    mockFetchWithTimeout.mockResolvedValue(
      createJsonResponse(mockMerchantEmpty, {status: 200}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result = await fetchMerchant({merchantId: EMPTY_GUID});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/merchants/${EMPTY_GUID}`,
      expect.objectContaining({
        headers: expect.objectContaining({Authorization: "Bearer jwt-1"}),
      }),
    );
  });

  it("accepts LAST_GUID sentinel and attempts fetch", async () => {
    const LAST_GUID = "99999999-9999-9999-9999-999999999999";
    const mockMerchantLast = buildMerchant({id: LAST_GUID, name: "Last Merchant"});
    mockFetchWithTimeout.mockResolvedValue(
      createJsonResponse(mockMerchantLast, {status: 200}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result = await fetchMerchant({merchantId: LAST_GUID});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/merchants/${LAST_GUID}`,
      expect.objectContaining({
        headers: expect.objectContaining({Authorization: "Bearer jwt-1"}),
      }),
    );
  });

  it("returns 'Merchant not found' for HTTP 404 responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Not found", {status: 404, statusText: "Not Found"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("404");
      expect(result.error.message).toContain("Not found");
    }
  });

  it("returns a generic error message for HTTP 500 responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Internal server error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("500");
    }
  });

  it("returns a generic error message for HTTP 403 responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Forbidden", {status: 403, statusText: "Forbidden"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("403");
    }
  });

  it("returns a generic error message for HTTP 401 responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Unauthorized", {status: 401, statusText: "Unauthorized"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("401");
    }
  });

  it("handles fetch failures with error result", async () => {
    const networkError = new Error("Network failure");
    mockFetchWithTimeout.mockRejectedValue(networkError);

    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("Network failure");
    }
  });

  it("handles non-Error exceptions thrown during fetch", async () => {
    mockFetchWithTimeout.mockRejectedValue("String error");

    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(false);
    if (!result.success) {
      // Production catch converts non-Error to new Error("An unexpected error occurred")
      // which is then classified as NETWORK_ERROR by createErrorResult
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toBeDefined();
    }
  });

  it("handles authentication failures gracefully", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("Auth failed");
    }
  });

  it("parses the merchant response correctly", async () => {
    const detailedMerchant = buildMerchant({
      id: merchantId,
      name: "Detailed Supermarket",
      description: "A detailed merchant description",
    });
    mockFetchWithTimeout.mockResolvedValue(
      createJsonResponse(detailedMerchant, {status: 200}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        id: merchantId,
        name: "Detailed Supermarket",
        description: "A detailed merchant description",
      });
    }
  });

  it("handles response.json() parsing errors", async () => {
    const malformedResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => {
        throw new Error("JSON parse error");
      },
      text: async () => "",
    } as Response;
    mockFetchWithTimeout.mockResolvedValue(malformedResponse as Awaited<ReturnType<typeof fetchWithTimeout>>);

    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("JSON parse error");
    }
  });

  it("handles response.text() parsing errors for error responses", async () => {
    const errorResponse = {
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({}),
      text: async () => {
        throw new Error("Text parse error");
      },
    } as Response;
    mockFetchWithTimeout.mockResolvedValue(errorResponse as Awaited<ReturnType<typeof fetchWithTimeout>>);

    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("preserves all merchant fields in the response", async () => {
    const fullMerchant: Merchant = buildMerchant({
      id: merchantId,
      name: "Full Merchant",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      lastUpdatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    mockFetchWithTimeout.mockResolvedValue(createJsonResponse(fullMerchant, {status: 200}) as Awaited<ReturnType<typeof fetchWithTimeout>>);

    const result = await fetchMerchant({merchantId});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(merchantId);
      expect(result.data.name).toBe("Full Merchant");
      expect(result.data.createdAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
      expect(result.data.lastUpdatedAt).toEqual(new Date("2026-01-02T00:00:00.000Z"));
    }
  });
});
