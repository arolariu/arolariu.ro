/**
 * @fileoverview Unit tests for deleteInvoiceScan server action.
 * @module app/domains/invoices/_actions/invoices/scans/deleteInvoiceScan.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));
const {deleteInvoiceScan} = await import("./deleteInvoiceScan");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
const mockRevalidatePath = vi.mocked((await import("next/cache")).revalidatePath);

describe("deleteInvoiceScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse(undefined, {status: 200}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("encodes scan location, deletes it, and revalidates invoice pages", async () => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const scanLocation = "https://storage.test/invoices/scan one.jpg";

    const result = await deleteInvoiceScan({invoiceId, scanLocation});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}/scans?location=${encodeURIComponent(scanLocation)}`,
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );

    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/domains/invoices/view-invoice/${invoiceId}`, "page");
  });

  it("returns an error result for an invalid invoice id", async () => {
    const invalidId = "not-a-guid";
    const scanLocation = "https://storage.test/scan.jpg";

    const result = await deleteInvoiceScan({invoiceId: invalidId, scanLocation});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("maps 400, 403, 404, and fallback failures", async () => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const scanLocation = "https://storage.test/scan.jpg";

    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Bad Request", {status: 400, statusText: "Bad Request"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result400 = await deleteInvoiceScan({invoiceId, scanLocation});

    expect(result400.success).toBe(false);
    if (!result400.success) {
      expect(result400.error.message).toContain("400");
      expect(result400.error.message).toContain("Failed to delete invoice scan");
    }

    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Forbidden", {status: 403, statusText: "Forbidden"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result403 = await deleteInvoiceScan({invoiceId, scanLocation});

    expect(result403.success).toBe(false);
    if (!result403.success) {
      expect(result403.error.message).toContain("403");
      expect(result403.error.message).toContain("Failed to delete invoice scan");
    }

    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Not Found", {status: 404, statusText: "Not Found"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result404 = await deleteInvoiceScan({invoiceId, scanLocation});

    expect(result404.success).toBe(false);
    if (!result404.success) {
      expect(result404.error.message).toContain("404");
      expect(result404.error.message).toContain("Failed to delete invoice scan");
    }

    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Internal Server Error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result500 = await deleteInvoiceScan({invoiceId, scanLocation});

    expect(result500.success).toBe(false);
    if (!result500.success) {
      expect(result500.error.message).toContain("500");
      expect(result500.error.message).toContain("Failed to delete invoice scan");
    }
  });

  it("returns an error result when auth or fetch throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth service unavailable"));

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const scanLocation = "https://storage.test/scan.jpg";

    const result = await deleteInvoiceScan({invoiceId, scanLocation});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("handles fetch throwing a non-Error object", async () => {
    mockFetchWithTimeout.mockRejectedValue("String error");

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const scanLocation = "https://storage.test/scan.jpg";

    const result = await deleteInvoiceScan({invoiceId, scanLocation});

    expect(result.success).toBe(false);
  });
});
