/**
 * @fileoverview Unit tests for invoice analysis action.
 * @module sites/arolariu.ro/src/lib/actions/invoices/analyzeInvoice/tests
 */

import {InvoiceBuilder} from "@/data/mocks";
import {InvoiceAnalysisOptions} from "@/types/invoices";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import analyzeInvoice from "./analyzeInvoice";

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://mock-api",
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("analyzeInvoice", () => {
  const mockToken = "mock-token";
  const mockUserIdentifier = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should analyze an invoice successfully", async () => {
    const mockInvoice = new InvoiceBuilder().withUserIdentifier(mockUserIdentifier).build();
    const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
      userJwt: mockToken,
      userIdentifier: mockUserIdentifier,
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith(`https://mock-api/rest/v1/invoices/${mockInvoice.id}/analyze`, {
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
    const mockInvoice = new InvoiceBuilder().build();
    const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;
    const errorMessage = "Internal Server Error";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
      userJwt: mockToken,
      userIdentifier: mockUserIdentifier,
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => errorMessage,
    });

    await expect(analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions})).rejects.toThrow(
      `BFF analyze invoice request failed: 500 Internal Server Error - ${errorMessage}`,
    );
  });
});
