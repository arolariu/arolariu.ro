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
    expect(body).toHaveProperty("classificationCode");
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("category");
    expect(body).not.toHaveProperty("totalSpent");
  });

  it("emits classificationCode: null when origin is Analysis (provenance protection)", async () => {
    const analysisMerchant = TestDataBuilder.build("merchant", {
      id: merchantId,
      classification: {
        origin: "Analysis" as const,
        system: "NACE_2_1" as const,
        code: "47.11",
        version: "2.1",
        officialLabel: "Retail sale in non-specialised stores",
        hierarchy: [],
        confidence: 0.9,
        evidence: [],
      },
    });
    await updateMerchant({merchantId, merchant: analysisMerchant});
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as {classificationCode: unknown};
    expect(body.classificationCode).toBeNull();
  });

  it("emits the manual classificationCode when origin is Manual", async () => {
    const manualMerchant = TestDataBuilder.build("merchant", {
      id: merchantId,
      classification: {
        origin: "Manual" as const,
        system: "NACE_2_1" as const,
        code: "47.11",
        version: "2.1",
        officialLabel: "Retail sale in non-specialised stores",
        hierarchy: [],
        confidence: null,
        evidence: [],
      },
    });
    await updateMerchant({merchantId, merchant: manualMerchant});
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as {classificationCode: unknown};
    expect(body.classificationCode).toBe("47.11");
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

  it("returns a validation failure when the server returns a malformed merchant", async () => {
    fetchMock.mockResolvedValue(TestDataBuilder.jsonResponse({}, {status: 202}));
    const result = await updateMerchant({merchantId, merchant});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns an error result for 5xx responses", async () => {
    fetchMock.mockResolvedValue(
      TestDataBuilder.textResponse("Server error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );
    const result = await updateMerchant({merchantId, merchant});
    expect(result.success).toBe(false);
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