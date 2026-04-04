/**
 * @fileoverview Unit tests for merchant fetch action.
 * @module sites/arolariu.ro/src/lib/actions/invoices/fetchMerchant/tests
 */

import {MerchantBuilder} from "@/data/mocks";
import {MerchantCategory} from "@/types/invoices/Merchant";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import fetchMerchant from "./fetchMerchant";

// Create mock function using vi.hoisted for fetchWithTimeout
const {mockFetchWithTimeout} = vi.hoisted(() => ({
  mockFetchWithTimeout: vi.fn(),
}));

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: vi.fn(() => ({})),
}));

vi.mock("../../utils.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils.server")>();
  return {
    ...actual,
    fetchWithTimeout: mockFetchWithTimeout,
  };
});

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("fetchMerchant", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch a merchant successfully", async () => {
    const mockMerchant = new MerchantBuilder().withName("Test Merchant").build();

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => mockMerchant,
    });

    const result = await fetchMerchant({merchantId: mockMerchant.id});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(`/rest/v1/merchants/${mockMerchant.id}`, {
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(result).toEqual({success: true, data: mockMerchant});
  });

  it("should return error result if fetch fails with HTTP error", async () => {
    const mockMerchant = new MerchantBuilder().build();
    const errorMessage = "Not Found";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => errorMessage,
    });

    const result = await fetchMerchant({merchantId: mockMerchant.id});

    expect(result).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Failed to fetch merchant: 404 Not Found",
        status: 404,
      },
    });
  });

  it("should return validation error for invalid merchant ID", async () => {
    const result = await fetchMerchant({merchantId: "invalid-id"});

    expect(result).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid merchant ID: invalid-id",
      },
    });
  });

  describe("additional error scenarios", () => {
    it("should handle network timeout gracefully", async () => {
      // Arrange
      const mockMerchant = new MerchantBuilder().build();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      mockFetchWithTimeout.mockRejectedValue(new Error("Request timeout"));

      // Act
      const result = await fetchMerchant({merchantId: mockMerchant.id});

      // Assert
      expect(result).toEqual({
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Request timeout",
        },
      });
    });

    it("should handle auth service failure", async () => {
      // Arrange
      const mockMerchant = new MerchantBuilder().build();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Auth service unavailable"));

      // Act
      const result = await fetchMerchant({merchantId: mockMerchant.id});

      // Assert
      expect(result).toEqual({
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Auth service unavailable",
        },
      });
    });

    it("should handle 401 Unauthorized", async () => {
      // Arrange
      const mockMerchant = new MerchantBuilder().build();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      mockFetchWithTimeout.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "Invalid token",
      });

      // Act
      const result = await fetchMerchant({merchantId: mockMerchant.id});

      // Assert
      expect(result).toEqual({
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "Failed to fetch merchant: 401 Unauthorized",
          status: 401,
        },
      });
    });

    it("should handle 403 Forbidden", async () => {
      // Arrange
      const mockMerchant = new MerchantBuilder().build();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      mockFetchWithTimeout.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => "Access denied",
      });

      // Act
      const result = await fetchMerchant({merchantId: mockMerchant.id});

      // Assert
      expect(result).toEqual({
        success: false,
        error: {
          code: "AUTH_ERROR",
          message: "Failed to fetch merchant: 403 Forbidden",
          status: 403,
        },
      });
    });

    it("should handle 500 Internal Server Error", async () => {
      // Arrange
      const mockMerchant = new MerchantBuilder().build();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      mockFetchWithTimeout.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Server error occurred",
      });

      // Act
      const result = await fetchMerchant({merchantId: mockMerchant.id});

      // Assert
      expect(result).toEqual({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch merchant: 500 Internal Server Error",
          status: 500,
        },
      });
    });

    it("should handle empty response text", async () => {
      // Arrange
      const mockMerchant = new MerchantBuilder().build();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      mockFetchWithTimeout.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "",
      });

      // Act
      const result = await fetchMerchant({merchantId: mockMerchant.id});

      // Assert
      expect(result).toEqual({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch merchant: 500 Internal Server Error",
          status: 500,
        },
      });
    });

    it("should handle empty merchantId", async () => {
      // Act
      const result = await fetchMerchant({merchantId: ""});

      // Assert
      expect(result).toEqual({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid merchant ID: ",
        },
      });
    });

    it("should handle null-like merchantId", async () => {
      // Act
      const result = await fetchMerchant({merchantId: "null"});

      // Assert
      expect(result).toEqual({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid merchant ID: null",
        },
      });
    });
  });

  describe("successful responses", () => {
    it("should include all merchant data fields", async () => {
      // Arrange
      const mockMerchant = new MerchantBuilder().withName("Test Store").withCategory(MerchantCategory.SUPERMARKET).build();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      mockFetchWithTimeout.mockResolvedValue({
        ok: true,
        json: async () => mockMerchant,
      });

      // Act
      const result = await fetchMerchant({merchantId: mockMerchant.id});

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockMerchant);
        expect(result.data?.name).toBe("Test Store");
        expect(result.data?.category).toBe(MerchantCategory.SUPERMARKET);
      }
    });

    it("should handle merchant with minimal data", async () => {
      // Arrange
      const minimalMerchant = new MerchantBuilder().withName("Minimal Store").build();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      mockFetchWithTimeout.mockResolvedValue({
        ok: true,
        json: async () => minimalMerchant,
      });

      // Act
      const result = await fetchMerchant({merchantId: minimalMerchant.id});

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });
  });
});
