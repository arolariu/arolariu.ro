/**
 * @fileoverview Unit tests for updateMerchant server action.
 * @module app/domains/invoices/_actions/merchants/updateMerchant.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
const {updateMerchant} = await import("./updateMerchant");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const fetchMock = vi.mocked(fetchWithTimeout);

describe("updateMerchant", () => {
  const merchantId = "33333333-3333-4333-8333-333333333333";
  const merchant = TestDataBuilder.build("merchant", {id: merchantId});

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    fetchMock.mockResolvedValue(TestDataBuilder.jsonResponse(TestDataBuilder.build("merchant", {id: merchantId}), {status: 202}));
  });

  it("sends explicit editable fields, not the whole merchant object", async () => {
    await updateMerchant({merchantId, merchant});
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("description");
    expect(body).not.toHaveProperty("id");
    expect(body).toHaveProperty("category", merchant.category ?? -1);
    expect(body).not.toHaveProperty("totalSpent");
  });

  it.each([2001, null] as const)("saves only explicit category intent (%s)", async (category) => {
    await updateMerchant({merchantId, merchant: {category}});
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({category: category ?? -1});
  });

  it("uses PUT and targets the merchant route", async () => {
    await updateMerchant({merchantId, merchant});
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain(merchantId);
    expect((init as RequestInit).method).toBe("PUT");
  });

  it("returns the updated merchant on success", async () => {
    const result = await updateMerchant({merchantId, merchant});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(merchantId);
    }
  });

  it("returns an error for an invalid merchant id", async () => {
    const result = await updateMerchant({merchantId: "not-a-guid", merchant});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("merchantId");
    }
  });

  it("returns a server failure when the server returns a malformed merchant", async () => {
    fetchMock.mockResolvedValue(TestDataBuilder.jsonResponse({}, {status: 202}));
    const result = await updateMerchant({merchantId, merchant});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SERVER_ERROR");
    }
  });

  it("returns an unexpected error message when fetch rejects with a non-Error value", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockRejectedValue("boom");
    const result = await updateMerchant({merchantId, merchant});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("An unexpected error occurred");
    }
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("returns an error result when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));
    const result = await updateMerchant({merchantId, merchant});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Network error");
    }
  });
});
