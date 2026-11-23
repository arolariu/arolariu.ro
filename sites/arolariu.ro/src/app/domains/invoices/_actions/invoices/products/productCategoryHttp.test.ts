import type {ProductCategory} from "@/types/invoices";
import {describe, expect, it, vi} from "vitest";
import {buildProduct} from "../../../../../../../tests/helpers/builders/domain";
import {apiUrl, fetchAtHttp} from "../../../../../../../tests/setup/server-http";
import {updateInvoiceProduct} from "./updateInvoiceProduct";

vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));

const invoiceId = "11111111-1111-4111-8111-111111111111";
const product = buildProduct({name: "Milk", category: 1014});

describe("the product category write boundary", () => {
  it.each([1014, null] as const)("sends only the product selector and the explicit category %s", async (category) => {
    fetchAtHttp.mockResolvedValue(Response.json({...product, category}, {status: 202}));
    const result = await updateInvoiceProduct({invoiceId, payload: {originalProductName: "Milk", category}});
    expect(result).toMatchObject({success: true, data: {category}});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoiceId}/products`,
      expect.objectContaining({method: "PUT", body: JSON.stringify({originalProductName: "Milk", category})}),
    );
  });

  it("preserves a conflict without resubmitting the write", async () => {
    fetchAtHttp.mockResolvedValue(new Response(null, {status: 409}));
    const result = await updateInvoiceProduct({invoiceId, payload: {originalProductName: "Milk", category: null}});
    expect(result).toMatchObject({success: false, error: {status: 409}});
    expect(fetchAtHttp).toHaveBeenCalledOnce();
  });

  it("returns the API's validation failure for a wrong-domain category", async () => {
    const category = 2001 as ProductCategory;
    fetchAtHttp.mockResolvedValue(new Response(null, {status: 400}));

    const result = await updateInvoiceProduct({invoiceId, payload: {originalProductName: "Milk", category}});

    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoiceId}/products`,
      expect.objectContaining({body: JSON.stringify({originalProductName: "Milk", category})}),
    );
    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR", status: 400}});
  });

  it("does not serialize a non-finite category as a clear request", async () => {
    const category = Number.NaN as ProductCategory;

    const result = await updateInvoiceProduct({invoiceId, payload: {originalProductName: "Milk", category}});

    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR", status: 400}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });
});
