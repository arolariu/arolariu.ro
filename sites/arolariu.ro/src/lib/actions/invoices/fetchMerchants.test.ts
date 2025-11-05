import type {Merchant} from "@/types/invoices";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import fetchMerchants from "./fetchMerchants";

// Mock API_URL
vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://api.test.com",
}));

describe("fetchMerchants", () => {
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

  it("should fetch merchants successfully", async () => {
    const mockMerchants: Partial<Merchant>[] = [
      {id: "merchant-1", name: "Merchant 1"},
      {id: "merchant-2", name: "Merchant 2"},
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockMerchants,
    });

    const result = await fetchMerchants("test-token");

    expect(result).toEqual(mockMerchants);
    expect(mockFetch).toHaveBeenCalledWith("https://api.test.com/rest/v1/merchants", {
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith(">>> Executing server action::fetchMerchants, with:", {
      authToken: "test-token",
    });
  });

  it("should return empty array when no merchants exist", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await fetchMerchants("test-token");

    expect(result).toEqual([]);
  });

  it("should throw error when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchMerchants("test-token")).rejects.toThrow("Failed to fetch merchants. Status: 404");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should throw error on network failure", async () => {
    const networkError = new Error("Network error");
    mockFetch.mockRejectedValue(networkError);

    await expect(fetchMerchants("test-token")).rejects.toThrow("Network error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching the merchants from the server:", networkError);
  });

  it("should include authorization header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await fetchMerchants("my-auth-token");

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

    await expect(fetchMerchants("invalid-token")).rejects.toThrow("Failed to fetch merchants. Status: 401");
  });

  it("should handle 500 server error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(fetchMerchants("test-token")).rejects.toThrow("Failed to fetch merchants. Status: 500");
  });

  it("should handle JSON parsing errors", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    await expect(fetchMerchants("test-token")).rejects.toThrow("Invalid JSON");
  });
});
