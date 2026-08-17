/**
 * @fileoverview Real-boundary tests for the merchant analysis enqueue action.
 * @module app/domains/invoices/_actions/merchants/analyzeMerchant.test
 */

import {
  ANALYSIS_API_URL,
  getAnalysisApiRequests,
  installAnalysisFetchHandler,
  type AnalysisFetchRequest,
} from "@/../tests/helpers/analysisBoundary";
import {analysisClerk} from "@/../tests/helpers/analysisClerk";
import type {AnalyzeMerchantRequest} from "@/types/invoices";
import {beforeEach, describe, expect, it} from "vitest";
import {analyzeMerchant} from "./analyzeMerchant";

const merchantIdentifier = "22222222-2222-4222-8222-222222222222";
const request: AnalyzeMerchantRequest = {
  profile: "balanced",
  overrides: {},
};

const acceptedResponse = {
  runId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  targetType: "merchant",
  targetId: merchantIdentifier,
  status: "queued",
  profile: "balanced",
  acceptedCapabilities: ["merchantClassification", "descriptionGeneration"],
  acceptedAt: "2026-08-17T19:40:42.187Z",
} as const;

let apiHandler: (request: AnalysisFetchRequest) => Response | Promise<Response>;

function acceptedJsonResponse(body: unknown = acceptedResponse, status = 202): Response {
  return new Response(JSON.stringify(body), {status, statusText: status === 202 ? "Accepted" : "OK"});
}

function getOnlyApiRequest(): AnalysisFetchRequest {
  const requestAtBoundary = getAnalysisApiRequests()[0];
  if (!requestAtBoundary) {
    throw new Error("Expected the real action to send an API request.");
  }

  return requestAtBoundary;
}

describe("analyzeMerchant", () => {
  beforeEach(() => {
    analysisClerk.auth.mockResolvedValue({isAuthenticated: false, userId: null});
    analysisClerk.currentUser.mockResolvedValue(null);
    apiHandler = () => acceptedJsonResponse();
    installAnalysisFetchHandler((requestAtBoundary) => apiHandler(requestAtBoundary));
  });

  it("posts the merchant-only request contract with a fifteen-second timeout", async () => {
    // Act
    const result = await analyzeMerchant({merchantIdentifier, request});

    // Assert
    expect(result).toEqual({success: true, data: acceptedResponse});
    const requestAtBoundary = getOnlyApiRequest();
    expect(requestAtBoundary).toMatchObject({
      url: `${ANALYSIS_API_URL}/rest/v1/merchants/${merchantIdentifier}/analyze`,
      init: expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer /u),
          "Content-Type": "application/json",
        }),
      }),
    });
    expect(requestAtBoundary.init?.body).toBe(JSON.stringify(request));
  });

  it("rejects an acceptance response for a different target type", async () => {
    // Arrange
    apiHandler = () => acceptedJsonResponse({...acceptedResponse, targetType: "invoice"});

    // Act
    const result = await analyzeMerchant({merchantIdentifier, request});

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {code: "UNKNOWN_ERROR", message: expect.stringContaining("invalid acceptance response")},
    });
  });

  it("rejects a response whose capabilities differ from the merchant request", async () => {
    // Arrange
    apiHandler = () => acceptedJsonResponse({...acceptedResponse, acceptedCapabilities: ["merchantClassification"]});

    // Act
    const result = await analyzeMerchant({merchantIdentifier, request});

    // Assert
    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invalid acceptance response")}});
  });

  it("accepts a custom response profile for actual merchant overrides", async () => {
    // Arrange
    const customRequest: AnalyzeMerchantRequest = {
      profile: "balanced",
      overrides: {descriptionGeneration: {enabled: true}},
    };
    const customResponse = {...acceptedResponse, profile: "custom"} as const;
    apiHandler = () => acceptedJsonResponse(customResponse);

    // Act
    const result = await analyzeMerchant({merchantIdentifier, request: customRequest});

    // Assert
    expect(result).toEqual({success: true, data: customResponse});
  });

  it("rejects a non-202 response even when it is otherwise successful", async () => {
    // Arrange
    apiHandler = () => acceptedJsonResponse(acceptedResponse, 201);

    // Act
    const result = await analyzeMerchant({merchantIdentifier, request});

    // Assert
    expect(result).toMatchObject({success: false, error: {status: 201}});
  });

  it("returns a validation error without crossing the authentication or fetch boundaries for an invalid merchant identifier", async () => {
    // Act
    const result = await analyzeMerchant({merchantIdentifier: "not-a-guid", request});

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {code: "VALIDATION_ERROR", message: expect.stringContaining("merchantIdentifier")},
    });
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });

  it.each([null, undefined, [], {merchantIdentifier}, {request}])(
    "returns a validation result without crossing the authentication or fetch boundaries for malformed outer input %#",
    async (input) => {
      // Act
      const result = await analyzeMerchant(input);

      // Assert
      expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
      expect(getAnalysisApiRequests()).toHaveLength(0);
    },
  );

  it("returns a network error when the Clerk boundary rejects authentication", async () => {
    // Arrange
    analysisClerk.auth.mockRejectedValue(new Error("Auth failed"));

    // Act
    const result = await analyzeMerchant({merchantIdentifier, request});

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "NETWORK_ERROR", message: "Unable to enqueue merchant analysis."}});
    expect(JSON.stringify(result)).not.toContain("Auth failed");
  });
});
