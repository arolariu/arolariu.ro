/**
 * @fileoverview Unit tests for analyzeMerchant server action.
 * @module app/domains/invoices/_actions/analysis/analyzeMerchant.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
const {analyzeMerchant} = await import("./analyzeMerchant");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const fetchMock = vi.mocked(fetchWithTimeout);

describe("analyzeMerchant", () => {
  const merchantId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    fetchMock.mockResolvedValue({
      ok: true,
      status: 202,
      statusText: "Accepted",
      json: async () => "queue-message-42",
      text: async () => "",
    } as Response);
  });

  it("sends a flat capability request without a user identifier", async () => {
    await analyzeMerchant({merchantIdentifier: merchantId, profile: "balanced"});
    const [, init] = fetchMock.mock.calls[0]!;
    const body: unknown = JSON.parse(String(init?.body));
    expect(body).toStrictEqual({profile: "balanced"});
    expect(body).not.toHaveProperty("userIdentifier");
  });

  it("hits the merchant analyze route", async () => {
    await analyzeMerchant({merchantIdentifier: merchantId, profile: "fast"});
    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toContain(merchantId);
    expect(url).toContain("analyze");
  });

  it("returns the queue message identifier from the 202 body", async () => {
    const result = await analyzeMerchant({merchantIdentifier: merchantId, profile: "comprehensive"});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("queue-message-42");
    }
  });

  it("returns a failure when the 202 body is an object rather than a string", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({messageId: "x"}),
      text: async () => "",
    } as Response);
    const result = await analyzeMerchant({merchantIdentifier: merchantId, profile: "balanced"});
    expect(result.success).toBe(false);
  });

  it("never requests the custom profile", async () => {
    await analyzeMerchant({
      merchantIdentifier: merchantId,
      profile: "comprehensive",
      overrides: {descriptionGeneration: false},
    });
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as {profile: string};
    expect(["fast", "balanced", "comprehensive"]).toContain(body.profile);
  });

  it("returns an error for an invalid merchant id", async () => {
    const result = await analyzeMerchant({merchantIdentifier: "not-a-guid", profile: "fast"});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("merchantIdentifier");
    }
  });

  it("returns an error result for 5xx responses", async () => {
    fetchMock.mockResolvedValue(
      TestDataBuilder.textResponse("Server error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );
    const result = await analyzeMerchant({merchantIdentifier: merchantId, profile: "fast"});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
    }
  });

  it("returns an error result when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));
    const result = await analyzeMerchant({merchantIdentifier: merchantId, profile: "fast"});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Network error");
    }
  });

  it("returns an error result when auth throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));
    const result = await analyzeMerchant({merchantIdentifier: merchantId, profile: "fast"});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Auth failed");
    }
  });
});