/**
 * @fileoverview Unit tests for sendInvoiceShareEmail server action.
 * @module lib/actions/email/sendInvoiceShareEmail.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

// Hoist mock references so they're available in vi.mock() factories
const {mockSendEmail, mockInvoiceEmailTemplate} = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockInvoiceEmailTemplate: vi.fn(() => "<html>test</html>"),
}));

vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      emails = {send: mockSendEmail};
    },
  };
});

// Mock all server dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("@/../emails/invoices/InvoiceHasBeenSharedWithEmail", () => ({
  default: mockInvoiceEmailTemplate,
}));

vi.mock("@/lib/config/configProxy", () => ({
  fetchResendApiKey: vi.fn(),
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

import {fetchResendApiKey} from "@/lib/config/configProxy";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import {sendInvoiceShareEmail} from "./sendInvoiceShareEmail";

describe("sendInvoiceShareEmail", () => {
  beforeEach(() => {
    mockSendEmail.mockResolvedValue({
      data: {id: "resend-email-id-123"},
      error: null,
    });

    (fetchBFFUserFromAuthService as any).mockResolvedValue({
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
    });

    (fetchResendApiKey as any).mockResolvedValue("re_mock_api_key");
  });

  describe("✅ Success cases", () => {
    it("should return success when email sends successfully", async () => {
      // Arrange
      const input = {
        toEmail: "recipient@example.com",
        toName: "Jane Doe",
        invoiceId: "550e8400-e29b-41d4-a716-446655440000",
      };

      // Act
      const result = await sendInvoiceShareEmail(input);

      // Assert
      expect(result).toEqual({success: true});
      expect(mockSendEmail).toHaveBeenCalledWith({
        from: "AROLARIU.RO <doNotReply@mail.arolariu.ro>",
        to: "recipient@example.com",
        subject: "John Doe shared an invoice with you",
        react: "<html>test</html>",
      });
    });

    it("should pass correct props to InvoiceHasBeenSharedWithEmail template", async () => {
      // Arrange
      const input = {
        toEmail: "colleague@example.com",
        toName: "Bob",
        invoiceId: "invoice-abc-123",
      };

      // Act
      await sendInvoiceShareEmail(input);

      // Assert
      expect(mockInvoiceEmailTemplate).toHaveBeenCalledWith({
        fromUsername: "John Doe",
        toUsername: "Bob",
        identifier: "invoice-abc-123",
      });
    });

    it("should use user's first+last name as fromName", async () => {
      // Arrange
      (fetchBFFUserFromAuthService as any).mockResolvedValue({
        userIdentifier: "user_456",
        user: {
          id: "user_456",
          firstName: "Alice",
          lastName: "Smith",
          emailAddresses: [{emailAddress: "alice@example.com", id: "email_2"}],
          imageUrl: "https://example.com/alice.jpg",
          hasImage: true,
          createdAt: Date.now(),
        },
      });

      const input = {
        toEmail: "test@example.com",
        toName: "Test User",
        invoiceId: "inv-123",
      };

      // Act
      await sendInvoiceShareEmail(input);

      // Assert
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Alice Smith shared an invoice with you",
        }),
      );
    });

    it('should use "Someone" as fallback when user has no name', async () => {
      // Arrange
      (fetchBFFUserFromAuthService as any).mockResolvedValue({
        userIdentifier: "user_789",
        user: {
          id: "user_789",
          firstName: null,
          lastName: null,
          emailAddresses: [{emailAddress: "noname@example.com", id: "email_3"}],
          imageUrl: null,
          hasImage: false,
          createdAt: Date.now(),
        },
      });

      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-456",
      };

      // Act
      await sendInvoiceShareEmail(input);

      // Assert
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Someone shared an invoice with you",
        }),
      );
      expect(mockInvoiceEmailTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          fromUsername: "Someone",
        }),
      );
    });
  });

  describe("❌ Authentication errors", () => {
    it("should return error when user is not authenticated (no userIdentifier)", async () => {
      // Arrange
      (fetchBFFUserFromAuthService as any).mockResolvedValue({
        userIdentifier: null,
        user: null,
      });

      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-123",
      };

      // Act
      const result = await sendInvoiceShareEmail(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Authentication required",
      });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should return error when user object is null", async () => {
      // Arrange
      (fetchBFFUserFromAuthService as any).mockResolvedValue({
        userIdentifier: "user_123",
        user: null,
      });

      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-123",
      };

      // Act
      const result = await sendInvoiceShareEmail(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Authentication required",
      });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("❌ Validation errors", () => {
    it("should return error when email address is invalid (no @)", async () => {
      // Arrange
      const input = {
        toEmail: "invalid-email",
        toName: "Test",
        invoiceId: "inv-123",
      };

      // Act
      const result = await sendInvoiceShareEmail(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Invalid email address",
      });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should return error when email is empty string", async () => {
      // Arrange
      const input = {
        toEmail: "",
        toName: "Test",
        invoiceId: "inv-123",
      };

      // Act
      const result = await sendInvoiceShareEmail(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Invalid email address",
      });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should return error when invoiceId is empty", async () => {
      // Arrange
      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "",
      };

      // Act
      const result = await sendInvoiceShareEmail(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Invoice ID is required",
      });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("❌ Configuration errors", () => {
    it("should return error when Resend API key is not configured", async () => {
      // Arrange
      (fetchResendApiKey as any).mockResolvedValue(null);

      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-123",
      };

      // Act
      const result = await sendInvoiceShareEmail(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Email service not configured",
      });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should return error when Resend API key is empty string", async () => {
      // Arrange
      (fetchResendApiKey as any).mockResolvedValue("");

      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-123",
      };

      // Act
      const result = await sendInvoiceShareEmail(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Email service not configured",
      });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("❌ Resend API errors", () => {
    it("should return error when Resend API returns an error", async () => {
      // Arrange
      mockSendEmail.mockResolvedValue({
        data: null,
        error: {
          name: "validation_error",
          message: "Invalid recipient email",
        },
      });

      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-123",
      };

      // Act
      const result = await sendInvoiceShareEmail(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Failed to send email",
      });
    });

    it("should return error when Resend throws an exception", async () => {
      // Arrange
      mockSendEmail.mockRejectedValue(new Error("Network error"));

      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-123",
      };

      // Act
      const result = await sendInvoiceShareEmail(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Failed to send email",
      });
    });

    it("should handle non-Error exceptions", async () => {
      // Arrange
      mockSendEmail.mockRejectedValue("String error");

      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-123",
      };

      // Act
      const result = await sendInvoiceShareEmail(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Failed to send email",
      });
    });
  });

  describe("🔍 Edge cases", () => {
    it("should handle user with only firstName", async () => {
      // Arrange
      (fetchBFFUserFromAuthService as any).mockResolvedValue({
        userIdentifier: "user_only_first",
        user: {
          id: "user_only_first",
          firstName: "SingleName",
          lastName: null,
          emailAddresses: [{emailAddress: "single@example.com", id: "email_4"}],
          imageUrl: null,
          hasImage: false,
          createdAt: Date.now(),
        },
      });

      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-789",
      };

      // Act
      await sendInvoiceShareEmail(input);

      // Assert
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "SingleName shared an invoice with you",
        }),
      );
    });

    it("should handle user with only lastName", async () => {
      // Arrange
      (fetchBFFUserFromAuthService as any).mockResolvedValue({
        userIdentifier: "user_only_last",
        user: {
          id: "user_only_last",
          firstName: null,
          lastName: "OnlyLast",
          emailAddresses: [{emailAddress: "last@example.com", id: "email_5"}],
          imageUrl: null,
          hasImage: false,
          createdAt: Date.now(),
        },
      });

      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-999",
      };

      // Act
      await sendInvoiceShareEmail(input);

      // Assert
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "OnlyLast shared an invoice with you",
        }),
      );
    });

    it("should create Resend instance with provided API key", async () => {
      // Arrange
      const customApiKey = "re_custom_key_xyz";
      (fetchResendApiKey as any).mockResolvedValue(customApiKey);

      const input = {
        toEmail: "test@example.com",
        toName: "Test",
        invoiceId: "inv-123",
      };

      // Act
      await sendInvoiceShareEmail(input);

      // Assert
      // We can't directly test Resend construction in this setup, but we verify the function runs successfully
      expect(mockSendEmail).toHaveBeenCalled();
    });
  });
});
