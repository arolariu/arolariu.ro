/**
 * @fileoverview Unit tests for sendInvoiceShareEmail server action.
 * @module lib/actions/email/sendInvoiceShareEmail.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

// Hoist mock references (survives restoreMocks)
const {mockFetchBFF, mockFetchJwtSecret, mockCreateJwt, mockFetchWithTimeout} = vi.hoisted(() => ({
  mockFetchBFF: vi.fn(),
  mockFetchJwtSecret: vi.fn(),
  mockCreateJwt: vi.fn(),
  mockFetchWithTimeout: vi.fn(),
}));

// Override stubs with hoisted mocks
vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: mockFetchBFF,
}));

vi.mock("@/lib/config/configProxy", () => ({
  fetchApiJwtSecret: mockFetchJwtSecret,
  fetchResendApiKey: vi.fn(),
  fetchConfigValue: vi.fn(),
  fetchApiUrl: vi.fn(),
}));

vi.mock("@/lib/utils.server", () => ({
  createJwtToken: mockCreateJwt,
  fetchWithTimeout: mockFetchWithTimeout,
  convertBase64ToBlob: vi.fn(),
}));
process.env["SITE_URL"] = "http://localhost:3000";

import {sendInvoiceShareEmail} from "./sendInvoiceShareEmail";

const defaultUser = {
  userIdentifier: "user_123",
  user: {
    id: "user_123",
    firstName: "John",
    lastName: "Doe",
    emailAddresses: [{emailAddress: "john@example.com", id: "email_1"}],
    imageUrl: "https://example.com/avatar.jpg",
    hasImage: true,
    createdAt: Date.now(),
  },
};

describe("sendInvoiceShareEmail", () => {
  beforeEach(() => {
    mockFetchBFF.mockResolvedValue(defaultUser);
    mockFetchJwtSecret.mockResolvedValue("test-jwt-secret");
    mockCreateJwt.mockResolvedValue("mock-jwt-token");
    mockFetchWithTimeout.mockResolvedValue({json: async () => ({success: true}), ok: true});
  });

  describe("Success cases", () => {
    it("should return success when email API returns success", async () => {
      const result = await sendInvoiceShareEmail({toEmail: "recipient@example.com", toName: "Jane", invoiceId: "inv-123"});
      expect(result).toEqual({success: true});
      expect(mockFetchWithTimeout).toHaveBeenCalledWith("http://localhost:3000/api/email", expect.objectContaining({method: "POST"}));
    });

    it("should pass correct body to API route", async () => {
      await sendInvoiceShareEmail({toEmail: "test@example.com", toName: "Bob", invoiceId: "inv-123"});
      const body = JSON.parse(mockFetchWithTimeout.mock.calls[0]?.[1]?.body as string);
      expect(body.toEmail).toBe("test@example.com");
      expect(body.fromName).toBe("John Doe");
    });

    it("should use Someone as fallback", async () => {
      mockFetchBFF.mockResolvedValue({
        userIdentifier: "u",
        user: {id: "u", firstName: null, lastName: null, emailAddresses: [], imageUrl: null, hasImage: false, createdAt: 0},
      });
      await sendInvoiceShareEmail({toEmail: "t@t.com", toName: "T", invoiceId: "i"});
      const body = JSON.parse(mockFetchWithTimeout.mock.calls[0]?.[1]?.body as string);
      expect(body.fromName).toBe("Someone");
    });
  });

  describe("Auth errors", () => {
    it("should return error when not authenticated", async () => {
      mockFetchBFF.mockResolvedValue({userIdentifier: null, user: null});
      const result = await sendInvoiceShareEmail({toEmail: "t@t.com", toName: "T", invoiceId: "i"});
      expect(result).toEqual({success: false, error: "Authentication required"});
      expect(mockFetchWithTimeout).not.toHaveBeenCalled();
    });
  });

  describe("Validation errors", () => {
    it("should return error for invalid email", async () => {
      const result = await sendInvoiceShareEmail({toEmail: "invalid", toName: "T", invoiceId: "i"});
      expect(result).toEqual({success: false, error: "Invalid email address"});
    });

    it("should return error for empty invoiceId", async () => {
      const result = await sendInvoiceShareEmail({toEmail: "t@t.com", toName: "T", invoiceId: ""});
      expect(result).toEqual({success: false, error: "Invoice ID is required"});
    });
  });

  describe("Config errors", () => {
    it("should return error when JWT secret missing", async () => {
      mockFetchJwtSecret.mockResolvedValue("");
      const result = await sendInvoiceShareEmail({toEmail: "t@t.com", toName: "T", invoiceId: "i"});
      expect(result).toEqual({success: false, error: "Internal authentication not configured"});
    });
  });

  describe("API errors", () => {
    it("should return error from API route", async () => {
      mockFetchWithTimeout.mockResolvedValue({json: async () => ({success: false, error: "Resend failed"}), ok: false});
      const result = await sendInvoiceShareEmail({toEmail: "t@t.com", toName: "T", invoiceId: "i"});
      expect(result).toEqual({success: false, error: "Resend failed"});
    });

    it("should handle network errors", async () => {
      mockFetchWithTimeout.mockRejectedValue(new Error("Network error"));
      const result = await sendInvoiceShareEmail({toEmail: "t@t.com", toName: "T", invoiceId: "i"});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should call internal API and return success on valid email", async () => {
      // Mock all required dependencies for success path
      mockFetchBFF.mockResolvedValue(defaultUser);
      mockFetchJwtSecret.mockResolvedValue("test-jwt-secret-123");
      mockCreateJwt.mockResolvedValue("generated-jwt-token-456");
      mockFetchWithTimeout.mockResolvedValue({
        json: async () => ({success: true}),
        ok: true,
      });

      const result = await sendInvoiceShareEmail({
        toEmail: "recipient@example.com",
        toName: "Jane Recipient",
        invoiceId: "invoice-abc-123",
      });

      // Verify the function returns success
      expect(result).toEqual({success: true});

      // Verify fetch was called with correct parameters
      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        "http://localhost:3000/api/email",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer generated-jwt-token-456",
          }),
        }),
      );

      // Verify JWT token was created with correct parameters
      expect(mockCreateJwt).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: "email-send",
          sub: "user_123",
        }),
        "test-jwt-secret-123",
      );

      // Verify body contains correct data
      const fetchCall = mockFetchWithTimeout.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string);
      expect(body.toEmail).toBe("recipient@example.com");
      expect(body.toName).toBe("Jane Recipient");
      expect(body.fromName).toBe("John Doe");
      expect(body.invoiceId).toBe("invoice-abc-123");
    });

    it("should return error when internal API reports failure", async () => {
      // Mock auth and JWT to succeed
      mockFetchBFF.mockResolvedValue(defaultUser);
      mockFetchJwtSecret.mockResolvedValue("test-jwt-secret");
      mockCreateJwt.mockResolvedValue("mock-jwt-token");

      // Mock fetch to return API failure response
      mockFetchWithTimeout.mockResolvedValue({
        json: async () => ({success: false, error: "Send failed: Rate limit exceeded"}),
        ok: false,
      });

      const result = await sendInvoiceShareEmail({
        toEmail: "test@example.com",
        toName: "Test User",
        invoiceId: "inv-fail-123",
      });

      // Verify function returns the error from API
      expect(result).toEqual({success: false, error: "Send failed: Rate limit exceeded"});

      // Verify fetch was called
      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        "http://localhost:3000/api/email",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("should return default error message when API returns success:false without error field", async () => {
      mockFetchBFF.mockResolvedValue(defaultUser);
      mockFetchJwtSecret.mockResolvedValue("test-jwt-secret");
      mockCreateJwt.mockResolvedValue("mock-jwt-token");

      // Mock fetch to return success:false with no error field
      mockFetchWithTimeout.mockResolvedValue({
        json: async () => ({success: false}),
        ok: false,
      });

      const result = await sendInvoiceShareEmail({
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-123",
      });

      expect(result).toEqual({success: false, error: "Failed to send email"});
    });
  });
});
