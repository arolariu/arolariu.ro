/**
 * @fileoverview Unit tests for patchInvoice server action.
 * @module app/domains/invoices/_actions/invoices/patchInvoice.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {ClassificationSystem} from "@/types/invoices";
import {revalidatePath} from "next/cache";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("next/cache");
vi.mock("@/lib/utils.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils.server")>();
  return {...actual, fetchWithTimeout: vi.fn()};
});
const {patchInvoice} = await import("./patchInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("patchInvoice", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse(TestDataBuilder.build("invoice", {id: invoiceId, name: "Updated Invoice"})) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );
  });

  it("patches a partial invoice payload and revalidates invoice pages", async () => {
    const payload = {
      name: "Updated Invoice",
      classification: {system: ClassificationSystem.EcoicopV2, code: "01.1"},
    };

    const result = await patchInvoice({invoiceId, payload});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}`,
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      }),
    );

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${invoiceId}`, "page");

    if (result.success) {
      expect(result.data.name).toBe("Updated Invoice");
    }
  });

  it("returns an error result for an invalid invoice id", async () => {
    const result = await patchInvoice({invoiceId: "not-a-guid", payload: {}});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unable to update the invoice. Please try again.");
    }
  });

  it("rejects malformed classification input and malformed JSON responses", async () => {
    const malformedInput = await patchInvoice({
      invoiceId,
      payload: {classification: {system: "INVALID", code: "01.1"}},
    });
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse({invalid: true}) as Awaited<ReturnType<typeof fetchWithTimeout>>);
    const malformedResponse = await patchInvoice({invoiceId, payload: {}});

    expect(malformedInput).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(malformedResponse).toMatchObject({success: false, error: {code: "SERVER_ERROR"}});
  });

  it("returns the server-error user message for 5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Server error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result = await patchInvoice({invoiceId, payload: {}});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("A server error occurred. Please try again later.");
    }
  });

  it("returns the fallback user message for non-5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Bad request", {status: 400, statusText: "Bad Request"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result = await patchInvoice({invoiceId, payload: {}});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to update");
    }
  });

  it("returns an error result when auth throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    const result = await patchInvoice({invoiceId, payload: {}});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unable to update the invoice. Please try again.");
    }
  });

  it("returns an error result when fetch throws", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("Network error"));

    const result = await patchInvoice({invoiceId, payload: {}});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unable to update the invoice. Please try again.");
    }
  });

  it("returns a fallback error message when fetch throws a non-Error", async () => {
    mockFetchWithTimeout.mockRejectedValue(undefined);

    const result = await patchInvoice({invoiceId, payload: {}});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unable to update the invoice. Please try again.");
    }
  });
});
