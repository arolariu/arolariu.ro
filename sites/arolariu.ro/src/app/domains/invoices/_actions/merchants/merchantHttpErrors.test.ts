import {describe, expect, it} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {analyzeMerchant} from "../analysis/analyzeMerchant";
import {fetchMerchant} from "./fetchMerchant";
import {fetchMerchants} from "./fetchMerchants";
import {updateMerchant} from "./updateMerchant";

const merchantId = "22222222-2222-4222-8222-222222222222";
const merchant = TestDataBuilder.build("merchant", {id: merchantId});

describe("merchant HTTP failures", () => {
  const fetchOne = () => fetchMerchant({merchantId});
  const fetchAll = () => fetchMerchants();
  const update = () => updateMerchant({merchantId, merchant});
  const analyze = () => analyzeMerchant({merchantIdentifier: merchantId, profile: "fast"});

  it.each([
    ["fetchMerchant", 401, "AUTH_ERROR", "Failed to fetch merchant. Please try again.", fetchOne],
    ["fetchMerchant", 403, "AUTH_ERROR", "Failed to fetch merchant. Please try again.", fetchOne],
    ["fetchMerchant", 404, "NOT_FOUND", "Merchant not found", fetchOne],
    ["fetchMerchant", 500, "SERVER_ERROR", "Failed to fetch merchant. Please try again.", fetchOne],
    ["fetchMerchants", 400, "VALIDATION_ERROR", "Failed to fetch merchants. Please refresh the page or contact support.", fetchAll],
    ["fetchMerchants", 401, "AUTH_ERROR", "Failed to fetch merchants. Please refresh the page or contact support.", fetchAll],
    ["fetchMerchants", 403, "AUTH_ERROR", "Failed to fetch merchants. Please refresh the page or contact support.", fetchAll],
    ["fetchMerchants", 404, "NOT_FOUND", "No merchants found", fetchAll],
    ["fetchMerchants", 500, "SERVER_ERROR", "A server error occurred. Please try again later.", fetchAll],
    ["fetchMerchants", 502, "SERVER_ERROR", "A server error occurred. Please try again later.", fetchAll],
    ["fetchMerchants", 503, "SERVER_ERROR", "A server error occurred. Please try again later.", fetchAll],
    ["updateMerchant", 400, "VALIDATION_ERROR", "Failed to update the merchant. Please check your input and try again.", update],
    ["updateMerchant", 500, "SERVER_ERROR", "A server error occurred. Please try again later.", update],
    ["analyzeMerchant", 400, "VALIDATION_ERROR", "Failed to analyze the merchant. Please try again.", analyze],
    ["analyzeMerchant", 500, "SERVER_ERROR", "A server error occurred during analysis. Please try again later.", analyze],
  ] as const)("%s returns a public result for HTTP %i", async (_action, status, code, message, run) => {
    fetchAtHttp.mockResolvedValueOnce(new Response("Private backend detail", {status, statusText: "Internal reason"}));

    const result = await run();

    expect(fetchAtHttp).toHaveBeenCalledTimes(1);
    expect(result).toEqual({success: false, error: {code, status, message}});
  });
});
