/**
 * @fileoverview Unit tests for detachScanFromInvoice server action.
 * @module app/domains/invoices/_actions/invoices/scans/detachScanFromInvoice.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));
const {detachScanFromInvoice} = await import("./detachScanFromInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);
const mockRevalidatePath = vi.mocked((await import("next/cache")).revalidatePath);

describe("detachScanFromInvoice", () => {
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

    const result = await detachScanFromInvoice({invoiceId, scanLocation});

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

    const result = await detachScanFromInvoice({invoiceId: invalidId, scanLocation});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it.each([
    [400, "VALIDATION_ERROR", "Cannot delete the scan. The request was invalid."],
    [403, "AUTH_ERROR", "You do not have permission to delete this scan."],
    [404, "NOT_FOUND", "The specified scan was not found."],
    [500, "SERVER_ERROR", "Failed to delete the scan. Please try again."],
  ])("returns a public HTTP %i failure without revalidating", async (status, code, message) => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const scanLocation = "https://storage.test/scan.jpg";
    mockFetchWithTimeout.mockResolvedValue(new Response("Internal response details", {status, statusText: "Internal status text"}));

    const result = await detachScanFromInvoice({invoiceId, scanLocation});

    expect(result).toEqual({success: false, error: {code, message, status}});
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns an error result when auth or fetch throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth service unavailable"));

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const scanLocation = "https://storage.test/scan.jpg";

    const result = await detachScanFromInvoice({invoiceId, scanLocation});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("handles fetch throwing a non-Error object", async () => {
    mockFetchWithTimeout.mockRejectedValue("String error");

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const scanLocation = "https://storage.test/scan.jpg";

    const result = await detachScanFromInvoice({invoiceId, scanLocation});

    expect(result.success).toBe(false);
  });
});
