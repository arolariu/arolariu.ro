import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import fetchMerchant from "./fetchMerchant";

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

// Valid UUID v4 for testing
const VALID_UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

describe("fetchMerchant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch a merchant successfully", async () => {
    const mockMerchant = {id: VALID_UUID, name: "Test Merchant"};
    const mockToken = "mock-token";
    const merchantId = VALID_UUID;

    (fetchBFFUserFromAuthService as any).mockResolvedValue({userJwt: mockToken});
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockMerchant,
    });

    const result = await fetchMerchant({merchantId});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(`http://mock-api/rest/v1/merchants/${merchantId}`, {
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(result).toEqual(mockMerchant);
  });

  it("should throw an error if fetch fails", async () => {
    const mockToken = "mock-token";
    const merchantId = VALID_UUID;
    const errorMessage = "Not Found";

    (fetchBFFUserFromAuthService as any).mockResolvedValue({userJwt: mockToken});
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => errorMessage,
    });

    await expect(fetchMerchant({merchantId})).rejects.toThrow(`BFF fetch merchant request failed: 404 Not Found - ${errorMessage}`);
  });
});
