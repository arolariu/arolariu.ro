/**
 * @fileoverview Unit tests for sendInvoiceShareEmail server action.
 * @module lib/actions/email/sendInvoiceShareEmail.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

// Hoist mock references (survives restoreMocks)
const {mockFetchBFF, mockFetchJwtSecret, mockCreateJwt, mockFetch} = vi.hoisted(() => ({
  mockFetchBFF: vi.fn(),
  mockFetchJwtSecret: vi.fn(),
  mockCreateJwt: vi.fn(),
  mockFetch: vi.fn(),
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
  convertBase64ToBlob: vi.fn(),
}));

// Mock global fetch
globalThis.fetch = mockFetch;
process.env["SITE_URL"] = "http://localhost:3000";

import {sendInvoiceShareEmail} from "./sendInvoiceShareEmail";

const defaultUser = {
  userIdentifier: "user_123",
  user: {id: "user_123", firstName: "John", lastName: "Doe", emailAddresses: [{emailAddress: "john@example.com", id: "email_1"}], imageUrl: "https://example.com/avatar.jpg", hasImage: true, createdAt: Date.now()},
};

describe("sendInvoiceShareEmail", () => {
  beforeEach(() => {
    mockFetchBFF.mockResolvedValue(defaultUser);
    mockFetchJwtSecret.mockResolvedValue("test-jwt-secret");
    mockCreateJwt.mockResolvedValue("mock-jwt-token");
    mockFetch.mockResolvedValue({json: async () => ({success: true}), ok: true});
  });

  describe("Success cases", () => {
    it("should return success when email API returns success", async () => {
      const result = await sendInvoiceShareEmail({toEmail: "recipient@example.com", toName: "Jane", invoiceId: "inv-123"});
      expect(result).toEqual({success: true});
      expect(mockFetch).toHaveBeenCalledWith("http://localhost:3000/api/email", expect.objectContaining({method: "POST"}));
    });

    it("should pass correct body to API route", async () => {
      await sendInvoiceShareEmail({toEmail: "test@example.com", toName: "Bob", invoiceId: "inv-123"});
      const body = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      expect(body.toEmail).toBe("test@example.com");
      expect(body.fromName).toBe("John Doe");
    });

    it("should use Someone as fallback", async () => {
      mockFetchBFF.mockResolvedValue({userIdentifier: "u", user: {id: "u", firstName: null, lastName: null, emailAddresses: [], imageUrl: null, hasImage: false, createdAt: 0}});
      await sendInvoiceShareEmail({toEmail: "t@t.com", toName: "T", invoiceId: "i"});
      const body = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
      expect(body.fromName).toBe("Someone");
    });
  });

  describe("Auth errors", () => {
    it("should return error when not authenticated", async () => {
      mockFetchBFF.mockResolvedValue({userIdentifier: null, user: null});
      const result = await sendInvoiceShareEmail({toEmail: "t@t.com", toName: "T", invoiceId: "i"});
      expect(result).toEqual({success: false, error: "Authentication required"});
      expect(mockFetch).not.toHaveBeenCalled();
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
      mockFetch.mockResolvedValue({json: async () => ({success: false, error: "Resend failed"}), ok: false});
      const result = await sendInvoiceShareEmail({toEmail: "t@t.com", toName: "T", invoiceId: "i"});
      expect(result).toEqual({success: false, error: "Resend failed"});
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      const result = await sendInvoiceShareEmail({toEmail: "t@t.com", toName: "T", invoiceId: "i"});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });
  });
});
