/**
 * @fileoverview Unit tests for the invoice analysis enqueue server action.
 * @module app/domains/invoices/_actions/invoices/analyzeInvoice.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import type {AnalyzeInvoiceRequest} from "@/types/invoices";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");

const {analyzeInvoice} = await import("./analyzeInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("analyzeInvoice", () => {
  const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
  const acceptedResponse = {
    runId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    targetType: "invoice",
    targetId: invoiceIdentifier,
    status: "queued",
    profile: "comprehensive",
    acceptedCapabilities: ["documentExtraction", "invoiceClassification"],
    acceptedAt: "2026-08-17T19:40:42.187Z",
  } as const;
  const request: AnalyzeInvoiceRequest = {
    profile: "comprehensive",
    overrides: {
      recipeGeneration: {enabled: true, maximumRecipes: 3},
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse(acceptedResponse, {status: 202, statusText: "Accepted"}));
  });

  it("posts only the profile and overrides with the enqueue timeout", async () => {
    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result).toEqual({success: true, data: acceptedResponse});
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceIdentifier}/analyze`,
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
    expect(body).not.toHaveProperty("invoiceIdentifier");
  });

  it("returns the accepted response only for the HTTP 202 enqueue contract", async () => {
    // Arrange
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse(acceptedResponse, {status: 200, statusText: "OK"}));

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNKNOWN_ERROR");
      expect(result.error.status).toBe(200);
    }
  });

  it("rejects a successful response with an invalid accepted capability", async () => {
    // Arrange
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse(
        {...acceptedResponse, acceptedCapabilities: ["not-a-capability"]},
        {status: 202, statusText: "Accepted"},
      ),
    );

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("UNKNOWN_ERROR");
      expect(result.error.message).toContain("invalid acceptance response");
    }
  });

  it("rejects a response accepted for a different invoice", async () => {
    // Arrange
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse(
        {...acceptedResponse, targetId: "22222222-2222-4222-8222-222222222222"},
        {status: 202, statusText: "Accepted"},
      ),
    );

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("invalid acceptance response");
    }
  });

  it("returns a validation error without calling auth for an invalid invoice identifier", async () => {
    // Act
    const result = await analyzeInvoice({invoiceIdentifier: "not-a-guid", request});

    // Assert
    expect(result.success).toBe(false);
    expect(mockFetchUser).not.toHaveBeenCalled();
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.message).toContain("invoiceIdentifier");
    }
  });

  it("returns a mapped error result when the enqueue request fails", async () => {
    // Arrange
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Internal server error", {status: 500, statusText: "Internal Server Error"}),
    );

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("SERVER_ERROR");
      expect(result.error.status).toBe(500);
    }
  });

  it("returns a timeout error when the authenticated request throws", async () => {
    // Arrange
    mockFetchWithTimeout.mockRejectedValue(new Error("Request timed out after 15000ms"));

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("TIMEOUT_ERROR");
    }
  });
});
