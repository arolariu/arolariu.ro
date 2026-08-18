/**
 * @fileoverview Unit tests for addInvoiceProduct server action.
 * @module app/domains/invoices/_actions/invoices/products/addInvoiceProduct.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {ClassificationSystem, type ProductMutation} from "@/types/invoices";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));
vi.mock("@/lib/utils.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils.server")>();
  return {...actual, fetchWithTimeout: vi.fn()};
});
const {addInvoiceProduct} = await import("./addInvoiceProduct");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
const mockRevalidatePath = vi.mocked((await import("next/cache")).revalidatePath);

function buildProductMutation(overrides: Partial<ProductMutation> = {}): ProductMutation {
  return {
    name: "Milk",
    classification: null,
    quantity: 1,
    quantityUnit: "pcs",
    productCode: "",
    price: 5.99,
    ...overrides,
  };
}

describe("addInvoiceProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse({...TestDataBuilder.build("product"), classification: null}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );
  });

  it("posts only the product DTO fields and GPC selection, then revalidates invoice pages", async () => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const product = buildProductMutation({
      classification: {system: ClassificationSystem.Gs1Gpc, code: "10000111"},
    });

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}/products`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );

    const callArgs = mockFetchWithTimeout.mock.calls[0];
    const body = JSON.parse(callArgs?.[1]?.body as string);
    expect(body).toEqual({
      name: "Milk",
      classification: {system: ClassificationSystem.Gs1Gpc, code: "10000111"},
      quantity: 1,
      quantityUnit: "pcs",
      productCode: "",
      price: 5.99,
    });

    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${invoiceId}`, "page");
  });

  it("returns an error result for an invalid invoice id", async () => {
    const invalidId = "not-a-guid";
    const product = buildProductMutation();

    const result = await addInvoiceProduct({invoiceId: invalidId, product});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("rejects malformed outer input and malformed success responses", async () => {
    const invalidInputResult = await addInvoiceProduct(null);
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse({invalid: true}) as Awaited<ReturnType<typeof fetchWithTimeout>>);
    const malformedResponseResult = await addInvoiceProduct({
      invoiceId: "11111111-1111-4111-8111-111111111111",
      product: buildProductMutation(),
    });

    expect(invalidInputResult).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(malformedResponseResult).toMatchObject({success: false, error: {code: "SERVER_ERROR"}});
  });

  it("maps 5xx responses to a server-error user message", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Internal Server Error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const product = buildProductMutation();

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("A server error occurred. Please try again later.");
    }
  });

  it("maps non-5xx responses to the fallback user message", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Bad Request", {status: 400, statusText: "Bad Request"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const product = buildProductMutation();

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Failed to add the product. Please check your input and try again.");
    }
  });

  it("returns an error result when auth or fetch throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth service unavailable"));

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const product = buildProductMutation();

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("handles fetch throwing an error", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("Network timeout"));

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const product = buildProductMutation();

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unable to add the product. Please try again.");
    }
  });

  it("handles fetch throwing a non-Error object", async () => {
    mockFetchWithTimeout.mockRejectedValue("String error");

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const product = TestDataBuilder.build("product");

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result.success).toBe(false);
  });
});
