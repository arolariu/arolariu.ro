/**
 * @fileoverview Unit tests for merchant fetch action.
 * @module sites/arolariu.ro/src/lib/actions/invoices/fetchMerchant/tests
 */

import {MerchantBuilder} from "@/data/mocks";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import fetchMerchant from "./fetchMerchant";

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("../../utils.server", () => ({
  API_URL: "https://mock-api",
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("fetchMerchant", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch a merchant successfully", async () => {
    const mockMerchant = new MerchantBuilder().withName("Test Merchant").build();

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockMerchant,
    });

    const result = await fetchMerchant({merchantId: mockMerchant.id});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith(`https://mock-api/rest/v1/merchants/${mockMerchant.id}`, {
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(result).toEqual(mockMerchant);
  });

  it("should throw an error if fetch fails", async () => {
    const mockMerchant = new MerchantBuilder().build();
    const errorMessage = "Not Found";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => errorMessage,
    });

    await expect(fetchMerchant({merchantId: mockMerchant.id})).rejects.toThrow(
      `BFF fetch merchant request failed: 404 Not Found - ${errorMessage}`,
    );
  });
});
