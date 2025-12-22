import {InvoiceBuilder, MerchantBuilder} from "@/data/mocks";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import {createInvoice} from "./createInvoice";

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("@/lib/utils.server", () => ({
  API_URL: "http://mock-api",
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("createInvoice", () => {
  const mockToken = "mock-token";
  const mockUserIdentifier = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create an invoice successfully", async () => {
    const mockMerchant = new MerchantBuilder().withName("Test Merchant").build();
    const mockPayload = {merchantName: mockMerchant.name};
    const mockInvoice = new InvoiceBuilder().withId("created-invoice-id").withMerchantReference(mockMerchant.id).build();

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
      userJwt: mockToken,
      userIdentifier: mockUserIdentifier,
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    const result = await createInvoice(mockPayload);

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith("http://mock-api/rest/v1/invoices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({...mockPayload, userIdentifier: mockUserIdentifier}),
    });
    expect(result).toEqual(mockInvoice);
  });

  it("should use provided userIdentifier if present", async () => {
    const mockMerchant = new MerchantBuilder().withName("Test Merchant").build();
    const providedUserId = "provided-id";
    const mockPayload = {merchantName: mockMerchant.name, userIdentifier: providedUserId};
    const mockInvoice = new InvoiceBuilder().withUserIdentifier(providedUserId).build();

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
      userJwt: mockToken,
      userIdentifier: "default-id",
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    await createInvoice(mockPayload);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify(mockPayload),
      }),
    );
  });

  it("should throw an error if creation fails", async () => {
    const mockMerchant = new MerchantBuilder().withName("Test Merchant").build();
    const mockPayload = {merchantName: mockMerchant.name};
    const errorMessage = "Bad Request";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
      userJwt: mockToken,
      userIdentifier: mockUserIdentifier,
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => errorMessage,
    });

    await expect(createInvoice(mockPayload)).rejects.toThrow(
      `BFF create invoice request failed: 400 Bad Request - ${errorMessage}`,
    );
  });
});
