import {NextRequest} from "next/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {POST} from "./route";

// Create hoisted mock
const {mockResendSend} = vi.hoisted(() => ({
  mockResendSend: vi.fn(),
}));

// Mock the resend utility
vi.mock("@/lib/utils.server", () => ({
  resend: {
    emails: {
      send: mockResendSend,
    },
  },
}));

// Mock the SharedInvoice component
vi.mock("@/../emails/invoices/SharedInvoice", () => ({
  default: vi.fn(() => "SharedInvoice component"),
}));

describe("POST /api/mail/invoices/share/[id]", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should share invoice successfully", async () => {
    const mockId = "invoice-123";
    const mockShareData = {
      toEmail: "recipient@example.com",
      fromEmail: "sender@example.com",
    };

    mockResendSend.mockResolvedValue({
      data: {id: "email-123"},
      error: null,
    });

    const request = new NextRequest("http://localhost/api/mail/invoices/share/invoice-123", {
      method: "POST",
      body: JSON.stringify(mockShareData),
    });

    const params = Promise.resolve({id: mockId});
    const response = await POST(request, {params});

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({message: "Success"});

    expect(mockResendSend).toHaveBeenCalledWith({
      from: "AROLARIU.RO <doNotReply@mail.arolariu.ro>",
      to: "recipient@example.com",
      cc: "sender@example.com",
      bcc: "admin@arolariu.ro",
      subject: "Invoice shared! 🎉🎉",
      react: "SharedInvoice component",
    });
  });

  it("should extract username from email correctly", async () => {
    const mockId = "invoice-456";
    const mockShareData = {
      toEmail: "john.doe@company.com",
      fromEmail: "jane.smith@company.com",
    };

    mockResendSend.mockResolvedValue({
      data: {id: "email-456"},
      error: null,
    });

    const request = new NextRequest(`http://localhost/api/mail/invoices/share/${mockId}`, {
      method: "POST",
      body: JSON.stringify(mockShareData),
    });

    const params = Promise.resolve({id: mockId});
    const response = await POST(request, {params});

    expect(response.status).toBe(200);
    expect(mockResendSend).toHaveBeenCalled();
  });

  it("should handle resend error and return 500", async () => {
    const mockId = "invoice-789";
    const mockShareData = {
      toEmail: "recipient@example.com",
      fromEmail: "sender@example.com",
    };

    mockResendSend.mockResolvedValue({
      data: null,
      error: {message: "Email sending failed"},
    });

    const request = new NextRequest(`http://localhost/api/mail/invoices/share/${mockId}`, {
      method: "POST",
      body: JSON.stringify(mockShareData),
    });

    const params = Promise.resolve({id: mockId});
    const response = await POST(request, {params});

    expect(response.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error sending email:", {message: "Email sending failed"});
  });

  it("should handle exception during email sending", async () => {
    const mockId = "invoice-error";
    const mockShareData = {
      toEmail: "recipient@example.com",
      fromEmail: "sender@example.com",
    };

    const mockError = new Error("Network error");
    mockResendSend.mockRejectedValue(mockError);

    const request = new NextRequest(`http://localhost/api/mail/invoices/share/${mockId}`, {
      method: "POST",
      body: JSON.stringify(mockShareData),
    });

    const params = Promise.resolve({id: mockId});
    const response = await POST(request, {params});

    expect(response.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error:", mockError);
  });

  it("should handle emails with special characters", async () => {
    const mockId = "invoice-special";
    const mockShareData = {
      toEmail: "user+test@example.com",
      fromEmail: "admin_test@example.com",
    };

    mockResendSend.mockResolvedValue({
      data: {id: "email-special"},
      error: null,
    });

    const request = new NextRequest(`http://localhost/api/mail/invoices/share/${mockId}`, {
      method: "POST",
      body: JSON.stringify(mockShareData),
    });

    const params = Promise.resolve({id: mockId});
    const response = await POST(request, {params});

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({message: "Success"});
  });

  it("should send email with correct BCC to admin", async () => {
    const mockId = "invoice-bcc";
    const mockShareData = {
      toEmail: "user1@example.com",
      fromEmail: "user2@example.com",
    };

    mockResendSend.mockResolvedValue({
      data: {id: "email-bcc"},
      error: null,
    });

    const request = new NextRequest(`http://localhost/api/mail/invoices/share/${mockId}`, {
      method: "POST",
      body: JSON.stringify(mockShareData),
    });

    const params = Promise.resolve({id: mockId});
    await POST(request, {params});

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        bcc: "admin@arolariu.ro",
      }),
    );
  });
});
