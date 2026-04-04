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
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: vi.fn(() => ({})),
}));

vi.mock("@/lib/config/configProxy", () => ({
  fetchApiUrl: async () => "https://mock-api",
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
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `https://mock-api/rest/v1/invoices/${mockInvoice.id}/analyze`,
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIdentifier: mockUserIdentifier,
          analysisOptions,
        }),
      }),
    );
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

    const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});
    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("500 Internal Server Error"),
    });
  });

  describe("validation failures", () => {
    it("should return error result when invoiceId is not a valid GUID", async () => {
      // Arrange
      const invalidId = "not-a-valid-guid";
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: invalidId, analysisOptions});

      // Assert
      expect(result).toEqual({
        success: false,
        error: 'Invalid invoiceIdentifier: "not-a-valid-guid" is not a valid GUID',
      });
    });

    it("should return error result when invoiceId is empty string", async () => {
      // Arrange
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: "", analysisOptions});

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Invalid invoiceIdentifier: expected a non-empty string, got string",
      });
    });
  });

  describe("authentication failures", () => {
    it("should return error when fetchBFFUserFromAuthService fails", async () => {
      // Arrange
      const mockInvoice = new InvoiceBuilder().build();
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Auth service unavailable"));

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Auth service unavailable",
      });
    });

    it("should return error when user JWT is missing", async () => {
      // Arrange
      const mockInvoice = new InvoiceBuilder().build();
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
        userJwt: undefined,
        userIdentifier: mockUserIdentifier,
      });

      // Act & Assert - will throw when trying to use undefined JWT in Authorization header
      const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});
      expect(result.success).toBe(false);
    });
  });

  describe("API response errors", () => {
    it("should handle 400 Bad Request", async () => {
      // Arrange
      const mockInvoice = new InvoiceBuilder().build();
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
        userJwt: mockToken,
        userIdentifier: mockUserIdentifier,
      });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => "Invalid invoice data",
      });

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});

      // Assert
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining("400 Bad Request"),
      });
    });

    it("should handle 401 Unauthorized", async () => {
      // Arrange
      const mockInvoice = new InvoiceBuilder().build();
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
        userJwt: mockToken,
        userIdentifier: mockUserIdentifier,
      });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "Invalid token",
      });

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});

      // Assert
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining("401 Unauthorized"),
      });
    });

    it("should handle 404 Not Found", async () => {
      // Arrange
      const mockInvoice = new InvoiceBuilder().build();
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
        userJwt: mockToken,
        userIdentifier: mockUserIdentifier,
      });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => "Invoice not found",
      });

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});

      // Assert
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining("404 Not Found"),
      });
    });

    it("should handle 503 Service Unavailable", async () => {
      // Arrange
      const mockInvoice = new InvoiceBuilder().build();
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
        userJwt: mockToken,
        userIdentifier: mockUserIdentifier,
      });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: async () => "Analysis service is down",
      });

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});

      // Assert
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining("503 Service Unavailable"),
      });
    });
  });

  describe("network errors", () => {
    it("should handle network timeout", async () => {
      // Arrange
      const mockInvoice = new InvoiceBuilder().build();
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
        userJwt: mockToken,
        userIdentifier: mockUserIdentifier,
      });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Request timeout"));

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Request timeout",
      });
    });

    it("should handle network connection failure", async () => {
      // Arrange
      const mockInvoice = new InvoiceBuilder().build();
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
        userJwt: mockToken,
        userIdentifier: mockUserIdentifier,
      });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network connection failed"));

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Network connection failed",
      });
    });

    it("should handle unknown errors gracefully", async () => {
      // Arrange
      const mockInvoice = new InvoiceBuilder().build();
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
        userJwt: mockToken,
        userIdentifier: mockUserIdentifier,
      });
      // Simulate a non-Error object being thrown
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue("Unknown error");

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Unknown analysis error",
      });
    });
  });

  describe("analysis options", () => {
    it("should handle InvoiceOnly option", async () => {
      // Arrange
      const mockInvoice = new InvoiceBuilder().build();
      const analysisOptions = InvoiceAnalysisOptions.InvoiceOnly;

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
        userJwt: mockToken,
        userIdentifier: mockUserIdentifier,
      });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});

      // Assert
      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            userIdentifier: mockUserIdentifier,
            analysisOptions: InvoiceAnalysisOptions.InvoiceOnly,
          }),
        }),
      );
    });

    it("should handle CompleteAnalysis option", async () => {
      // Arrange
      const mockInvoice = new InvoiceBuilder().build();
      const analysisOptions = InvoiceAnalysisOptions.CompleteAnalysis;

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({
        userJwt: mockToken,
        userIdentifier: mockUserIdentifier,
      });
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      // Act
      const result = await analyzeInvoice({invoiceIdentifier: mockInvoice.id, analysisOptions});

      // Assert
      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            userIdentifier: mockUserIdentifier,
            analysisOptions: InvoiceAnalysisOptions.CompleteAnalysis,
          }),
        }),
      );
    });
  });
});
