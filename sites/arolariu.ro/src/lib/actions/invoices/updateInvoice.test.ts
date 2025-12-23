import {InvoiceBuilder} from "@/data/mocks";
import {type Invoice, type PaymentType} from "@/types/invoices";
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
 * Creates a base invoice builder pre-configured with a deterministic ID.
 *
 * @returns An InvoiceBuilder instance with the test UUID already set
 */
function createTestInvoiceBuilder(): InvoiceBuilder {
  return new InvoiceBuilder().withId(VALID_UUID).withUserIdentifier("user-123");
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
      const mockInvoice = createTestInvoiceBuilder().build();
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
      const mockInvoice = createTestInvoiceBuilder().withName("New Invoice Name").build();
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
      const mockInvoice = createTestInvoiceBuilder().withSharedWith(sharedWith).build();
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
      const mockInvoice = createTestInvoiceBuilder().withRandomItems(3).build();
      const mockUpdatedInvoice = {...mockInvoice};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });

    it("should update invoice with payment information", async () => {
      const mockInvoice = createTestInvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date(),
          paymentType: 1 as PaymentType,
          currency: {name: "Euro", symbol: "€", code: "EUR"},
          totalCostAmount: 250.99,
          totalTaxAmount: 47.69,
        })
        .build();
      const mockUpdatedInvoice = {...mockInvoice};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });

    it("should update invoice isImportant flag", async () => {
      const mockInvoice = createTestInvoiceBuilder().build();
      // Manually set isImportant since the builder randomizes it
      const invoiceWithImportant = {...mockInvoice, isImportant: true} as Invoice;
      const mockUpdatedInvoice = {...invoiceWithImportant};

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockUpdatedInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: invoiceWithImportant});

      expect(result).toEqual({success: true, invoice: mockUpdatedInvoice});
    });

    it("should update invoice with additional metadata", async () => {
      const mockInvoice = createTestInvoiceBuilder().withAdditionalMetadata({customField: "value", nestedKey: "nested-val"}).build();
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
      const mockInvoice = new InvoiceBuilder().withId("").withUserIdentifier("user-123").build();

      const result = await updateInvoice({invoiceId: "", invoice: mockInvoice});

      expect(result).toEqual({success: false, error: "Invalid invoiceId: expected a non-empty string, got string"});
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it("should return error for whitespace-only invoiceId", async () => {
      const mockInvoice = new InvoiceBuilder().withId("   ").withUserIdentifier("user-123").build();

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
      const mockInvoice = new InvoiceBuilder().withId(differentId).withUserIdentifier("user-123").build();

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: false, error: "Invoice ID mismatch: URL parameter does not match invoice.id"});
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe("API error handling", () => {
    it("should return error for 404 response", async () => {
      const mockInvoice = createTestInvoiceBuilder().build();
      const errorMessage = "Invoice not found";

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
      const mockInvoice = createTestInvoiceBuilder().build();
      const errorMessage = "Unauthorized";

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
      const mockInvoice = createTestInvoiceBuilder().build();
      const errorMessage = "Access denied";

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
      const mockInvoice = createTestInvoiceBuilder().build();
      const errorMessage = "Internal server error";

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
      const mockInvoice = createTestInvoiceBuilder().build();
      const errorMessage = "Invalid invoice data";

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
      const mockInvoice = createTestInvoiceBuilder().build();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(networkError);

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "Network request failed",
      });
    });

    it("should handle auth service failure", async () => {
      const authError = new Error("Auth service unavailable");
      const mockInvoice = createTestInvoiceBuilder().build();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockRejectedValue(authError);

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "Auth service unavailable",
      });
    });

    it("should handle non-Error exceptions", async () => {
      const mockInvoice = createTestInvoiceBuilder().build();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue("String error");

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred",
      });
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Request timeout");
      const mockInvoice = createTestInvoiceBuilder().build();

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
      const mockInvoice = createTestInvoiceBuilder().build();
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
      const mockInvoice = createTestInvoiceBuilder().build();

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
      const mockInvoice = createTestInvoiceBuilder()
        .withName("Full Invoice")
        .withDescription("Complete description")
        .withSharedWith(["user-1", "user-2"])
        .build();
      // Set isImportant since builder randomizes it
      const invoiceForTest = {...mockInvoice, isImportant: true} as Invoice;

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => invoiceForTest,
      });

      await updateInvoice({invoiceId: mockInvoiceId, invoice: invoiceForTest});

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(invoiceForTest),
        }),
      );
    });

    it("should use POST HTTP method", async () => {
      const mockInvoice = createTestInvoiceBuilder().build();

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
      const mockInvoice = createTestInvoiceBuilder().build();

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
      const mockInvoice = createTestInvoiceBuilder().withRandomScans(2).build();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockInvoice});
    });

    it("should handle invoice marked as public (with LAST_GUID in sharedWith)", async () => {
      const LAST_GUID = "99999999-9999-9999-9999-999999999999";
      const mockInvoice = createTestInvoiceBuilder().withSharedWith([LAST_GUID]).build();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockInvoice});
    });

    it("should handle invoice with possible recipes", async () => {
      const mockInvoice = createTestInvoiceBuilder().withRandomRecipes(2).build();

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockInvoice,
      });

      const result = await updateInvoice({invoiceId: mockInvoiceId, invoice: mockInvoice});

      expect(result).toEqual({success: true, invoice: mockInvoice});
    });
  });
});
