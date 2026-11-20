import {describe, expect, it} from "vitest";
import {apiUrl, auth, fetchAtHttp} from "../../../../../../../tests/setup/server-http";
import {deleteInvoiceMetadata} from "./deleteInvoiceMetadata";

describe("deleteInvoiceMetadata", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";
  const key = "user.note";

  it("deletes only the requested key using the backend's keys-array contract", async () => {
    fetchAtHttp.mockResolvedValueOnce(new Response(null, {status: 204}));

    const result = await deleteInvoiceMetadata({invoiceId, key});

    expect(result).toEqual({success: true, data: undefined});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoiceId}/metadata`,
      expect.objectContaining({method: "DELETE", cache: "no-store"}),
    );
    const [, options] = fetchAtHttp.mock.calls[0] ?? [];
    const headers = new Headers(options?.headers);
    expect(headers.get("authorization")).toMatch(/^Bearer \S+$/u);
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(options?.body))).toEqual({keys: [key]});
  });

  it("rejects a malformed identifier before authentication or HTTP", async () => {
    const result = await deleteInvoiceMetadata({invoiceId: "not-a-guid", key});

    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invoiceId")}});
    expect(auth).not.toHaveBeenCalled();
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it.each([
    [400, "VALIDATION_ERROR", "Failed to delete the invoice metadata. Please try again."],
    [500, "SERVER_ERROR", "A server error occurred while deleting the invoice metadata. Please try again later."],
  ] as const)("returns a public error when the backend responds with %i", async (status, code, message) => {
    fetchAtHttp.mockResolvedValueOnce(new Response("Metadata rejected", {status, statusText: "Internal reason"}));

    const result = await deleteInvoiceMetadata({invoiceId, key});

    expect(result).toEqual({
      success: false,
      error: {code, message, status},
    });
  });

  it("does not delete metadata when Clerk fails", async () => {
    auth.mockRejectedValueOnce(new Error("Auth service unavailable"));

    const result = await deleteInvoiceMetadata({invoiceId, key});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Auth service unavailable"}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it("returns an error when HTTP rejects with a non-Error reason", async () => {
    fetchAtHttp.mockRejectedValueOnce("Connection closed");

    const result = await deleteInvoiceMetadata({invoiceId, key});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "An unexpected error occurred"}});
  });
});
