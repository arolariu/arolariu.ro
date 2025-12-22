import type {Invoice} from "@/types/invoices";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import updateInvoice from "./updateInvoice";

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

// Valid UUID v4 for testing
const VALID_UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

/**
 * Creates a mock invoice object for testing.
 *
 * @param overrides - Partial invoice fields to override defaults
 * @returns A complete mock Invoice object
 */
function createMockInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: VALID_UUID,
    name: "Test Invoice",
    description: "Test invoice description",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false,
    isImportant: false,
    userIdentifier: "user-123",
    sharedWith: [],
    category: 0,
    scans: [],
    paymentInformation: {
      totalAmount: 100,
      currency: {name: "USD", symbol: "$", code: "USD"},
      dateOfPurchase: new Date().toISOString(),
      paymentType: 0,
      isTaxed: false,
      taxPercentage: 0,
    },
    merchantReference: "merchant-123",
    items: [],
    possibleRecipes: [],
    additionalMetadata: {},
    ...overrides,
  } as Invoice;
}

describe("updateInvoice", () => {
  const mockToken = "mock-jwt-token";
  const mockInvoiceId = VALID_UUID;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful update operations", () => {
    it("should update an invoice successfully", async () => {
      const mockInvoice = createMockInvoice();
      const mockUpdatedInvoice = {...mockInvoice, name: "Updated Name"};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
      expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
      expect(globalThis.fetch).toHaveBeenCalledWith(`${MOCK_API_URL}/rest/v1/invoices/${mockInvoiceId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockInvoice),
      });
    });

    it("should update invoice with modified name", async () => {
      const mockInvoice = createMockInvoice({name: "New Invoice Name"});
      const mockUpdatedInvoice = {...mockInvoice};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });

    it("should update invoice with modified sharedWith array", async () => {
      const sharedWith = ["user-1", "user-2", "99999999-9999-9999-9999-999999999999"];
      const mockInvoice = createMockInvoice({sharedWith});
      const mockUpdatedInvoice = {...mockInvoice};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(mockInvoice),
        }),
      );
    });

    it("should update invoice with items", async () => {
      const items = [
        {
          rawName: "Product 1",
          category: 1,
          genericName: "Product",
          quantity: 2,
          quantityUnit: "pcs",
          price: 10.5,
          totalPrice: 21.0,
          detectedAllergens: [],
          productCode: "P001",
          metadata: {},
        },
      ];
      const mockInvoice = createMockInvoice({items});
      const mockUpdatedInvoice = {...mockInvoice};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });

    it("should update invoice with payment information", async () => {
      const paymentInformation = {
        totalAmount: 250.99,
        currency: {name: "Euro", symbol: "€", code: "EUR"},
        dateOfPurchase: new Date().toISOString(),
        paymentType: 1,
        isTaxed: true,
        taxPercentage: 19,
      };
      const mockInvoice = createMockInvoice({paymentInformation});
      const mockUpdatedInvoice = {...mockInvoice};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });

    it("should update invoice isImportant flag", async () => {
      const mockInvoice = createMockInvoice({isImportant: true});
      const mockUpdatedInvoice = {...mockInvoice};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });

    it("should update invoice with additional metadata", async () => {
      const additionalMetadata = {customField: "value", count: 42, nested: {key: "val"}};
      const mockInvoice = createMockInvoice({additionalMetadata});
      const mockUpdatedInvoice = {...mockInvoice};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });
  });

  describe("validation errors", () => {
    it("should return error for empty invoiceId", async () => {
      const mockInvoice = createMockInvoice({id: ""});

      const result = await updateInvoice({invoiceId: "", invoice: mockInvoice});

      expect(result).toEqual({success: false, error: "Invalid invoiceId: expected a non-empty string, got string"});
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should return error for whitespace-only invoiceId", async () => {
      const mockInvoice = createMockInvoice({id: "   "});

      const result = await updateInvoice({invoiceId: "   ", invoice: mockInvoice});

      expect(result).toEqual({success: false, error: 'Invalid invoiceId: "   " is not a valid GUID'});
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should return error for null invoice", async () => {
      // @ts-expect-error -- Testing null invoice handling
      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: null});

      expect(result).toEqual({success: false, error: "Invoice object is required"});
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should return error for undefined invoice", async () => {
      // @ts-expect-error -- Testing undefined invoice handling
      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: undefined});

      expect(result).toEqual({success: false, error: "Invoice object is required"});
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should return error for invoice ID mismatch", async () => {
      const differentId = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";
      const mockInvoice = createMockInvoice({id: differentId});

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: false, error: "Invoice ID mismatch: URL parameter does not match invoice.id"});
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe("API error handling", () => {
    it("should return error for 404 response", async () => {
      const errorMessage = "Invoice not found";
      const mockInvoice = createMockInvoice();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => errorMessage,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "Failed to update invoice: 404 Not Found",
      });
    });

    it("should return error for 401 unauthorized response", async () => {
      const errorMessage = "Unauthorized";
      const mockInvoice = createMockInvoice();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => errorMessage,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "Failed to update invoice: 401 Unauthorized",
      });
    });

    it("should return error for 403 forbidden response", async () => {
      const errorMessage = "Access denied";
      const mockInvoice = createMockInvoice();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => errorMessage,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "Failed to update invoice: 403 Forbidden",
      });
    });

    it("should return error for 500 server error response", async () => {
      const errorMessage = "Internal server error";
      const mockInvoice = createMockInvoice();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => errorMessage,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "Failed to update invoice: 500 Internal Server Error",
      });
    });

    it("should return error for 400 bad request response", async () => {
      const errorMessage = "Invalid invoice data";
      const mockInvoice = createMockInvoice();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => errorMessage,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "Failed to update invoice: 400 Bad Request",
      });
    });
  });

  describe("network and exception handling", () => {
    it("should handle fetch network error", async () => {
      const networkError = new Error("Network request failed");
      const mockInvoice = createMockInvoice();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(networkError);

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "Network request failed",
      });
    });

    it("should handle auth service failure", async () => {
      const authError = new Error("Auth service unavailable");
      const mockInvoice = createMockInvoice();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockRejectedValue(authError);

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "Auth service unavailable",
      });
    });

    it("should handle non-Error exceptions", async () => {
      const mockInvoice = createMockInvoice();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue("String error");

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred",
      });
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Request timeout");
      const mockInvoice = createMockInvoice();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(timeoutError);

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "Request timeout",
      });
    });
  });

  describe("authentication", () => {
    it("should include Bearer token in Authorization header", async () => {
      const customToken = "custom-jwt-token";
      const mockInvoice = createMockInvoice();
      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: customToken});

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

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
      const mockInvoice = createMockInvoice();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

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

  describe("request configuration", () => {
    it("should serialize full invoice to JSON in request body", async () => {
      const mockInvoice = createMockInvoice({
        name: "Full Invoice",
        description: "Complete description",
        sharedWith: ["user-1", "user-2"],
        isImportant: true,
      });

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(mockInvoice),
        }),
      );
    });

    it("should use POST HTTP method", async () => {
      const mockInvoice = createMockInvoice();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("should use correct API endpoint with invoice ID", async () => {
      const mockInvoice = createMockInvoice();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(globalThis.fetch).toHaveBeenCalledWith(`${MOCK_API_URL}/rest/v1/invoices/${mockInvoiceId}`, expect.any(Object));
    });
  });

  describe("complex invoice scenarios", () => {
    it("should handle invoice with multiple scans", async () => {
      const scans = [
        {
          id: "scan-1",
          rawImageUri: "https://example.com/scan1.jpg",
          ocrMetadata: {},
          isProcessed: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: "scan-2",
          rawImageUri: "https://example.com/scan2.jpg",
          ocrMetadata: {},
          isProcessed: false,
          createdAt: new Date().toISOString(),
        },
      ];
      const mockInvoice = createMockInvoice({scans});

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockInvoice});
    });

    it("should handle invoice marked as public (with LAST_GUID in sharedWith)", async () => {
      const LAST_GUID = "99999999-9999-9999-9999-999999999999";
      const mockInvoice = createMockInvoice({sharedWith: [LAST_GUID]});

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockInvoice});
    });

    it("should handle invoice with possible recipes", async () => {
      const possibleRecipes = [
        {
          name: "Recipe 1",
          description: "A delicious recipe",
          ingredients: ["item1", "item2"],
          steps: ["Step 1", "Step 2"],
        },
      ];
      const mockInvoice = createMockInvoice({possibleRecipes});

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockInvoice});
    });
  });
});
