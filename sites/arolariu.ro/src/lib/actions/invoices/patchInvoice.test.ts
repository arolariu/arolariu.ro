import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import patchInvoice from "./patchInvoice";

// URL constant must be inlined in the mock since vi.mock is hoisted
const MOCK_API_URL = "https://mock-api.test";

// Mock dependencies - vi.mock is hoisted, so use inline values
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("../../utils.server", () => ({
  API_URL: "https://mock-api.test", // Must be inlined - vi.mock is hoisted before const declarations
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("patchInvoice", () => {
  const mockToken = "mock-jwt-token";
  const mockInvoiceId = "invoice-123";

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful patch operations", () => {
    it("should patch an invoice name successfully", async () => {
      const mockUpdatedInvoice = {id: mockInvoiceId, name: "Updated Name"};
      const payload = {name: "Updated Name"};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await patchInvoice({invoiceId: mockInvoiceId, payload});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
      expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
      expect(globalThis.fetch).toHaveBeenCalledWith(`${MOCK_API_URL}/rest/v1/invoices/${mockInvoiceId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${mockToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    });

    it("should patch invoice description successfully", async () => {
      const mockUpdatedInvoice = {id: mockInvoiceId, description: "New description"};
      const payload = {description: "New description"};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await patchInvoice({invoiceId: mockInvoiceId, payload});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });

    it("should patch sharedWith array successfully", async () => {
      const sharedWith = ["user-1", "user-2", "99999999-9999-9999-9999-999999999999"];
      const mockUpdatedInvoice = {id: mockInvoiceId, sharedWith};
      const payload = {sharedWith};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await patchInvoice({invoiceId: mockInvoiceId, payload});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({sharedWith}),
        }),
      );
    });

    it("should patch isImportant flag successfully", async () => {
      const mockUpdatedInvoice = {id: mockInvoiceId, isImportant: true};
      const payload = {isImportant: true};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await patchInvoice({invoiceId: mockInvoiceId, payload});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });

    it("should patch multiple fields at once", async () => {
      const mockUpdatedInvoice = {
        id: mockInvoiceId,
        name: "Multi Update",
        description: "Multiple fields",
        isImportant: true,
      };
      const payload = {
        name: "Multi Update",
        description: "Multiple fields",
        isImportant: true,
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await patchInvoice({invoiceId: mockInvoiceId, payload});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });

    it("should patch additionalMetadata successfully", async () => {
      const additionalMetadata = {customField: "value", count: 42};
      const mockUpdatedInvoice = {id: mockInvoiceId, additionalMetadata};
      const payload = {additionalMetadata};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await patchInvoice({invoiceId: mockInvoiceId, payload});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });
  });

  describe("validation errors", () => {
    it("should return error for empty invoiceId", async () => {
      const payload = {name: "Test"};

      const result = await patchInvoice({invoiceId: "", payload});

      expect(result).toEqual({success: false, error: "Invoice ID is required"});
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should return error for whitespace-only invoiceId", async () => {
      const payload = {name: "Test"};

      const result = await patchInvoice({invoiceId: "   ", payload});

      expect(result).toEqual({success: false, error: "Invoice ID is required"});
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should return error for empty payload", async () => {
      const result = await patchInvoice({invoiceId: mockInvoiceId, payload: {}});

      expect(result).toEqual({success: false, error: "Patch payload cannot be empty"});
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe("API error handling", () => {
    it("should return error for 404 response", async () => {
      const errorMessage = "Invoice not found";

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => errorMessage,
      });

      const result = await patchInvoice({
        invoiceId: mockInvoiceId,
        payload: {name: "Test"},
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to update invoice: 404 Not Found",
      });
    });

    it("should return error for 401 unauthorized response", async () => {
      const errorMessage = "Unauthorized";

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => errorMessage,
      });

      const result = await patchInvoice({
        invoiceId: mockInvoiceId,
        payload: {name: "Test"},
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to update invoice: 401 Unauthorized",
      });
    });

    it("should return error for 403 forbidden response", async () => {
      const errorMessage = "Access denied";

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => errorMessage,
      });

      const result = await patchInvoice({
        invoiceId: mockInvoiceId,
        payload: {name: "Test"},
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to update invoice: 403 Forbidden",
      });
    });

    it("should return error for 500 server error response", async () => {
      const errorMessage = "Internal server error";

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => errorMessage,
      });

      const result = await patchInvoice({
        invoiceId: mockInvoiceId,
        payload: {name: "Test"},
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to update invoice: 500 Internal Server Error",
      });
    });
  });

  describe("network and exception handling", () => {
    it("should handle fetch network error", async () => {
      const networkError = new Error("Network request failed");

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(networkError);

      const result = await patchInvoice({
        invoiceId: mockInvoiceId,
        payload: {name: "Test"},
      });

      expect(result).toEqual({
        success: false,
        error: "Network request failed",
      });
    });

    it("should handle auth service failure", async () => {
      const authError = new Error("Auth service unavailable");

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockRejectedValue(authError);

      const result = await patchInvoice({
        invoiceId: mockInvoiceId,
        payload: {name: "Test"},
      });

      expect(result).toEqual({
        success: false,
        error: "Auth service unavailable",
      });
    });

    it("should handle non-Error exceptions", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue("String error");

      const result = await patchInvoice({
        invoiceId: mockInvoiceId,
        payload: {name: "Test"},
      });

      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred",
      });
    });
  });

  describe("authentication", () => {
    it("should include Bearer token in Authorization header", async () => {
      const customToken = "custom-jwt-token";
      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: customToken});

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({id: mockInvoiceId}),
      });

      await patchInvoice({invoiceId: mockInvoiceId, payload: {name: "Test"}});

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${customToken}`,
          }),
        }),
      );
    });

    it("should set Content-Type to application/json", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({id: mockInvoiceId}),
      });

      await patchInvoice({invoiceId: mockInvoiceId, payload: {name: "Test"}});

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });
  });

  describe("request body serialization", () => {
    it("should serialize payload to JSON in request body", async () => {
      const payload = {
        name: "Test Invoice",
        description: "Test description",
        sharedWith: ["user-1"],
      };

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({id: mockInvoiceId, ...payload}),
      });

      await patchInvoice({invoiceId: mockInvoiceId, payload});

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(payload),
        }),
      );
    });

    it("should use PATCH HTTP method", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({id: mockInvoiceId}),
      });

      await patchInvoice({invoiceId: mockInvoiceId, payload: {name: "Test"}});

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "PATCH",
        }),
      );
    });
  });
});
