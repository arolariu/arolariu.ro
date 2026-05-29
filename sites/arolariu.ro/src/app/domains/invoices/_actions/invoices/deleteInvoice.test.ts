/**
 * @fileoverview Unit tests for deleteInvoice server action.
 * @module app/domains/invoices/_actions/invoices/deleteInvoice.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {revalidatePath} from "next/cache";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createTextResponse} from "../../../../../../tests/helpers/invoiceDomain";

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("next/cache");
const {deleteInvoice} = await import("./deleteInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
const mockRevalidatePath = vi.mocked(revalidatePath);

describe("deleteInvoice", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1"});
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: "No Content",
      text: async () => "",
    } as Response);
  });

  it("deletes an invoice and revalidates edit and view paths", async () => {
    const result = await deleteInvoice({invoiceId});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}`,
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${invoiceId}`, "page");
  });

  it("returns an error result for an invalid invoice id", async () => {
    const result = await deleteInvoice({invoiceId: "not-a-guid"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("invoiceId");
    }
  });

  it("maps 404 and 403 responses to specific user messages", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Not found", {status: 404, statusText: "Not Found"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result404 = await deleteInvoice({invoiceId});
    expect(result404.success).toBe(false);
    if (!result404.success) {
      expect(result404.error.message).toContain("404");
      expect(result404.error.message).toContain("Failed to delete invoice");
    }

    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Forbidden", {status: 403, statusText: "Forbidden"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result403 = await deleteInvoice({invoiceId});
    expect(result403.success).toBe(false);
    if (!result403.success) {
      expect(result403.error.message).toContain("403");
      expect(result403.error.message).toContain("Failed to delete invoice");
    }
  });

  it("maps fallback non-OK responses to a generic user message", async () => {
    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Server error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result = await deleteInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to delete invoice");
    }
  });

  it("returns an error result when auth throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    const result = await deleteInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Auth failed");
    }
  });

  it("returns an error result when fetch throws", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("Network error"));

    const result = await deleteInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Network error");
    }
  });

  it("returns a fallback error message when fetch throws a non-Error", async () => {
    mockFetchWithTimeout.mockRejectedValue("Connection timeout");

    const result = await deleteInvoice({invoiceId});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("An unexpected error occurred");
    }
  });
});
