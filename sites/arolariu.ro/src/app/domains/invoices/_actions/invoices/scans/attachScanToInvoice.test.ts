import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {InvoiceScanType} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {attachScanToInvoice} from "./attachScanToInvoice";

const invoiceId = "11111111-1111-4111-8111-111111111111";

describe("attachScanToInvoice", () => {
  it("attaches the exact supported scan DTO through native fetch", async () => {
    installAnalysisFetchHandler(() => new Response(null, {status: 201}));
    const payload = {
      type: InvoiceScanType.HEIF,
      location: "https://storage.analysis.test/invoices/scans/scan.heif",
      metadata: {pageNumber: 1},
    };

    const result = await attachScanToInvoice({invoiceId, payload});

    expect(result).toEqual({success: true, data: undefined});
    expect(getAnalysisApiRequests()).toContainEqual(
      expect.objectContaining({
        url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceId}/scans`,
        init: expect.objectContaining({body: JSON.stringify(payload)}),
      }),
    );
  });

  it("rejects HEIC before attachment", async () => {
    const result = await attachScanToInvoice({
      invoiceId,
      payload: {type: 9, location: "https://storage.analysis.test/invoices/scans/scan.heic", metadata: {}},
    });

    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });

  it("rejects deceptive storage hosts and containers before attachment", async () => {
    const result = await attachScanToInvoice({
      invoiceId,
      payload: {type: InvoiceScanType.JPEG, location: "https://storage.analysis.test.evil/invoices/scans/scan.jpg", metadata: {}},
    });

    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(getAnalysisApiRequests()).toHaveLength(0);
  });
});
