import {InvoiceScanType} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {buildCreateInvoiceScanPayload} from "../../../../../../../tests/helpers/builders/domain";
import {apiUrl, auth, fetchAtHttp} from "../../../../../../../tests/setup/server-http";
import {attachScanToInvoice} from "./attachScanToInvoice";

const invoiceId = "11111111-1111-4111-8111-111111111111";
const payload = buildCreateInvoiceScanPayload({
  location: "https://storage.example.test/invoices/scan.jpg",
  additionalMetadata: {page: "1"},
});

describe("attachScanToInvoice", () => {
  it("posts the attachment with the transport metadata name and signed authorization", async () => {
    fetchAtHttp.mockResolvedValueOnce(new Response(null, {status: 201}));

    const result = await attachScanToInvoice({invoiceId, payload});

    expect(result).toEqual({success: true, data: undefined});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoiceId}/scans`,
      expect.objectContaining({method: "POST", cache: "no-store"}),
    );
    const options = fetchAtHttp.mock.calls[0]?.[1];
    const headers = new Headers(options?.headers);
    expect(headers.get("authorization")).toMatch(/^Bearer \S+$/u);
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(options?.body))).toEqual({
      type: InvoiceScanType.JPEG,
      location: payload.location,
      metadata: {page: "1"},
    });
  });

  it("rejects a malformed invoice identifier before Clerk or HTTP", async () => {
    const result = await attachScanToInvoice({invoiceId: "not-a-guid", payload});

    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invoiceId")}});
    expect(auth).not.toHaveBeenCalled();
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it.each([
    [400, "VALIDATION_ERROR", "Invalid scan data. Please check the scan details and try again."],
    [404, "NOT_FOUND", "Invoice not found. Please refresh and try again."],
    [500, "SERVER_ERROR", "An unexpected error occurred while attaching the scan. Please try again."],
  ] as const)("returns a public attachment failure for HTTP %i", async (status, code, message) => {
    fetchAtHttp.mockResolvedValueOnce(new Response("Attachment unavailable", {status, statusText: "Internal reason"}));

    const result = await attachScanToInvoice({invoiceId, payload});

    expect(result).toEqual({success: false, error: {code, message, status}});
  });

  it("does not attempt an attachment when Clerk rejects", async () => {
    auth.mockRejectedValueOnce(new Error("Auth service unavailable"));

    const result = await attachScanToInvoice({invoiceId, payload});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Auth service unavailable"}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it.each([
    ["connection rejected", "NETWORK_ERROR", "An unexpected error occurred"],
    [new DOMException("Aborted", "AbortError"), "TIMEOUT_ERROR", "Request timed out after 30000ms"],
  ] as const)("classifies transport rejection %s", async (reason, code, message) => {
    fetchAtHttp.mockRejectedValueOnce(reason);

    const result = await attachScanToInvoice({invoiceId, payload});

    expect(result).toEqual({success: false, error: {code, message}});
  });
});
