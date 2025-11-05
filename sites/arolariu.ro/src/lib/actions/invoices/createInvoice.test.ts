import {beforeEach, describe, expect, it, vi} from "vitest";
import {createInvoiceAction} from "./createInvoice";

// Mock API_URL
vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://api.test.com",
}));

describe("createInvoiceAction", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should create invoice successfully", async () => {
    const mockFormData = new FormData();
    // Don't actually append - just mock the FormData
    const mockResponse = {invoiceId: "new-invoice-123"};

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await createInvoiceAction({
      formData: mockFormData,
      userIdentifier: "user-123",
      userJwt: "test-jwt-token",
    });

    expect(result).toEqual({
      success: true,
      data: mockResponse,
    });

    expect(global.fetch).toHaveBeenCalledWith("https://api.test.com/rest/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-jwt-token",
      },
      body: mockFormData,
    });
  });

  it("should handle API error response", async () => {
    const mockFormData = new FormData();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Invalid file format",
    } as Response);

    const result = await createInvoiceAction({
      formData: mockFormData,
      userIdentifier: "user-123",
      userJwt: "test-jwt-token",
    });

    expect(result).toEqual({
      success: false,
      error: "API request failed: 400 Bad Request - Invalid file format",
    });
  });

  it("should handle 401 unauthorized", async () => {
    const mockFormData = new FormData();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "Invalid token",
    } as Response);

    const result = await createInvoiceAction({
      formData: mockFormData,
      userIdentifier: "user-123",
      userJwt: "invalid-token",
    });

    expect(result).toEqual({
      success: false,
      error: "API request failed: 401 Unauthorized - Invalid token",
    });
  });

  it("should handle network error", async () => {
    const mockFormData = new FormData();
    const mockError = new Error("Network error");

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

    const result = await createInvoiceAction({
      formData: mockFormData,
      userIdentifier: "user-123",
      userJwt: "test-jwt-token",
    });

    expect(result).toEqual({
      success: false,
      error: "Network error",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error in createInvoiceAction:", mockError);
  });

  it("should handle unknown error", async () => {
    const mockFormData = new FormData();

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue("Unknown error");

    const result = await createInvoiceAction({
      formData: mockFormData,
      userIdentifier: "user-123",
      userJwt: "test-jwt-token",
    });

    expect(result).toEqual({
      success: false,
      error: "Unknown error occurred",
    });
  });

  it("should handle 500 server error", async () => {
    const mockFormData = new FormData();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Server error",
    } as Response);

    const result = await createInvoiceAction({
      formData: mockFormData,
      userIdentifier: "user-123",
      userJwt: "test-jwt-token",
    });

    expect(result).toEqual({
      success: false,
      error: "API request failed: 500 Internal Server Error - Server error",
    });
  });
});
