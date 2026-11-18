import {describe, expect, it} from "vitest";
import {apiUrl, auth, fetchAtHttp} from "../../../../../../../tests/setup/server-http";
import {addInvoiceMetadata} from "./addInvoiceMetadata";

describe("addInvoiceMetadata", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";
  const entries = {category: "travel", aiConfidence: 0.95, archived: true};

  it("patches the metadata at the invoice endpoint without coercing values", async () => {
    fetchAtHttp.mockResolvedValueOnce(new Response(null, {status: 204}));

    const result = await addInvoiceMetadata({invoiceId, entries});

    expect(result).toEqual({success: true, data: undefined});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoiceId}/metadata`,
      expect.objectContaining({method: "PATCH", cache: "no-store"}),
    );
    const [, options] = fetchAtHttp.mock.calls[0] ?? [];
    const headers = new Headers(options?.headers);
    expect(headers.get("authorization")).toMatch(/^Bearer \S+$/u);
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(options?.body))).toEqual({entries});
  });

  it("rejects a malformed identifier before authentication or HTTP", async () => {
    const result = await addInvoiceMetadata({invoiceId: "not-a-guid", entries});

    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invoiceId")}});
    expect(auth).not.toHaveBeenCalled();
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it.each([
    [400, "Bad Request"],
    [500, "Internal Server Error"],
  ] as const)("returns a failed result when the backend responds with %i", async (status, statusText) => {
    fetchAtHttp.mockResolvedValueOnce(new Response("Metadata rejected", {status, statusText}));

    const result = await addInvoiceMetadata({invoiceId, entries});

    expect(result).toEqual({
      success: false,
      error: {code: "NETWORK_ERROR", message: `Failed to add invoice metadata: ${status} ${statusText}`},
    });
  });

  it("does not patch metadata when Clerk fails", async () => {
    auth.mockRejectedValueOnce(new Error("Auth service unavailable"));

    const result = await addInvoiceMetadata({invoiceId, entries});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Auth service unavailable"}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it("returns an error when HTTP rejects with a non-Error reason", async () => {
    fetchAtHttp.mockRejectedValueOnce("Connection closed");

    const result = await addInvoiceMetadata({invoiceId, entries});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "An unexpected error occurred"}});
  });
});
