/**
 * @fileoverview HTTP boundary tests for the updateInvoiceProduct server action.
 * @module app/domains/invoices/_actions/invoices/products/updateInvoiceProduct.test
 */

import {ProductCategory} from "@/types/invoices";
import {revalidatePath} from "next/cache";
import {describe, expect, it, vi} from "vitest";
import {buildProduct} from "../../../../../../../tests/helpers/builders/domain";
import {apiUrl, auth, fetchAtHttp} from "../../../../../../../tests/setup/server-http";
import {updateInvoiceProduct} from "./updateInvoiceProduct";

vi.mock("next/cache", () => ({revalidatePath: vi.fn<typeof revalidatePath>()}));

const invoiceId = "11111111-1111-4111-8111-111111111111";
const endpoint = `${apiUrl}/rest/v1/invoices/${invoiceId}/products`;
const product = buildProduct({name: "Milk", category: ProductCategory.Milk});
const fullEdit = {invoiceId, payload: {originalProductName: product.name, updatedProduct: product}};

describe("updateInvoiceProduct", () => {
  it("flattens a full edit without sending the previously saved category", async () => {
    const replacement = {...product, name: "Premium Milk", quantity: 2, quantityUnit: "L", productCode: "PROD-123", price: 15.99};
    fetchAtHttp.mockResolvedValue(Response.json(replacement, {status: 202}));

    const result = await updateInvoiceProduct({invoiceId, payload: {originalProductName: "Milk", updatedProduct: replacement}});

    expect(result).toMatchObject({success: true, data: {name: replacement.name, category: ProductCategory.Milk}});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(endpoint, expect.objectContaining({method: "PUT", cache: "no-store"}));
    const [, request] = fetchAtHttp.mock.calls[0] ?? [];
    const headers = new Headers(request?.headers);
    expect(headers.get("authorization")).toMatch(/^Bearer \S+$/u);
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(request?.body))).toEqual({
      originalProductName: "Milk",
      name: "Premium Milk",
      quantity: 2,
      quantityUnit: "L",
      productCode: "PROD-123",
      price: 15.99,
      allergenAssessment: null,
    });
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([
      [`/domains/invoices/edit-invoice/${invoiceId}`, "page"],
      [`/domains/invoices/view-invoice/${invoiceId}`, "page"],
    ]);
  });

  it.each([ProductCategory.Milk, null] as const)("sends only the product selector and explicit category %s", async (category) => {
    fetchAtHttp.mockResolvedValue(Response.json({...product, category}, {status: 202}));

    const result = await updateInvoiceProduct({invoiceId, payload: {originalProductName: "Milk", category}});

    expect(result).toMatchObject({success: true, data: {category}});
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      endpoint,
      expect.objectContaining({method: "PUT", body: JSON.stringify({originalProductName: "Milk", category})}),
    );
  });

  it("preserves a conflict without resubmitting the category edit", async () => {
    fetchAtHttp.mockResolvedValue(new Response(null, {status: 409}));

    const result = await updateInvoiceProduct({invoiceId, payload: {originalProductName: "Milk", category: null}});

    expect(result).toMatchObject({success: false, error: {status: 409}});
    expect(fetchAtHttp).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns the API's validation failure for a wrong-domain category", async () => {
    const category = 2001 as ProductCategory;
    fetchAtHttp.mockResolvedValue(new Response(null, {status: 400}));

    const result = await updateInvoiceProduct({invoiceId, payload: {originalProductName: "Milk", category}});

    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      endpoint,
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

  it("rejects an invalid invoice identifier before authentication or HTTP", async () => {
    const result = await updateInvoiceProduct({...fullEdit, invoiceId: "not-a-guid"});

    expect(result).toMatchObject({success: false, error: {message: expect.stringContaining("invoiceId")}});
    expect(auth).not.toHaveBeenCalled();
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it.each([
    [422, "VALIDATION_ERROR", "Failed to update the product. Please check your input and try again."],
    [500, "SERVER_ERROR", "A server error occurred. Please try again later."],
  ] as const)("returns a public HTTP %i failure without revalidating", async (status, code, message) => {
    fetchAtHttp.mockResolvedValue(new Response("Internal response details", {status, statusText: "Internal status text"}));

    const result = await updateInvoiceProduct(fullEdit);

    expect(result).toEqual({success: false, error: {code, message, status}});
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not write if authentication fails", async () => {
    auth.mockRejectedValue(new Error("Auth service unavailable"));

    const result = await updateInvoiceProduct(fullEdit);

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Auth service unavailable"}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it("returns a server error and skips revalidation when the 2xx body is a malformed product", async () => {
    const {category: _category, ...malformed} = product;
    fetchAtHttp.mockResolvedValue(Response.json(malformed, {status: 202}));

    const result = await updateInvoiceProduct(fullEdit);

    expect(result).toMatchObject({success: false, error: {code: "SERVER_ERROR"}});
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("handles fetch throwing a non-Error object", async () => {
    fetchAtHttp.mockRejectedValue("String error");

    const result = await updateInvoiceProduct(fullEdit);

    expect(result).toMatchObject({success: false, error: {code: "NETWORK_ERROR"}});
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
