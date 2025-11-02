import {beforeEach, describe, expect, it, vi} from "vitest";
import {createInvoiceAction} from "./createInvoice";

// Mock the server utils
vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://api.example.com",
}));

// Mock global fetch
global.fetch = vi.fn();

describe("createInvoiceAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully create an invoice", async () => {
    const mockFile = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const formData = new FormData();
    formData.append("file", mockFile);
    formData.append("userIdentifier", "user-123");
    formData.append(
      "metadata",
      JSON.stringify({
        requiresAnalysis: "true",
        fileName: "test.jpg",
        fileType: "image",
        uploadedAt: "2024-01-01T00:00:00.000Z",
      }),
    );

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({id: "invoice-123", success: true}),
    });

    const result = await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({id: "invoice-123", success: true});
    expect(result.error).toBeUndefined();
  });

  it("should use correct API endpoint", async () => {
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.jpg", {type: "image/jpeg"}));

    let capturedUrl = "";
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        json: async () => ({id: "test-id"}),
      });
    });

    await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(capturedUrl).toBe("https://api.example.com/rest/v2/invoices");
  });

  it("should include JWT authorization header", async () => {
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.jpg", {type: "image/jpeg"}));

    let capturedHeaders: HeadersInit | undefined;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url, options) => {
      capturedHeaders = options?.headers as HeadersInit;
      return Promise.resolve({
        ok: true,
        json: async () => ({id: "test-id"}),
      });
    });

    await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token-123",
    });

    expect(capturedHeaders).toMatchObject({
      Authorization: "Bearer jwt-token-123",
    });
  });

  it("should use POST method", async () => {
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.jpg", {type: "image/jpeg"}));

    let capturedMethod = "";
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url, options) => {
      capturedMethod = options?.method || "";
      return Promise.resolve({
        ok: true,
        json: async () => ({id: "test-id"}),
      });
    });

    await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(capturedMethod).toBe("POST");
  });

  it("should pass FormData as body", async () => {
    const mockFile = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const formData = new FormData();
    formData.append("file", mockFile);
    formData.append("userIdentifier", "user-123");

    let capturedBody: FormData | null = null;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url, options) => {
      capturedBody = options?.body as FormData;
      return Promise.resolve({
        ok: true,
        json: async () => ({id: "test-id"}),
      });
    });

    await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(capturedBody).toBeInstanceOf(FormData);
    expect(capturedBody?.get("file")).toBeInstanceOf(File);
    expect(capturedBody?.get("userIdentifier")).toBe("user-123");
  });

  it("should handle API errors with status code", async () => {
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.jpg", {type: "image/jpeg"}));

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Invalid file format",
    });

    const result = await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("400");
    expect(result.error).toContain("Bad Request");
    expect(result.error).toContain("Invalid file format");
    expect(result.data).toBeUndefined();
  });

  it("should handle API errors with 500 status code", async () => {
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.jpg", {type: "image/jpeg"}));

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Database connection failed",
    });

    const result = await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("500");
    expect(result.error).toContain("Internal Server Error");
  });

  it("should handle network errors", async () => {
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.jpg", {type: "image/jpeg"}));

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    const result = await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network error");
    expect(result.data).toBeUndefined();
  });

  it("should handle unknown errors", async () => {
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.jpg", {type: "image/jpeg"}));

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue("Unknown error");

    const result = await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unknown error occurred");
  });

  it("should handle PDF files", async () => {
    const mockFile = new File(["pdf content"], "invoice.pdf", {type: "application/pdf"});
    const formData = new FormData();
    formData.append("file", mockFile);

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({id: "invoice-pdf-123"}),
    });

    const result = await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({id: "invoice-pdf-123"});
  });

  it("should handle PNG files", async () => {
    const mockFile = new File(["png content"], "scan.png", {type: "image/png"});
    const formData = new FormData();
    formData.append("file", mockFile);

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({id: "invoice-png-123"}),
    });

    const result = await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({id: "invoice-png-123"});
  });

  it("should return full response data structure", async () => {
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.jpg", {type: "image/jpeg"}));

    const mockResponseData = {
      id: "invoice-123",
      invoiceNumber: "INV-2024-001",
      createdAt: "2024-01-01T00:00:00.000Z",
      status: "pending",
      merchantName: "Test Merchant",
      totalAmount: 99.99,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    });

    const result = await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockResponseData);
  });

  it("should handle empty error text from API", async () => {
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.jpg", {type: "image/jpeg"}));

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "",
    });

    const result = await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("404");
    expect(result.error).toContain("Not Found");
  });

  it("should log errors to console", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.jpg", {type: "image/jpeg"}));

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Test error"));

    await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(consoleSpy).toHaveBeenCalledWith("Error in createInvoiceAction:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("should handle authorization errors", async () => {
    const formData = new FormData();
    formData.append("file", new File(["content"], "test.jpg", {type: "image/jpeg"}));

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "Invalid or expired JWT token",
    });

    const result = await createInvoiceAction({
      formData,
      userIdentifier: "user-123",
      userJwt: "invalid-token",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("401");
    expect(result.error).toContain("Unauthorized");
  });
});
