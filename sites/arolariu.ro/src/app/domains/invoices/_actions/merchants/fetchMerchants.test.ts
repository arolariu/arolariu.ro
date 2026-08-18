import {installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {describe, expect, it, vi} from "vitest";
import {fetchMerchants} from "./fetchMerchants";

describe("fetchMerchants", () => {
  it("does not read, log, or return a rejected merchant collection body", async () => {
    const sensitiveBody = "merchant OCR and provider payload";
    const response = new Response(sensitiveBody, {status: 500});
    const readBody = vi.spyOn(response, "text");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    installAnalysisFetchHandler(() => response);

    const result = await fetchMerchants();

    expect(readBody).not.toHaveBeenCalled();
    expect(JSON.stringify([result, ...consoleError.mock.calls])).not.toContain(sensitiveBody);
  });
});
