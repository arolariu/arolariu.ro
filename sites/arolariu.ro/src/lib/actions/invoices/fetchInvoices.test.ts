import {beforeEach, describe, expect, it, vi} from "vitest";
import type {Invoice} from "@/types/invoices";
import fetchInvoices from "./fetchInvoices";

// Mock API_URL
vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://api.test.com",
}));

describe("fetchInvoices", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("should fetch invoices successfully", async () => {
    const mockInvoices: Partial<Invoice>[] = [
      {id: "invoice-1", name: "Invoice 1", totalAmount: 100},
      {id: "invoice-2", name: "Invoice 2", totalAmount: 200},
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockInvoices,
    });

    const result = await fetchInvoices("test-token");

    expect(result).toEqual(mockInvoices);
    expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/rest/v1/invoices/", {
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith(">>> Executing server action::fetchInvoices, with:", {
      authToken: "test-token",
    });
  });

  it("should return empty array when no invoices exist", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await fetchInvoices("test-token");

    expect(result).toEqual([]);
  });

  it("should throw error when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchInvoices("test-token")).rejects.toThrow("Failed to fetch invoices. Status: 404");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should throw error on network failure", async () => {
    const networkError = new Error("Network error");
    mockFetch.mockRejectedValue(networkError);

    await expect(fetchInvoices("test-token")).rejects.toThrow("Network error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching the invoices from the server:", networkError);
  });

  it("should include authorization header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await fetchInvoices("my-auth-token");

    expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
      headers: expect.objectContaining({
        Authorization: "Bearer my-auth-token",
      }),
    });
  });

  it("should handle 401 unauthorized error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(fetchInvoices("invalid-token")).rejects.toThrow("Failed to fetch invoices. Status: 401");
  });

  it("should handle 500 server error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(fetchInvoices("test-token")).rejects.toThrow("Failed to fetch invoices. Status: 500");
  });
});
