/**
 * @fileoverview Unit tests for updateInvoiceProduct server action.
 * @module app/domains/invoices/_actions/invoices/products/updateInvoiceProduct.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {ProductCategory} from "@/types/invoices";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {buildUserInformation} from "../../../../../../../tests/helpers";
import {buildProduct, createJsonResponse, createTextResponse} from "../../../../../../../tests/helpers/invoiceDomain";

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));
const {updateInvoiceProduct} = await import("./updateInvoiceProduct");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
const mockRevalidatePath = vi.mocked((await import("next/cache")).revalidatePath);

describe("updateInvoiceProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(buildUserInformation({userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(
      createJsonResponse(buildProduct({name: "Updated Coffee"})) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("flattens nested product update payload fields into the backend DTO", async () => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const payload = {
      originalProductName: "Coffee",
      updatedProduct: buildProduct({
        name: "Premium Coffee",
        category: ProductCategory.GROCERIES,
        quantity: 2,
        quantityUnit: "kg",
        productCode: "PROD-123",
        price: 15.99,
        detectedAllergens: [],
      }),
    };

    const result = await updateInvoiceProduct({invoiceId, payload});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}/products`,
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );

    const callArgs = mockFetchWithTimeout.mock.calls[0];
    const body = JSON.parse(callArgs?.[1]?.body as string);
    expect(body.originalProductName).toBe("Coffee");
    expect(body.name).toBe("Premium Coffee");
    expect(body.category).toBe(ProductCategory.GROCERIES);
    expect(body.quantity).toBe(2);
    expect(body.quantityUnit).toBe("kg");
    expect(body.productCode).toBe("PROD-123");
    expect(body.price).toBe(15.99);
    expect(body.detectedAllergens).toEqual([]);
    // Ensure the payload is flattened, not nested
    expect(body.updatedProduct).toBeUndefined();

    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${invoiceId}`, "page");
  });

  it("returns an error result for an invalid invoice id", async () => {
    const invalidId = "not-a-guid";
    const payload = {
      originalProductName: "Coffee",
      updatedProduct: buildProduct(),
    };

    const result = await updateInvoiceProduct({invoiceId: invalidId, payload});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("maps 5xx and non-5xx failures", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Internal Server Error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const payload = {
      originalProductName: "Coffee",
      updatedProduct: buildProduct(),
    };

    const result = await updateInvoiceProduct({invoiceId, payload});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to update product");
    }

    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Bad Request", {status: 400, statusText: "Bad Request"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result2 = await updateInvoiceProduct({invoiceId, payload});

    expect(result2.success).toBe(false);
    if (!result2.success) {
      expect(result2.error.message).toContain("400");
      expect(result2.error.message).toContain("Failed to update product");
    }
  });

  it("returns an error result when auth or fetch throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth service unavailable"));

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const payload = {
      originalProductName: "Coffee",
      updatedProduct: buildProduct(),
    };

    const result = await updateInvoiceProduct({invoiceId, payload});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("handles fetch throwing a non-Error object", async () => {
    mockFetchWithTimeout.mockRejectedValue("String error");

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const payload = {
      originalProductName: "Coffee",
      updatedProduct: buildProduct(),
    };

    const result = await updateInvoiceProduct({invoiceId, payload});

    expect(result.success).toBe(false);
  });
});
