/**
 * @fileoverview Unit tests for updateInvoice server action.
 * @module app/domains/invoices/_actions/invoices/updateInvoice.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
const {updateInvoice} = await import("./updateInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("updateInvoice", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse(TestDataBuilder.build("invoice", {id: invoiceId, userIdentifier: "22222222-2222-4222-8222-222222222222", merchantReference: "33333333-3333-4333-8333-333333333333"})) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("sends a PUT request to replace the invoice and returns the updated data", async () => {
    const invoice = TestDataBuilder.build("invoice", {id: invoiceId, name: "Full Update Invoice"});

    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}`,
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );

    if (result.success) {
      expect(result.data.id).toBe(invoiceId);
    }
  });

  it("returns an error result for an invalid invoice id", async () => {
    const invoice = TestDataBuilder.build("invoice");
    const result = await updateInvoice({invoiceId: "not-a-guid", invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("invoiceId");
    }
  });

  it("returns the server-error user message for 5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Server error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const invoice = TestDataBuilder.build("invoice", {id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to update invoice");
    }
  });

  it("returns the fallback user message for non-5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Bad request", {status: 400, statusText: "Bad Request"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const invoice = TestDataBuilder.build("invoice", {id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to update");
    }
  });

  it("returns an error result when auth throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    const invoice = TestDataBuilder.build("invoice", {id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Auth failed");
    }
  });

  it("returns an error result when fetch throws", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("Network error"));

    const invoice = TestDataBuilder.build("invoice", {id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Network error");
    }
  });

  it("returns a fallback error message when auth throws a non-Error", async () => {
    mockFetchUser.mockRejectedValue(42);

    const invoice = TestDataBuilder.build("invoice", {id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("An unexpected error occurred");
    }
  });

  it("sends a PUT request", async () => {
    const invoice = TestDataBuilder.build("invoice", {id: invoiceId});
    await updateInvoice({invoiceId, invoice});
    const [, init] = mockFetchWithTimeout.mock.calls[0]!;
    expect(init?.method).toBe("PUT");
  });

  it("sends classificationCode rather than a numeric category", async () => {
    const invoice = TestDataBuilder.build("invoice", {id: invoiceId});
    await updateInvoice({invoiceId, invoice});
    const [, init] = mockFetchWithTimeout.mock.calls[0]!;
    const body: unknown = JSON.parse(String(init?.body));
    expect(body).toHaveProperty("classificationCode");
    expect(body).not.toHaveProperty("category");
  });

  it("does not serialize the whole invoice", async () => {
    const invoice = TestDataBuilder.build("invoice", {id: invoiceId});
    await updateInvoice({invoiceId, invoice});
    const [, init] = mockFetchWithTimeout.mock.calls[0]!;
    const body: unknown = JSON.parse(String(init?.body));
    expect(body).not.toHaveProperty("items");
    expect(body).not.toHaveProperty("createdAt");
    expect(body).not.toHaveProperty("id");
  });

  it("omits possibleRecipes so the server preserves existing recipes", async () => {
    const invoice = TestDataBuilder.build("invoice", {id: invoiceId});
    await updateInvoice({invoiceId, invoice});
    const [, init] = mockFetchWithTimeout.mock.calls[0]!;
    const body: unknown = JSON.parse(String(init?.body));
    expect(body).not.toHaveProperty("possibleRecipes");
  });

  it("returns a validation failure when the API returns a malformed payload", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse({}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const invoice = TestDataBuilder.build("invoice", {id: invoiceId});
    const result = await updateInvoice({invoiceId, invoice});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
