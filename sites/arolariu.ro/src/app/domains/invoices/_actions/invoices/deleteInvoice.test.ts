import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {describe, expect, it, vi} from "vitest";
import {deleteInvoice} from "./deleteInvoice";

const invoiceId = "11111111-1111-4111-8111-111111111111";

describe("deleteInvoice", () => {
  it("uses the native DELETE boundary and revalidates only after success", async () => {
    installAnalysisFetchHandler(() => new Response(null, {status: 204}));

    const result = await deleteInvoice({invoiceId});

    expect(result).toEqual({success: true, data: undefined});
    expect(getAnalysisApiRequests()).toContainEqual(
      expect.objectContaining({
        url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}`,
        init: expect.objectContaining({method: "DELETE"}),
      }),
    );
  });

  it("does not read or disclose a rejected deletion body", async () => {
    const sensitiveBody = "provider body with SAS URL";
    const response = new Response(sensitiveBody, {status: 500});
    const readBody = vi.spyOn(response, "text");
    installAnalysisFetchHandler(() => response);

    const result = await deleteInvoice({invoiceId});

    expect(readBody).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(sensitiveBody);
  });
});
