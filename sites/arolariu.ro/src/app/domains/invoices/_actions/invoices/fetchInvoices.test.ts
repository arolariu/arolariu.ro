import {describe, expect, it} from "vitest";
import {buildInvoice} from "../../../../../../tests/helpers/builders/domain";
import {apiUrl, auth, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {fetchInvoices} from "./fetchInvoices";

describe("fetchInvoices", () => {
  const firstId = "11111111-1111-4111-8111-111111111111";
  const secondId = "22222222-2222-4222-8222-222222222222";
  const invoiceOwner = "44444444-4444-4444-8444-444444444444";
  const merchantReference = "55555555-5555-4555-8555-555555555555";

  it("requests the invoice list with bearer authorization and returns invoices in API order", async () => {
    const invoices = [
      buildInvoice({id: firstId, userIdentifier: invoiceOwner, merchantReference}),
      buildInvoice({id: secondId, userIdentifier: invoiceOwner, merchantReference, name: "", description: ""}),
    ];
    fetchAtHttp.mockResolvedValue(Response.json(invoices));

    const result = await fetchInvoices();

    expect(result).toMatchObject({success: true, data: [{id: firstId}, {id: secondId, name: "", description: ""}]});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(`${apiUrl}/rest/v1/invoices/`, expect.objectContaining({cache: "no-store"}));
    const headers = new Headers(fetchAtHttp.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toMatch(/^Bearer \S+$/u);
    expect(headers.get("content-type")).toBe("application/json");
  });

  it.each([
    [500, "Internal Server Error"],
    [400, "Bad Request"],
  ] as const)("returns the upstream status in the HTTP %i failure", async (status, statusText) => {
    fetchAtHttp.mockResolvedValue(new Response("Upstream error", {status, statusText}));

    const result = await fetchInvoices();

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: `Failed to fetch invoices: ${status} ${statusText}`}});
  });

  it("does not make the request when Clerk rejects", async () => {
    auth.mockRejectedValue(new Error("Auth failed"));

    const result = await fetchInvoices();

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Auth failed"}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it.each([
    {label: "network error", reason: new Error("Network error"), code: "NETWORK_ERROR", message: "Network error"},
    {label: "non-Error rejection", reason: null, code: "NETWORK_ERROR", message: "An unexpected error occurred"},
    {
      label: "aborted request",
      reason: new DOMException("Request aborted", "AbortError"),
      code: "TIMEOUT_ERROR",
      message: expect.stringMatching(/^Request timed out after \d+ms$/u),
    },
  ])("returns a useful failure for $label", async ({reason, code, message}) => {
    fetchAtHttp.mockRejectedValue(reason);

    const result = await fetchInvoices();

    expect(result).toEqual({success: false, error: {code, message}});
  });

  it.each([
    {label: "non-array payload", payload: {}},
    {label: "malformed invoice in an array", payload: [{}]},
  ])("returns a server failure for a $label", async ({payload}) => {
    fetchAtHttp.mockResolvedValue(Response.json(payload));

    const result = await fetchInvoices();

    expect(result).toEqual({
      success: false,
      error: {code: "SERVER_ERROR", message: "The server returned unexpected data. Please try again later."},
    });
  });
});
