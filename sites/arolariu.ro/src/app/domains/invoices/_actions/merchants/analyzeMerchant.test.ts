/**
 * @fileoverview Unit tests for the merchant analysis enqueue server action.
 * @module app/domains/invoices/_actions/merchants/analyzeMerchant.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import type {AnalyzeMerchantRequest} from "@/types/invoices";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";

const {analyzeMerchant} = await import("./analyzeMerchant");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("analyzeMerchant", () => {
  const merchantIdentifier = "22222222-2222-4222-8222-222222222222";
  const acceptedResponse = {
    runId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    targetType: "merchant",
    targetId: merchantIdentifier,
    status: "queued",
    profile: "balanced",
    acceptedCapabilities: ["merchantClassification", "descriptionGeneration"],
    acceptedAt: "2026-08-17T19:40:42.187Z",
  } as const;
  const request: AnalyzeMerchantRequest = {
    profile: "balanced",
    overrides: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse(acceptedResponse, {status: 202, statusText: "Accepted"}));
  });

  it("posts the merchant-only request contract with a fifteen-second timeout", async () => {
    // Act
    const result = await analyzeMerchant({merchantIdentifier, request});

    // Assert
    expect(result).toEqual({success: true, data: acceptedResponse});
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/merchants/${merchantIdentifier}/analyze`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
      15_000,
    );

    const callArguments = mockFetchWithTimeout.mock.calls[0];
    const body = JSON.parse(callArguments?.[1]?.body as string) as Record<string, unknown>;
    expect(body).toEqual(request);
    expect(body).not.toHaveProperty("userIdentifier");
    expect(body).not.toHaveProperty("merchantIdentifier");
    expect(body).not.toHaveProperty("invoiceClassification");
  });

  it("rejects an acceptance response for a different target type", async () => {
    // Arrange
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse({...acceptedResponse, targetType: "invoice"}, {status: 202, statusText: "Accepted"}),
    );

    // Act
    const result = await analyzeMerchant({merchantIdentifier, request});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNKNOWN_ERROR");
      expect(result.error.message).toContain("invalid acceptance response");
    }
  });

  it("rejects a response whose capabilities differ from the merchant request", async () => {
    // Arrange
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse(
        {...acceptedResponse, acceptedCapabilities: ["merchantClassification"]},
        {status: 202, statusText: "Accepted"},
      ),
    );

    // Act
    const result = await analyzeMerchant({merchantIdentifier, request});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("invalid acceptance response");
    }
  });

  it("accepts a custom response profile for actual merchant overrides", async () => {
    // Arrange
    const customRequest: AnalyzeMerchantRequest = {
      profile: "balanced",
      overrides: {descriptionGeneration: {enabled: true}},
    };
    const customResponse = {...acceptedResponse, profile: "custom"} as const;
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse(customResponse, {status: 202, statusText: "Accepted"}));

    // Act
    const result = await analyzeMerchant({merchantIdentifier, request: customRequest});

    // Assert
    expect(result).toEqual({success: true, data: customResponse});
  });

  it("rejects a non-202 response even when it is otherwise successful", async () => {
    // Arrange
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse(acceptedResponse, {status: 201, statusText: "Created"}));

    // Act
    const result = await analyzeMerchant({merchantIdentifier, request});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.status).toBe(201);
    }
  });

  it("returns a validation error without calling auth for an invalid merchant identifier", async () => {
    // Act
    const result = await analyzeMerchant({merchantIdentifier: "not-a-guid", request});

    // Assert
    expect(result.success).toBe(false);
    expect(mockFetchUser).not.toHaveBeenCalled();
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.message).toContain("merchantIdentifier");
    }
  });

  it.each([null, undefined, [], {merchantIdentifier}, {request}])(
    "returns a validation result without calling auth for malformed outer input %#",
    async (input) => {
      // Act
      const result = await analyzeMerchant(input);

      // Assert
      expect(result).toMatchObject({
        success: false,
        error: {code: "VALIDATION_ERROR"},
      });
      expect(mockFetchUser).not.toHaveBeenCalled();
    },
  );

  it("returns a network error when authentication fails", async () => {
    // Arrange
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    // Act
    const result = await analyzeMerchant({merchantIdentifier, request});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
      expect(result.error.message).toContain("Auth failed");
    }
  });
});
