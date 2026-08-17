/**
 * @fileoverview Real-boundary tests for the invoice analysis enqueue action.
 * @module app/domains/invoices/_actions/invoices/analyzeInvoice.test
 */

import {
  ANALYSIS_API_URL,
  getAnalysisApiRequests,
  installAnalysisFetchHandler,
  type AnalysisFetchRequest,
} from "@/../tests/helpers/analysisBoundary";
import type {AnalyzeInvoiceRequest} from "@/types/invoices";
import {beforeEach, describe, expect, it} from "vitest";
import {analyzeInvoice} from "./analyzeInvoice";

const invoiceIdentifier = "abcdefab-cdef-4abc-8def-abcdefabcdef";
const request: AnalyzeInvoiceRequest = {
  profile: "comprehensive",
  overrides: {},
};

const acceptedResponse = {
  runId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  targetType: "invoice",
  targetId: invoiceIdentifier,
  status: "queued",
  profile: "comprehensive",
  acceptedCapabilities: [
    "documentExtraction",
    "merchantResolution",
    "invoiceSummary",
    "productClassification",
    "allergenAssessment",
    "invoiceClassification",
    "recipeGeneration",
  ],
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

describe("analyzeInvoice", () => {
  beforeEach(() => {
    apiHandler = () => acceptedJsonResponse();
    installAnalysisFetchHandler((requestAtBoundary) => apiHandler(requestAtBoundary));
  });

  it("posts only the profile and overrides with the enqueue timeout", async () => {
    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result).toEqual({success: true, data: acceptedResponse});
    const requestAtBoundary = getOnlyApiRequest();
    expect(requestAtBoundary).toMatchObject({
      url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceIdentifier}/analyze`,
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

  it("returns the accepted response only for the HTTP 202 enqueue contract", async () => {
    // Arrange
    apiHandler = () => acceptedJsonResponse(acceptedResponse, 200);

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "UNKNOWN_ERROR", status: 200}});
  });

  it("rejects a successful response with an invalid accepted capability", async () => {
    // Arrange
    apiHandler = () => acceptedJsonResponse({...acceptedResponse, acceptedCapabilities: ["not-a-capability"]});

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {code: "UNKNOWN_ERROR", message: expect.stringContaining("invalid acceptance response")},
    });
  });

  it("rejects an acknowledgement whose capability set differs from the resolved request", async () => {
    // Arrange
    apiHandler = () => acceptedJsonResponse({...acceptedResponse, acceptedCapabilities: ["documentExtraction"]});

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invalid acceptance response")}});
  });

  it("rejects a response accepted for a different invoice", async () => {
    // Arrange
    apiHandler = () => acceptedJsonResponse({...acceptedResponse, targetId: "22222222-2222-4222-8222-222222222222"});

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invalid acceptance response")}});
  });

  it("matches uppercase caller identifiers to lowercase acknowledgement identifiers", async () => {
    // Act
    const result = await analyzeInvoice({invoiceIdentifier: invoiceIdentifier.toUpperCase(), request});

    // Assert
    expect(result).toEqual({success: true, data: acceptedResponse});
  });

  it("accepts a custom effective profile when the request includes an override", async () => {
    // Arrange
    const customRequest: AnalyzeInvoiceRequest = {
      profile: "comprehensive",
      overrides: {documentExtraction: {enabled: true}},
    };
    const customResponse = {...acceptedResponse, profile: "custom"} as const;
    apiHandler = () => acceptedJsonResponse(customResponse);

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request: customRequest});

    // Assert
    expect(result).toEqual({success: true, data: customResponse});
  });

  it("rejects an acknowledgement with a permissive but non-RFC-3339 acceptance date", async () => {
    // Arrange
    apiHandler = () => acceptedJsonResponse({...acceptedResponse, acceptedAt: "2026-08-17 19:40:42Z"});

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invalid acceptance response")}});
  });

  it("returns a validation error without crossing the authentication or fetch boundaries for an invalid invoice identifier", async () => {
    // Act
    const result = await analyzeInvoice({invoiceIdentifier: "not-a-guid", request});

    // Assert
    expect(result).toMatchObject({
      success: false,
      error: {code: "VALIDATION_ERROR", message: expect.stringContaining("invoiceIdentifier")},
    });
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });

  it.each([null, undefined, [], {invoiceIdentifier}, {request}])(
    "returns a validation result without crossing the authentication or fetch boundaries for malformed outer input %#",
    async (input) => {
      // Act
      const result = await analyzeInvoice(input);

      // Assert
      expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
      expect(getAnalysisApiRequests()).toHaveLength(0);
    },
  );

  it("returns a mapped error result when the enqueue request fails", async () => {
    // Arrange
    apiHandler = () => new Response("Internal server error", {status: 500, statusText: "Internal Server Error"});

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "SERVER_ERROR", status: 500}});
  });

  it("returns a timeout error when the native request throws", async () => {
    // Arrange
    apiHandler = () => Promise.reject(new Error("Request timed out after 15000ms"));

    // Act
    const result = await analyzeInvoice({invoiceIdentifier, request});

    // Assert
    expect(result).toMatchObject({success: false, error: {code: "TIMEOUT_ERROR"}});
  });
});
