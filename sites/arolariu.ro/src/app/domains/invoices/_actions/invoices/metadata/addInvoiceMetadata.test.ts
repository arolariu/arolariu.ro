/**
 * @fileoverview Unit tests for addInvoiceMetadata server action.
 * @module app/domains/invoices/_actions/invoices/metadata/addInvoiceMetadata.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import type {ServerActionResult} from "@/lib/utils.server";
import {fetchWithTimeout} from "@/lib/utils.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createJsonResponse, createTextResponse} from "../../../../../../../tests/helpers/invoiceDomain";

vi.mock("@/lib/actions/user/fetchUser");
vi.mock("@/lib/utils.server", () => ({
  createErrorResult: vi.fn(<T>(error: unknown, defaultMessage = "Something went wrong") =>
    Promise.resolve({
      success: false as const,
      error: {
        code: "NETWORK_ERROR" as const,
        message: error instanceof Error ? error.message : defaultMessage,
      },
    } as ServerActionResult<T>),
  ),
  fetchWithTimeout: vi.fn(),
  DEFAULT_FETCH_TIMEOUT: 30_000,
}));
// Register before dynamically importing the action so coverage stays scoped to this action file.
vi.doMock("@/lib/utils.generic", () => ({
  validateStringIsGuidType: vi.fn((value: string) => {
    const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!guidRegex.test(value)) {
      throw new Error(`Invalid GUID: ${value}`);
    }
  }),
}));

const {addInvoiceMetadata} = await import("./addInvoiceMetadata");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("addInvoiceMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1"});
    mockFetchWithTimeout.mockResolvedValue(
      createJsonResponse(undefined, {status: 200}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("patches metadata entries for a valid invoice id", async () => {
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const entries = {category: "travel", aiConfidence: 0.95, archived: true};

    const result = await addInvoiceMetadata({invoiceId, entries});

    expect(result.success).toBe(true);
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceId}/metadata`,
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
    );

    const callArgs = mockFetchWithTimeout.mock.calls[0];
    const body = JSON.parse(callArgs?.[1]?.body as string);
    expect(body).toEqual({entries: {category: "travel", aiConfidence: 0.95, archived: true}});
  });

  it("returns an error result for an invalid invoice id", async () => {
    const invalidId = "not-a-guid";
    const entries = {category: "travel"};

    const result = await addInvoiceMetadata({invoiceId: invalidId, entries});

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
    const entries = {category: "travel"};

    const result = await addInvoiceMetadata({invoiceId, entries});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to add invoice metadata");
    }

    mockFetchWithTimeout.mockResolvedValue(
      createTextResponse("Bad Request", {status: 400, statusText: "Bad Request"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result2 = await addInvoiceMetadata({invoiceId, entries});

    expect(result2.success).toBe(false);
    if (!result2.success) {
      expect(result2.error.message).toContain("400");
      expect(result2.error.message).toContain("Failed to add invoice metadata");
    }
  });

  it("returns an error result when auth or fetch throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth service unavailable"));

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const entries = {category: "travel"};

    const result = await addInvoiceMetadata({invoiceId, entries});

    expect(result.success).toBe(false);
    expect(mockFetchWithTimeout).not.toHaveBeenCalled();
  });

  it("handles fetch throwing a non-Error object", async () => {
    mockFetchWithTimeout.mockRejectedValue("String error");

    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const entries = {category: "travel"};

    const result = await addInvoiceMetadata({invoiceId, entries});

    expect(result.success).toBe(false);
  });
});
