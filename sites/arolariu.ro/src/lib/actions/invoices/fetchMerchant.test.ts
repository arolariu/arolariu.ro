/**
 * @fileoverview Unit tests for merchant fetch action.
 * @module sites/arolariu.ro/src/lib/actions/invoices/fetchMerchant/tests
 */

import {MerchantBuilder} from "@/data/mocks";
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
}));

vi.mock("../../utils.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils.server")>();
  return {
    ...actual,
    API_URL: "https://mock-api",
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
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(`https://mock-api/rest/v1/merchants/${mockMerchant.id}`, {
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
});
