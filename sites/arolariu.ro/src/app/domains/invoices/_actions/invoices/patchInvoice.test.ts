import {revalidatePath} from "next/cache";
import type {InvoiceCategory} from "@/types/invoices";
import {describe, expect, it, vi} from "vitest";
import {buildInvoice, buildProduct, buildRecipeSuggestion} from "../../../../../../tests/helpers/builders/domain";
import {apiUrl, auth, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {patchInvoice} from "./patchInvoice";

vi.mock("next/cache", () => ({revalidatePath: vi.fn<typeof revalidatePath>()}));

const invoiceId = "11111111-1111-4111-8111-111111111111";
const invoice = buildInvoice({
  id: invoiceId,
  userIdentifier: "22222222-2222-4222-8222-222222222222",
  merchantReference: "33333333-3333-4333-8333-333333333333",
  name: "Updated Invoice",
});

function requestBody(): unknown {
  return JSON.parse(String(fetchAtHttp.mock.calls[0]?.[1]?.body));
}

describe("patchInvoice", () => {
  it("sends a partial edit and revalidates both page views after parsing the saved invoice", async () => {
    fetchAtHttp.mockResolvedValue(Response.json(invoice));
    const payload = {name: "Updated Invoice"};

    const result = await patchInvoice({invoiceId, payload});

    expect(result).toMatchObject({success: true, data: {id: invoiceId, name: "Updated Invoice", createdAt: expect.any(Date)}});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoiceId}`,
      expect.objectContaining({method: "PATCH", cache: "no-store"}),
    );
    const headers = new Headers(fetchAtHttp.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toMatch(/^Bearer \S+$/u);
    expect(headers.get("content-type")).toBe("application/json");
    expect(requestBody()).toEqual(payload);
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([
      [`/domains/invoices/edit-invoice/${invoiceId}`, "page"],
      [`/domains/invoices/view-invoice/${invoiceId}`, "page"],
    ]);
  });

  it("sends the provided editable fields without forwarding client-only fields", async () => {
    fetchAtHttp.mockResolvedValue(Response.json(invoice));
    const payload = {
      description: "Weekly groceries",
      category: null,
      paymentInformation: invoice.paymentInformation,
      merchantReference: invoice.merchantReference,
      isImportant: false,
      sharedWith: ["44444444-4444-4444-8444-444444444444"],
      additionalMetadata: {source: "test"},
      items: [buildProduct()],
      id: "client-only",
      createdAt: invoice.createdAt,
    };

    const result = await patchInvoice({invoiceId, payload});

    expect(result).toMatchObject({success: true});
    expect(requestBody()).toEqual({
      description: payload.description,
      category: -1,
      paymentInformation: {...invoice.paymentInformation, transactionDate: invoice.paymentInformation.transactionDate.toISOString()},
      merchantReference: payload.merchantReference,
      isImportant: false,
      sharedWith: payload.sharedWith,
      additionalMetadata: payload.additionalMetadata,
    });
  });

  it.each([
    ["clears", []],
    ["replaces", [buildRecipeSuggestion({description: "A quick meal from the receipt"})]],
  ] as const)("%s recipes only when the caller provides the collection", async (_operation, recipes) => {
    fetchAtHttp.mockResolvedValue(Response.json({...invoice, possibleRecipes: recipes}));

    const result = await patchInvoice({invoiceId, payload: {possibleRecipes: [...recipes]}});

    expect(requestBody()).toEqual({possibleRecipes: recipes});
    expect(result).toMatchObject({success: true, data: {possibleRecipes: recipes}});
  });

  it("rejects an invalid invoice identifier before authenticating or calling HTTP", async () => {
    const result = await patchInvoice({invoiceId: "not-a-guid", payload: {}});

    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invoiceId")}});
    expect(auth).not.toHaveBeenCalled();
    expect(fetchAtHttp).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("lets the API reject an invalid receipt category and returns its HTTP failure", async () => {
    const category = 2001 as InvoiceCategory;
    fetchAtHttp.mockResolvedValue(new Response(null, {status: 400}));

    const result = await patchInvoice({invoiceId, payload: {category}});

    expect(fetchAtHttp).toHaveBeenCalledOnce();
    expect(requestBody()).toEqual({category});
    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR", status: 400}});
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    [500, "SERVER_ERROR", "A server error occurred. Please try again later."],
    [400, "VALIDATION_ERROR", "Failed to update the invoice. Please check your input and try again."],
  ] as const)("returns the HTTP %i failure without revalidating either page", async (status, code, message) => {
    fetchAtHttp.mockResolvedValue(new Response("Invoice could not be updated", {status, statusText: "Internal reason"}));

    const result = await patchInvoice({invoiceId, payload: {}});

    expect(result).toEqual({success: false, error: {code, message, status}});
    expect(fetchAtHttp).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not call HTTP or invalidate pages when the identity provider throws", async () => {
    auth.mockRejectedValue(new Error("Auth failed"));

    const result = await patchInvoice({invoiceId, payload: {}});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Auth failed"}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    [new Error("Network error"), "Network error"],
    [undefined, "An unexpected error occurred"],
  ] as const)("reports a rejected request without invalidating pages (%s)", async (reason, message) => {
    fetchAtHttp.mockRejectedValue(reason);

    const result = await patchInvoice({invoiceId, payload: {}});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message}});
    expect(fetchAtHttp).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a malformed HTTP success without invalidating pages", async () => {
    fetchAtHttp.mockResolvedValue(Response.json({id: invoiceId}));

    const result = await patchInvoice({invoiceId, payload: {}});

    expect(result).toEqual({
      success: false,
      error: {code: "SERVER_ERROR", message: "The server returned unexpected data. Please try again later."},
    });
    expect(fetchAtHttp).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
