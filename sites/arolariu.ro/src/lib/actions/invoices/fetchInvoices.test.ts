import {InvoiceBuilder} from "@/data/mocks";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import fetchInvoices from "./fetchInvoices";

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("../../utils.server", () => ({
  API_URL: "http://mock-api",
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("fetchInvoices", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch invoices successfully", async () => {
    const mockInvoices = new InvoiceBuilder().buildMany(3);

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    const result = await fetchInvoices();

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith("http://mock-api/rest/v1/invoices/", {
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(result).toEqual(mockInvoices);
  });

  it("should throw an error if fetch fails", async () => {
    const errorMessage = "Internal Server Error";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => errorMessage,
    });

    await expect(fetchInvoices()).rejects.toThrow(
      `BFF fetch invoices request failed: 500 Internal Server Error - ${errorMessage}`,
    );
  });

  it("should throw an error if fetchBFFUserFromAuthService fails", async () => {
    const error = new Error("Auth failed");

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    await expect(fetchInvoices()).rejects.toThrow("Auth failed");
  });
});
