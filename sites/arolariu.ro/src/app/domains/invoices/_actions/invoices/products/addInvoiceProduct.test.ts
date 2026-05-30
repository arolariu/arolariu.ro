/**
 * @fileoverview Unit tests for addInvoiceProduct server action.
 * @module app/domains/invoices/_actions/invoices/products/addInvoiceProduct.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));
const {addInvoiceProduct} = await import("./addInvoiceProduct");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
const mockRevalidatePath = vi.mocked((await import("next/cache")).revalidatePath);

describe("addInvoiceProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse(TestDataBuilder.build("product")) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("posts a product payload and revalidates invoice pages", async () => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const product = TestDataBuilder.build("product", {name: "Milk", price: 5.99});

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
    expect(body.name).toBe("Milk");
    expect(body.price).toBe(5.99);

    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${invoiceId}`, "page");
  });

  it("returns an error result for an invalid invoice id", async () => {
    const invalidId = "not-a-guid";
    const product = TestDataBuilder.build("product");

    const result = await addInvoiceProduct({invoiceId: invalidId, product});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("maps 5xx responses to a server-error user message", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Internal Server Error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const product = TestDataBuilder.build("product");

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to add product");
    }
  });

  it("maps non-5xx responses to the fallback user message", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Bad Request", {status: 400, statusText: "Bad Request"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const product = TestDataBuilder.build("product");

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("400");
      expect(result.error.message).toContain("Failed to add product");
    }
  });

  it("returns an error result when auth or fetch throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth service unavailable"));

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const product = TestDataBuilder.build("product");

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("handles fetch throwing an error", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("Network timeout"));

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const product = TestDataBuilder.build("product");

    const result = await addInvoiceProduct({invoiceId, product});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Network timeout");
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
