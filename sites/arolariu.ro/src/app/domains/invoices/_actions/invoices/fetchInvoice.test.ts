import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {createInvoiceBuilder} from "@/data/mocks/invoice";
import {describe, expect, it, vi} from "vitest";
import {fetchInvoice} from "./fetchInvoice";

const invoiceId = "11111111-1111-4111-8111-111111111111";

describe("fetchInvoice", () => {
  it("strictly revives a complete invoice from the native fetch boundary", async () => {
    installAnalysisFetchHandler(() => Response.json(createInvoiceBuilder().withId(invoiceId).build()));

    const result = await fetchInvoice({invoiceId});

    expect(result.success).toBe(true);
    expect(getAnalysisApiRequests()).toContainEqual(expect.objectContaining({url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}`}));
    if (result.success) expect(result.data.createdAt).toBeInstanceOf(Date);
  });

  it("does not read or disclose a rejected body", async () => {
    const sensitiveBody = "SAS URL and provider OCR";
    const response = new Response(sensitiveBody, {status: 500});
    const readBody = vi.spyOn(response, "text");
    installAnalysisFetchHandler(() => response);

    const result = await fetchInvoice({invoiceId});

    expect(readBody).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(sensitiveBody);
  });
});
