import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import {attachInvoiceScan} from "./attachInvoiceScan";

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("@/lib/utils.server", () => ({
  API_URL: "http://mock-api",
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

// Valid UUID v4 for testing
const VALID_UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

describe("attachInvoiceScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should attach an invoice scan successfully", async () => {
    const mockToken = "mock-token";
    const invoiceId = VALID_UUID;
    const payload = {some: "data"} as any;

    (fetchBFFUserFromAuthService as any).mockResolvedValue({userJwt: mockToken});
    (global.fetch as any).mockResolvedValue({
      ok: true,
    });

    await attachInvoiceScan({invoiceId, payload});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(`http://mock-api/rest/v1/invoices/${invoiceId}/scans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  });

  it("should throw an error if attachment fails", async () => {
    const mockToken = "mock-token";
    const invoiceId = VALID_UUID;
    const payload = {some: "data"} as any;
    const errorMessage = "Bad Request";

    (fetchBFFUserFromAuthService as any).mockResolvedValue({userJwt: mockToken});
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => errorMessage,
    });

    await expect(attachInvoiceScan({invoiceId, payload})).rejects.toThrow(
      `BFF attach invoice scan request failed: 400 Bad Request - ${errorMessage}`,
    );
  });
});
