/**
 * @fileoverview Unit tests for deleteInvoiceProduct server action.
 * @module app/domains/invoices/_actions/invoices/products/deleteInvoiceProduct.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));
const {deleteInvoiceProduct} = await import("./deleteInvoiceProduct");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
const mockRevalidatePath = vi.mocked((await import("next/cache")).revalidatePath);

describe("deleteInvoiceProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse(undefined, {status: 200}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("sends the productName delete body and revalidates invoice pages", async () => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const productName = "Coffee";

    const result = await deleteInvoiceProduct({invoiceId, productName});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}/products`,
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );

    const callArgs = mockFetchWithTimeout.mock.calls[0];
    const body = JSON.parse(callArgs?.[1]?.body as string);
    expect(body).toEqual({productName: "Coffee"});

    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${invoiceId}`, "page");
  });

  it("returns an error result for an invalid invoice id", async () => {
    const invalidId = "not-a-guid";
    const productName = "Coffee";

    const result = await deleteInvoiceProduct({invoiceId: invalidId, productName});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it.each([
    [404, "NOT_FOUND", "Failed to delete the product. Please check your input and try again."],
    [500, "SERVER_ERROR", "A server error occurred. Please try again later."],
  ])("returns a public HTTP %i failure without revalidating", async (status, code, message) => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const productName = "Coffee";
    mockFetchWithTimeout.mockResolvedValue(new Response("Internal response details", {status, statusText: "Internal status text"}));

    const result = await deleteInvoiceProduct({invoiceId, productName});

    expect(result).toEqual({success: false, error: {code, message, status}});
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns an error result when auth or fetch throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth service unavailable"));

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const productName = "Coffee";

    const result = await deleteInvoiceProduct({invoiceId, productName});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("handles fetch throwing a non-Error object", async () => {
    mockFetchWithTimeout.mockRejectedValue("String error");

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const productName = "Coffee";

    const result = await deleteInvoiceProduct({invoiceId, productName});

    expect(result.success).toBe(false);
  });
});
