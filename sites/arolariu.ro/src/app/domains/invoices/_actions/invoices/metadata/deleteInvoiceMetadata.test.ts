/**
 * @fileoverview Unit tests for deleteInvoiceMetadata server action.
 * @module app/domains/invoices/_actions/invoices/metadata/deleteInvoiceMetadata.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithTimeout} from "@/lib/utils.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createJsonResponse, createTextResponse} from "../../../../../../../tests/helpers/invoiceDomain";

vi.mock("@/lib/actions/user/fetchUser");
const {deleteInvoiceMetadata} = await import("./deleteInvoiceMetadata");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("deleteInvoiceMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1"});
    mockFetchWithTimeout.mockResolvedValue(
      createJsonResponse(undefined, {status: 200}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("deletes one metadata key using the backend keys array DTO", async () => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const key = "category";

    const result = await deleteInvoiceMetadata({invoiceId, key});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}/metadata`,
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
    expect(body).toEqual({keys: ["category"]});
  });

  it("returns an error result for an invalid invoice id", async () => {
    const invalidId = "not-a-guid";
    const key = "category";

    const result = await deleteInvoiceMetadata({invoiceId: invalidId, key});

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
    const key = "category";

    const result = await deleteInvoiceMetadata({invoiceId, key});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to delete invoice metadata");
    }

    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Bad Request", {status: 400, statusText: "Bad Request"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result2 = await deleteInvoiceMetadata({invoiceId, key});

    expect(result2.success).toBe(false);
    if (!result2.success) {
      expect(result2.error.message).toContain("400");
      expect(result2.error.message).toContain("Failed to delete invoice metadata");
    }
  });

  it("returns an error result when auth or fetch throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth service unavailable"));

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const key = "category";

    const result = await deleteInvoiceMetadata({invoiceId, key});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("handles fetch throwing a non-Error object", async () => {
    mockFetchWithTimeout.mockRejectedValue("String error");

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const key = "category";

    const result = await deleteInvoiceMetadata({invoiceId, key});

    expect(result.success).toBe(false);
  });
});
