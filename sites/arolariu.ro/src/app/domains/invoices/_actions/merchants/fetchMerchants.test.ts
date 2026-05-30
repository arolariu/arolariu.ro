/**
 * @fileoverview Unit tests for fetchMerchants server action.
 * @module app/domains/invoices/_actions/merchants/fetchMerchants.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import type {Merchant} from "@/types/invoices";
import {MerchantCategory} from "@/types/invoices";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");

const {fetchMerchants} = await import("./fetchMerchants");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("fetchMerchants", () => {
  const mockMerchants: Merchant[] = [
    TestDataBuilder.build("merchant", {id: "merchant-1", name: "Supermarket A", category: MerchantCategory.SUPERMARKET}),
    TestDataBuilder.build("merchant", {id: "merchant-2", name: "Local Shop B", category: MerchantCategory.LOCAL_SHOP}),
    TestDataBuilder.build("merchant", {id: "merchant-3", name: "Online Store C", category: MerchantCategory.ONLINE_SHOP}),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse(mockMerchants, {status: 200}));
  });

  it("fetches all merchants successfully", async () => {
    const result = await fetchMerchants();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toMatchObject({id: "merchant-1", name: "Supermarket A"});
      expect(result.data[1]).toMatchObject({id: "merchant-2", name: "Local Shop B"});
      expect(result.data[2]).toMatchObject({id: "merchant-3", name: "Online Store C"});
    }
  });

  it("constructs the correct API request URL and headers", async () => {
    await fetchMerchants();

    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      "/rest/v1/merchants",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("fetches user JWT before making the API request", async () => {
    await fetchMerchants();

    expect(mockFetchUser).toHaveBeenCalledOnce();
    expect(mockFetchUser).toHaveBeenCalledBefore(mockFetchWithTimeout);
  });

  it("accepts an empty params object without errors", async () => {
    const result = await fetchMerchants({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
    }
  });

  it("handles an empty merchant list gracefully", async () => {
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse([], {status: 200}));

    const result = await fetchMerchants();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
      expect(result.data).toHaveLength(0);
    }
  });

  it("returns 'No merchants found' for HTTP 404 responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.textResponse("Not found", {status: 404, statusText: "Not Found"}));

    const result = await fetchMerchants();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("404");
      expect(result.error.message).toContain("Not found");
    }
  });

  it("returns a server error message for HTTP 500 responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Internal server error", {status: 500, statusText: "Internal Server Error"}),
    );

    const result = await fetchMerchants();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Internal server error");
    }
  });

  it("returns a server error message for HTTP 502 responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.textResponse("Bad gateway", {status: 502, statusText: "Bad Gateway"}));

    const result = await fetchMerchants();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("502");
    }
  });

  it("returns a server error message for HTTP 503 responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Service unavailable", {status: 503, statusText: "Service Unavailable"}),
    );

    const result = await fetchMerchants();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("503");
    }
  });

  it("returns a generic error message for HTTP 400 responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.textResponse("Bad request", {status: 400, statusText: "Bad Request"}));

    const result = await fetchMerchants();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("400");
    }
  });

  it("returns a generic error message for HTTP 401 responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.textResponse("Unauthorized", {status: 401, statusText: "Unauthorized"}));

    const result = await fetchMerchants();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("401");
    }
  });

  it("returns a generic error message for HTTP 403 responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.textResponse("Forbidden", {status: 403, statusText: "Forbidden"}));

    const result = await fetchMerchants();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("403");
    }
  });

  it("handles fetch failures with error result", async () => {
    const networkError = new Error("Network failure");
    mockFetchWithTimeout.mockRejectedValue(networkError);

    const result = await fetchMerchants();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("Network failure");
    }
  });

  it("handles non-Error exceptions thrown during fetch", async () => {
    mockFetchWithTimeout.mockRejectedValue("String error");

    const result = await fetchMerchants();

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

    const result = await fetchMerchants();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("Auth failed");
    }
  });

  it("parses the merchant array response correctly", async () => {
    const detailedMerchants: Merchant[] = [
      TestDataBuilder.build("merchant", {
        id: "merchant-1",
        name: "Detailed Supermarket",
        description: "A detailed merchant description",
      }),
    ];
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse(detailedMerchants, {status: 200}));

    const result = await fetchMerchants();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: "merchant-1",
        name: "Detailed Supermarket",
        description: "A detailed merchant description",
      });
    }
  });

  it("handles response.json() parsing errors", async () => {
    const malformedResponse = new Response("", {status: 200, statusText: "OK"});
    // Override json to throw
    malformedResponse.json = async () => {
      throw new Error("JSON parse error");
    };
    mockFetchWithTimeout.mockResolvedValue(malformedResponse);

    const result = await fetchMerchants();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("JSON parse error");
    }
  });

  it("handles response.text() parsing errors for error responses", async () => {
    const errorResponse = new Response("", {status: 400, statusText: "Bad Request"});
    // Override text to throw
    errorResponse.text = async () => {
      throw new Error("Text parse error");
    };
    mockFetchWithTimeout.mockResolvedValue(errorResponse);

    const result = await fetchMerchants();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("preserves all merchant fields in the response", async () => {
    const fullMerchants: Merchant[] = [
      TestDataBuilder.build("merchant", {
        id: "merchant-1",
        name: "Full Merchant",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        lastUpdatedAt: new Date("2026-01-02T00:00:00.000Z"),
      }),
    ];
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse(fullMerchants, {status: 200}));

    const result = await fetchMerchants();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe("merchant-1");
      expect(result.data[0]?.name).toBe("Full Merchant");
      expect(result.data[0]?.createdAt).toBe("2026-01-01T00:00:00.000Z");
      expect(result.data[0]?.lastUpdatedAt).toBe("2026-01-02T00:00:00.000Z");
    }
  });

  it("handles a large merchant list without errors", async () => {
    const largeMerchantList: Merchant[] = Array.from({length: 100}, (_, i) =>
      TestDataBuilder.build("merchant", {
        id: `merchant-${i}`,
        name: `Merchant ${i}`,
      }),
    );
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse(largeMerchantList, {status: 200}));

    const result = await fetchMerchants();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(100);
      expect(result.data[0]).toMatchObject({id: "merchant-0", name: "Merchant 0"});
      expect(result.data[99]).toMatchObject({id: "merchant-99", name: "Merchant 99"});
    }
  });
});
