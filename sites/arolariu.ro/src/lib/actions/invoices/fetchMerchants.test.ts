/**
 * @fileoverview Unit tests for merchants list fetch action.
 * @module sites/arolariu.ro/src/lib/actions/invoices/fetchMerchants/tests
 */

import {MerchantBuilder} from "@/data/mocks";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import fetchMerchants from "./fetchMerchants";

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

describe("fetchMerchants", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch merchants successfully", async () => {
    const mockMerchants = new MerchantBuilder().buildMany(3);

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => mockMerchants,
    });

    const result = await fetchMerchants();

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(mockFetchWithTimeout).toHaveBeenCalledWith("https://mock-api/rest/v1/merchants", {
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(result).toEqual({success: true, data: mockMerchants});
  });

  it("should return error result if fetch fails with HTTP error", async () => {
    const errorMessage = "Internal Server Error";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => errorMessage,
    });

    const result = await fetchMerchants();

    expect(result).toEqual({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to fetch merchants: 500 Internal Server Error",
        status: 500,
      },
    });
  });

  it("should return error result if fetchBFFUserFromAuthService fails", async () => {
    const error = new Error("Auth failed");

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    const result = await fetchMerchants();

    expect(result).toEqual({
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Auth failed",
      },
    });
  });
});
