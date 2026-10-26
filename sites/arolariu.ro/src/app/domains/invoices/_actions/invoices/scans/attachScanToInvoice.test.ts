/**
 * @fileoverview Unit tests for attachScanToInvoice server action.
 * @module app/domains/invoices/_actions/invoices/scans/attachScanToInvoice.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {InvoiceScanType} from "@/types/invoices";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
const {attachScanToInvoice} = await import("./attachScanToInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("attachScanToInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse(undefined, {status: 201}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("posts an invoice scan attachment for a valid invoice id", async () => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const payload = TestDataBuilder.build("createInvoiceScanPayload", {
      location: "https://storage.test/invoices/scan.jpg",
      additionalMetadata: {page: "1"},
    });

    const result = await attachScanToInvoice({invoiceId, payload});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}/scans`,
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
    expect(body.type).toBe(InvoiceScanType.JPEG);
    expect(body.location).toBe("https://storage.test/invoices/scan.jpg");
    expect(body.metadata).toEqual({page: "1"});
    expect(body).not.toHaveProperty("additionalMetadata");
  });

  it("returns an error result for an invalid invoice id", async () => {
    const invalidId = "not-a-guid";
    const payload = TestDataBuilder.build("createInvoiceScanPayload", {
      location: "https://storage.test/scan.jpg",
    });

    const result = await attachScanToInvoice({invoiceId: invalidId, payload});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("maps 400, 404, and fallback failures", async () => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const payload = TestDataBuilder.build("createInvoiceScanPayload", {
      location: "https://storage.test/scan.jpg",
    });

    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Bad Request", {status: 400, statusText: "Bad Request"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result400 = await attachScanToInvoice({invoiceId, payload});

    expect(result400.success).toBe(false);
    if (!result400.success) {
      expect(result400.error.message).toContain("400");
      expect(result400.error.message).toContain("Failed to attach invoice scan");
    }

    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Not Found", {status: 404, statusText: "Not Found"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result404 = await attachScanToInvoice({invoiceId, payload});

    expect(result404.success).toBe(false);
    if (!result404.success) {
      expect(result404.error.message).toContain("404");
      expect(result404.error.message).toContain("Failed to attach invoice scan");
    }

    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.textResponse("Internal Server Error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result500 = await attachScanToInvoice({invoiceId, payload});

    expect(result500.success).toBe(false);
    if (!result500.success) {
      expect(result500.error.message).toContain("500");
      expect(result500.error.message).toContain("Failed to attach invoice scan");
    }
  });

  it("returns an error result when auth or fetch throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth service unavailable"));

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const payload = TestDataBuilder.build("createInvoiceScanPayload", {
      location: "https://storage.test/scan.jpg",
    });

    const result = await attachScanToInvoice({invoiceId, payload});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("handles fetch throwing a non-Error object", async () => {
    mockFetchWithTimeout.mockRejectedValue("String error");

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const payload = TestDataBuilder.build("createInvoiceScanPayload", {
      location: "https://storage.test/scan.jpg",
    });

    const result = await attachScanToInvoice({invoiceId, payload});

    expect(result.success).toBe(false);
  });
});
