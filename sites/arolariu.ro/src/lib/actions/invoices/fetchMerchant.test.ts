import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {Merchant} from "@/types/invoices";
import fetchMerchant from "./fetchMerchant";

// Mock API_URL
vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://api.test.com",
}));

describe("fetchMerchant", () => {
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

  it("should fetch merchant successfully", async () => {
    const mockMerchant: Partial<Merchant> = {
      id: "merchant-123",
      name: "Test Merchant",
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMerchant,
    });

    const result = await fetchMerchant("merchant-123", "test-token");

    expect(result).toEqual(mockMerchant);
    expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/rest/v1/merchants/merchant-123", {
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith(">>> Executing server action::fetchMerchant, with:", {
      id: "merchant-123",
      authToken: "test-token",
    });
  });

  it("should throw error when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchMerchant("merchant-123", "test-token")).rejects.toThrow("Failed to fetch merchant. Status: 404");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should throw error on network failure", async () => {
    const networkError = new Error("Network error");
    mockFetch.mockRejectedValue(networkError);

    await expect(fetchMerchant("merchant-123", "test-token")).rejects.toThrow("Network error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching the merchant from the server:", networkError);
  });

  it("should include bearer token in authorization header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await fetchMerchant("test-id", "my-auth-token");

    expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
      headers: expect.objectContaining({
        Authorization: "Bearer my-auth-token",
      }),
    });
  });

  it("should handle different merchant IDs", async () => {
    const ids = ["merchant-1", "merchant-2", "merchant-3"];

    for (const id of ids) {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({id}),
      });

      await fetchMerchant(id, "token");

      expect(mockFetch).toHaveBeenCalledWith(`https://api.test.com/rest/v1/merchants/${id}`, expect.any(Object));
    }
  });

  it("should handle 401 unauthorized error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(fetchMerchant("merchant-123", "invalid-token")).rejects.toThrow(
      "Failed to fetch merchant. Status: 401",
    );
  });

  it("should handle 500 server error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(fetchMerchant("merchant-123", "test-token")).rejects.toThrow("Failed to fetch merchant. Status: 500");
  });
});
