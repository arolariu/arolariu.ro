import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import analyzeInvoice from "./analyzeInvoice";

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

// Mock enum
vi.mock("@/types/invoices", () => ({
  InvoiceAnalysisOptions: {
    BasicAnalysis: 0,
  },
}));

import {InvoiceAnalysisOptions} from "@/types/invoices";

describe("analyzeInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should analyze an invoice successfully", async () => {
    const mockToken = "mock-token";
    const mockUserIdentifier = "user-123";
    const invoiceIdentifier = "1";
    const analysisOptions = InvoiceAnalysisOptions.BasicAnalysis;

    (fetchBFFUserFromAuthService as any).mockResolvedValue({userJwt: mockToken, userIdentifier: mockUserIdentifier});
    (global.fetch as any).mockResolvedValue({
      ok: true,
    });

    await analyzeInvoice({invoiceIdentifier, analysisOptions});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(`http://mock-api/rest/v1/invoices/${invoiceIdentifier}/analyze`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userIdentifier: mockUserIdentifier,
        analysisOptions,
      }),
    });
  });

  it("should throw an error if analysis fails", async () => {
    const mockToken = "mock-token";
    const invoiceIdentifier = "1";
    const analysisOptions = InvoiceAnalysisOptions.BasicAnalysis;
    const errorMessage = "Internal Server Error";

    (fetchBFFUserFromAuthService as any).mockResolvedValue({userJwt: mockToken, userIdentifier: "user-123"});
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => errorMessage,
    });

    await expect(analyzeInvoice({invoiceIdentifier, analysisOptions})).rejects.toThrow(
      `BFF analyze invoice request failed: 500 Internal Server Error - ${errorMessage}`,
    );
  });
});
