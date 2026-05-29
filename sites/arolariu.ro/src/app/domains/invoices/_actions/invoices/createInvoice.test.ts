/**
 * @fileoverview Unit tests for createInvoice server action.
 * @module app/domains/invoices/_actions/invoices/createInvoice.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {buildCreateInvoicePayload, buildInvoiceScan, buildUserInformation} from "../../../../../../tests/helpers";
import {buildInvoice, createJsonResponse} from "../../../../../../tests/helpers/invoiceDomain";

vi.mock("@/lib/actions/user/fetchUser");
const {createInvoice} = await import("./createInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("createInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(buildUserInformation({userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(createJsonResponse(buildInvoice()) as Awaited<ReturnType<typeof fetchWithTimeout>>);
  });

  it("posts a creation payload with authenticated userIdentifier when missing", async () => {
    const payload = {
      initialScan: buildInvoiceScan({
        location: "https://storage.test/scan.jpg",
      }),
      metadata: {isImportant: "false", requiresAnalysis: "true"},
    };

    const result = await createInvoice(payload);

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      "/rest/v1/invoices",
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
    expect(body.userIdentifier).toBe("user-1");
  });

  it("preserves an explicit userIdentifier in the payload", async () => {
    const payload = buildCreateInvoicePayload({
      userIdentifier: "custom-user-id",
      initialScan: buildInvoiceScan({
        location: "https://storage.test/scan.jpg",
      }),
      metadata: {isImportant: "false", requiresAnalysis: "true"},
    });

    await createInvoice(payload);

    const callArgs = mockFetchWithTimeout.mock.calls[0];
    const body = JSON.parse(callArgs?.[1]?.body as string);
    expect(body.userIdentifier).toBe("custom-user-id");
  });

  it("returns a server-error user message for 5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Server error",
    } as Response);

    const result = await createInvoice({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to create invoice");
    }
  });

  it("returns a validation user message for non-5xx responses", async () => {
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Validation failed",
    } as Response);

    const result = await createInvoice({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to create invoice");
    }
  });

  it("returns an error result when auth throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    const result = await createInvoice({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Auth failed");
    }
  });

  it("returns an error result when fetch throws", async () => {
    mockFetchWithTimeout.mockRejectedValue(new Error("Network error"));

    const result = await createInvoice({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Network error");
    }
  });

  it("returns a fallback error message when fetch throws a non-Error", async () => {
    mockFetchWithTimeout.mockRejectedValue({code: "TIMEOUT"});

    const result = await createInvoice({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("An unexpected error occurred");
    }
  });
});
