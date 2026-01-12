/**
 * @fileoverview Unit tests for merchants list fetch action.
 * @module sites/arolariu.ro/src/lib/actions/invoices/fetchMerchants/tests
 */

import {MerchantBuilder} from "@/data/mocks";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import fetchMerchants from "./fetchMerchants";

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

describe("fetchMerchants", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch merchants successfully", async () => {
    const mockMerchants = new MerchantBuilder().buildMany(3);

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockMerchants,
    });

    const result = await fetchMerchants();

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith("https://mock-api/rest/v1/merchants", {
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(result).toEqual(mockMerchants);
  });

  it("should throw an error if fetch fails", async () => {
    const errorMessage = "Internal Server Error";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => errorMessage,
    });

    await expect(fetchMerchants()).rejects.toThrow(`BFF fetch merchants request failed: 500 Internal Server Error - ${errorMessage}`);
  });
});
