import {installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {createInvoiceBuilder} from "@/data/mocks/invoice";
import {describe, expect, it, vi} from "vitest";
import {fetchInvoices} from "./fetchInvoices";

describe("fetchInvoices", () => {
  it("strictly revives every complete invoice", async () => {
    installAnalysisFetchHandler(() => Response.json([createInvoiceBuilder().build()]));

    const result = await fetchInvoices();

    expect(result.success).toBe(true);
    if (result.success) expect(result.data[0]?.paymentInformation.transactionDate).toBeInstanceOf(Date);
  });

  it("does not read or disclose a rejected collection body", async () => {
    const sensitiveBody = "OCR/provider/user data";
    const response = new Response(sensitiveBody, {status: 500});
    const readBody = vi.spyOn(response, "text");
    installAnalysisFetchHandler(() => response);

    const result = await fetchInvoices();

    expect(readBody).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(sensitiveBody);
  });
});
