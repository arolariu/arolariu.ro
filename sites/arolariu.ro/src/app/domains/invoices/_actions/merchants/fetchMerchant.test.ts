import {installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {describe, expect, it, vi} from "vitest";
import {fetchMerchant} from "./fetchMerchant";

const merchantId = "11111111-1111-4111-8111-111111111111";

describe("fetchMerchant", () => {
  it("does not read, log, or return a rejected merchant body", async () => {
    const sensitiveBody = "merchant provider data and SAS URL";
    const response = new Response(sensitiveBody, {status: 500});
    const readBody = vi.spyOn(response, "text");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    installAnalysisFetchHandler(() => response);

    const result = await fetchMerchant({merchantId});

    expect(readBody).not.toHaveBeenCalled();
    expect(JSON.stringify([result, ...consoleError.mock.calls])).not.toContain(sensitiveBody);
  });
});
