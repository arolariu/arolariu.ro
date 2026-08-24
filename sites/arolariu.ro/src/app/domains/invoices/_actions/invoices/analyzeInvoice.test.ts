/**
 * @fileoverview Unit tests for analyzeInvoice server action.
 * @module app/domains/invoices/_actions/invoices/analyzeInvoice.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";

vi.mock("@/lib/actions/user/fetchUser");
const {analyzeInvoice} = await import("./analyzeInvoice");
const mockFetchUser = vi.mocked(fetchBFFUserFromAuthService);
const fetchMock = vi.mocked(fetchWithTimeout);

describe("analyzeInvoice", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchUser.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-1", userJwt: "jwt-1"}));
    fetchMock.mockResolvedValue({
      ok: true,
      status: 202,
      statusText: "Accepted",
      json: async () => "queue-message-42",
      text: async () => "",
    } as Response);
  });

  it("sends a flat capability request without a user identifier", async () => {
    await analyzeInvoice({invoiceIdentifier: invoiceId, profile: "balanced"});
    const [, init] = fetchMock.mock.calls[0]!;
    const body: unknown = JSON.parse(String(init?.body));
    expect(body).toStrictEqual({profile: "balanced"});
    expect(body).not.toHaveProperty("userIdentifier");
    expect(body).not.toHaveProperty("analysisOptions");
  });

  it("returns the queue message identifier from the 202 body", async () => {
    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, profile: "comprehensive"});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("queue-message-42");
    }
  });

  it("returns a failure when the 202 body is an object rather than a string", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({messageId: "x"}),
      text: async () => "",
    } as Response);
    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, profile: "balanced"});
    expect(result.success).toBe(false);
  });

  it("never requests the custom profile", async () => {
    await analyzeInvoice({invoiceIdentifier: invoiceId, profile: "comprehensive", overrides: {invoiceSummary: false}});
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as {profile: string};
    expect(["fast", "balanced", "comprehensive"]).toContain(body.profile);
  });

  it("posts an analysis request with a sixty-second timeout", async () => {
    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, profile: "comprehensive"});

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(invoiceId),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-1",
          "Content-Type": "application/json",
        }),
      }),
      60_000,
    );
  });

  it("returns an error result for an invalid invoice id", async () => {
    const result = await analyzeInvoice({invoiceIdentifier: "not-a-guid", profile: "balanced"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("invoiceIdentifier");
    }
  });

  it("returns the server-error user message for 5xx responses", async () => {
    fetchMock.mockResolvedValue(
      TestDataBuilder.textResponse("Server error", {status: 500, statusText: "Internal Server Error"}) as Awaited<
        ReturnType<typeof fetchWithTimeout>
      >,
    );

    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, profile: "balanced"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to analyze invoice");
    }
  });

  it("returns the retry user message for non-5xx responses", async () => {
    fetchMock.mockResolvedValue(
      TestDataBuilder.textResponse("Bad request", {status: 400, statusText: "Bad Request"}) as Awaited<ReturnType<typeof fetchWithTimeout>>,
    );

    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, profile: "balanced"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to analyze");
    }
  });

  it("returns an error result when auth throws", async () => {
    mockFetchUser.mockRejectedValue(new Error("Auth failed"));

    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, profile: "balanced"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Auth failed");
    }
  });

  it("returns an error result when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, profile: "balanced"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Network error");
    }
  });

  it("returns a fallback error message when auth throws a non-Error", async () => {
    mockFetchUser.mockRejectedValue("Auth string error");

    const result = await analyzeInvoice({invoiceIdentifier: invoiceId, profile: "balanced"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Unknown analysis error");
    }
  });
});