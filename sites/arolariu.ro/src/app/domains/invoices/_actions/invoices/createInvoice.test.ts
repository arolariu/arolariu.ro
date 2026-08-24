/**
 * @fileoverview Unit tests for createInvoice server action.
 * @module app/domains/invoices/_actions/invoices/createInvoice.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
const {createInvoice} = await import("./createInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchWithTimeout = vi.mocked(fetchWithTimeout);

describe("createInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    mockFetchWithTimeout.mockResolvedValue(
      TestDataBuilder.jsonResponse(
        TestDataBuilder.build("invoice", {
          id: "11111111-1111-4111-8111-111111111111",
          userIdentifier: "22222222-2222-4222-8222-222222222222",
          merchantReference: "33333333-3333-4333-8333-333333333333",
        }),
      ) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );
  });

  it("posts a creation payload with authenticated userIdentifier when missing", async () => {
    const payload = {
      initialScan: TestDataBuilder.build("invoiceScan", {
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
    const payload = TestDataBuilder.build("createInvoicePayload", {
      userIdentifier: "custom-user-id",
      initialScan: TestDataBuilder.build("invoiceScan", {
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

  it("sends additionalMetadata instead of metadata on the wire", async () => {
    const payload = {
      initialScan: TestDataBuilder.build("invoiceScan", {location: "https://storage.test/scan.jpg"}),
      metadata: {isImportant: "false", requiresAnalysis: "true"},
    };

    await createInvoice(payload);

    const callArgs = mockFetchWithTimeout.mock.calls[0];
    const body: unknown = JSON.parse(String(callArgs?.[1]?.body));
    expect(body).toHaveProperty("additionalMetadata");
    expect(body).not.toHaveProperty("metadata");
  });

  it("does not carry client-only fields the backend ignores", async () => {
    const payload = TestDataBuilder.build("createInvoicePayload");
    await createInvoice(payload);

    const callArgs = mockFetchWithTimeout.mock.calls[0];
    const body: unknown = JSON.parse(String(callArgs?.[1]?.body));
    expect(body).not.toHaveProperty("category");
    expect(body).not.toHaveProperty("items");
    expect(body).not.toHaveProperty("possibleRecipes");
    expect(body).not.toHaveProperty("classification");
  });

  it("returns a validation failure when the API returns a malformed payload", async () => {
    mockFetchWithTimeout.mockResolvedValue(TestDataBuilder.jsonResponse({}) as Awaited<ReturnType<typeof fetchWithTimeout>>);

    const result = await createInvoice({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
