/**
 * @fileoverview Native-boundary tests for merchant updates.
 * @module app/domains/invoices/_actions/merchants/updateMerchant.test
 */

import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {ClassificationOrigin, ClassificationSystem} from "@/types/invoices";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {describe, expect, it} from "vitest";
import {updateMerchant} from "./updateMerchant";

const merchantId = "11111111-1111-4111-8111-111111111111";

const canonicalClassification = {
  system: ClassificationSystem.Nace21,
  code: "47.11",
  version: "2.1",
  officialLabel: "Retail sale in non-specialised stores",
  hierarchy: [{level: "class", code: "47.11", officialLabel: "Retail sale in non-specialised stores"}],
  origin: ClassificationOrigin.Manual,
  confidence: null,
  evidence: [],
} as const;

describe("updateMerchant", () => {
  it("accepts a sparse ContactInformation value and preserves its exact safe update payload", async () => {
    // Arrange
    const payload = {
      name: "Sparse Merchant",
      description: "A merchant created from incomplete analysis.",
      classification: {system: ClassificationSystem.Nace21, code: "47.11"},
      address: {
        fullName: "",
        address: "",
        phoneNumber: "",
        emailAddress: "",
        website: "",
      },
      parentCompanyId: null,
      additionalMetadata: {},
    } as const;
    installAnalysisFetchHandler((request) =>
      request.url === `${ANALYSIS_API_URL}/rest/v1/merchants/${merchantId}`
        ? TestDataBuilder.jsonResponse(
            TestDataBuilder.build("merchant", {
              id: merchantId,
              name: payload.name,
              description: payload.description,
              classification: canonicalClassification,
              address: payload.address,
              parentCompanyId: "00000000-0000-0000-0000-000000000000",
              additionalMetadata: payload.additionalMetadata,
            }),
            {status: 200},
          )
        : new Response("Unexpected request", {status: 500}),
    );

    // Act
    const result = await updateMerchant({merchantId, payload});

    // Assert
    expect(result).toMatchObject({success: true, data: {id: merchantId, address: payload.address}});
    expect(getAnalysisApiRequests()).toContainEqual({
      url: `${ANALYSIS_API_URL}/rest/v1/merchants/${merchantId}`,
      init: expect.objectContaining({method: "PUT", body: JSON.stringify(payload)}),
    });
  });

  it("rejects malformed outer input and malformed response JSON without own-module mocks", async () => {
    // Arrange
    installAnalysisFetchHandler((request) =>
      request.url === `${ANALYSIS_API_URL}/rest/v1/merchants/${merchantId}`
        ? TestDataBuilder.jsonResponse({invalid: true}, {status: 200})
        : new Response("Unexpected request", {status: 500}),
    );

    // Act
    const invalidInput = await updateMerchant(null);
    const invalidResponse = await updateMerchant({
      merchantId,
      payload: {
        name: "Merchant",
        description: "Description",
        classification: null,
        address: {fullName: "", address: "", phoneNumber: "", emailAddress: "", website: ""},
        parentCompanyId: null,
        additionalMetadata: {},
      },
    });

    // Assert
    expect(invalidInput).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(invalidResponse).toMatchObject({success: false, error: {code: "SERVER_ERROR"}});
  });
});
