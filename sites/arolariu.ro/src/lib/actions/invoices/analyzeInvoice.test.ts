import {beforeEach, describe, expect, it, vi} from "vitest";
import analyzeInvoice from "./analyzeInvoice";
import type {Invoice} from "@/types/invoices";

// Mock API_URL
vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://api.test.com",
}));

describe("analyzeInvoice", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("should analyze invoice successfully", async () => {
    const mockInvoice: Partial<Invoice> = {
      id: "invoice-1",
      name: "Analyzed Invoice",
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    } as Response);

    const result = await analyzeInvoice("invoice-1", "test-jwt-token");

    expect(result).toEqual(mockInvoice);
    expect(global.fetch).toHaveBeenCalledWith("https://api.test.com/rest/v1/invoices/invoice-1/analyze", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-jwt-token",
        "Content-Type": "application/json",
      },
      body: "1",
    });
    expect(consoleInfoSpy).toHaveBeenCalledWith(">>> Executing server action::analyzeInvoice, with:", {
      id: "invoice-1",
      authToken: "test-jwt-token",
    });
  });

  it("should return null when response is not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const result = await analyzeInvoice("invoice-1", "test-jwt-token");

    expect(result).toBeNull();
  });

  it("should throw error when fetch fails", async () => {
    const mockError = new Error("Network error");
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

    await expect(analyzeInvoice("invoice-1", "test-jwt-token")).rejects.toThrow("Network error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error analyzing the invoice:", mockError);
  });

  it("should handle 401 unauthorized", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    const result = await analyzeInvoice("invoice-1", "invalid-token");

    expect(result).toBeNull();
  });

  it("should handle 500 server error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await analyzeInvoice("invoice-1", "test-jwt-token");

    expect(result).toBeNull();
  });
});
