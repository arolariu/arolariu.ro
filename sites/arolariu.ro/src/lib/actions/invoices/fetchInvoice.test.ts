import type {Invoice} from "@/types/invoices";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import fetchInvoice from "./fetchInvoice";

// Mock API_URL
vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://api.test.com",
}));

describe("fetchInvoice", () => {
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

  it("should fetch invoice successfully", async () => {
    const mockInvoice: Partial<Invoice> = {
      id: "invoice-123",
      name: "Test Invoice",
      totalAmount: 100.5,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    const result = await fetchInvoice("invoice-123", "test-token");

    expect(result).toEqual(mockInvoice);
    expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/rest/v1/invoices/invoice-123", {
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith(">>> Executing server action::fetchInvoice, with:", {
      id: "invoice-123",
      authToken: "test-token",
    });
  });

  it("should throw error when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchInvoice("invoice-123", "test-token")).rejects.toThrow("Failed to fetch invoice. Status: 404");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should throw error on network failure", async () => {
    const networkError = new Error("Network connection failed");
    mockFetch.mockRejectedValue(networkError);

    await expect(fetchInvoice("invoice-123", "test-token")).rejects.toThrow("Network connection failed");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching the invoice from the server:", networkError);
  });

  it("should include authorization header with bearer token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await fetchInvoice("test-id", "my-auth-token");

    expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
      headers: expect.objectContaining({
        Authorization: "Bearer my-auth-token",
      }),
    });
  });

  it("should handle different invoice IDs", async () => {
    const ids = ["inv-1", "inv-2", "inv-3"];

    for (const id of ids) {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({id}),
      });

      await fetchInvoice(id, "token");

      expect(mockFetch).toHaveBeenCalledWith(`https://api.test.com/rest/v1/invoices/${id}`, expect.any(Object));
    }
  });

  it("should throw error on 401 unauthorized", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(fetchInvoice("invoice-123", "invalid-token")).rejects.toThrow("Failed to fetch invoice. Status: 401");
  });

  it("should throw error on 500 server error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(fetchInvoice("invoice-123", "test-token")).rejects.toThrow("Failed to fetch invoice. Status: 500");
  });
});
