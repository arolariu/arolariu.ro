import {describe, expect, it} from "vitest";
import {buildInvoice, buildRecipeSuggestion} from "../../../../../../tests/helpers/builders/domain";
import {apiUrl, auth, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {updateInvoice} from "./updateInvoice";

describe("updateInvoice", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";
  const invoice = buildInvoice({
    id: invoiceId,
    userIdentifier: "22222222-2222-4222-8222-222222222222",
    merchantReference: "33333333-3333-4333-8333-333333333333",
    name: "Full Update Invoice",
    additionalMetadata: {source: "test"},
    possibleRecipes: [buildRecipeSuggestion({description: "A quick meal from the receipt"})],
  });

  it.each([null, 3004] as const)("serializes the invoice object's category (%s)", async (category) => {
    fetchAtHttp.mockResolvedValue(Response.json({...invoice, category, name: "Stored by the server"}));

    const result = await updateInvoice({invoiceId, invoice: {...invoice, category}});

    expect(result).toMatchObject({
      success: true,
      data: {id: invoiceId, name: "Stored by the server", category, createdAt: expect.any(Date)},
    });
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoiceId}`,
      expect.objectContaining({method: "PUT", cache: "no-store"}),
    );
    const [, options] = fetchAtHttp.mock.calls[0] ?? [];
    const headers = new Headers(options?.headers);
    expect(headers.get("authorization")).toMatch(/^Bearer \S+$/u);
    expect(headers.get("content-type")).toBe("application/json");
    const requestBody: unknown = JSON.parse(String(options?.body));
    expect(requestBody).toEqual({
      name: invoice.name,
      description: invoice.description,
      category: category ?? -1,
      paymentInformation: {...invoice.paymentInformation, transactionDate: invoice.paymentInformation.transactionDate.toISOString()},
      merchantReference: invoice.merchantReference,
      isImportant: invoice.isImportant,
      additionalMetadata: invoice.additionalMetadata,
    });
  });

  it("rejects an invalid invoice identifier before authenticating or calling HTTP", async () => {
    const result = await updateInvoice({invoiceId: "not-a-guid", invoice});

    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invoiceId")}});
    expect(auth).not.toHaveBeenCalled();
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it.each([
    [500, "SERVER_ERROR", "A server error occurred. Please try again later."],
    [400, "VALIDATION_ERROR", "Failed to update the invoice. Please check your input and try again."],
  ] as const)("returns the HTTP %i failure without backend details", async (status, code, message) => {
    fetchAtHttp.mockResolvedValue(new Response("Invoice could not be updated", {status, statusText: "Internal reason"}));

    const result = await updateInvoice({invoiceId, invoice});

    expect(result).toEqual({success: false, error: {code, message, status}});
    expect(fetchAtHttp).toHaveBeenCalledOnce();
  });

  it.each([
    [new Error("Auth failed"), "Auth failed"],
    [42, "An unexpected error occurred"],
  ] as const)("does not write the invoice when the identity provider rejects with %s", async (reason, message) => {
    auth.mockRejectedValue(reason);

    const result = await updateInvoice({invoiceId, invoice});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it("preserves a network failure as an error result", async () => {
    fetchAtHttp.mockRejectedValue(new Error("Network error"));

    const result = await updateInvoice({invoiceId, invoice});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Network error"}});
    expect(fetchAtHttp).toHaveBeenCalledOnce();
  });

  it("rejects a malformed HTTP success instead of returning an invalid invoice", async () => {
    fetchAtHttp.mockResolvedValue(Response.json({id: invoiceId}));

    const result = await updateInvoice({invoiceId, invoice});

    expect(result).toEqual({
      success: false,
      error: {code: "SERVER_ERROR", message: "The server returned unexpected data. Please try again later."},
    });
    expect(fetchAtHttp).toHaveBeenCalledOnce();
  });
});
