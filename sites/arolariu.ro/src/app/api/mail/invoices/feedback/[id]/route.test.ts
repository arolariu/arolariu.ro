import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {POST} from "./route";
import {NextRequest} from "next/server";

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

// Mock the InvoiceFeedback component
vi.mock("@/../emails/invoices/InvoiceFeedback", () => ({
  default: vi.fn(() => "InvoiceFeedback component"),
}));

describe("POST /api/mail/invoices/feedback/[id]", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should send feedback email successfully", async () => {
    const mockId = "feedback-123";
    const mockFeedbackData = {
      feedbackFrom: "user@example.com",
      feedbackText: "Great feature!",
      feedbackRating: 5,
      feedbackFeatures: ["feature1", "feature2"],
    };

    mockResendSend.mockResolvedValue({
      data: {id: "email-123"},
      error: null,
    });

    const request = new NextRequest("http://localhost/api/mail/invoices/feedback/feedback-123", {
      method: "POST",
      body: JSON.stringify(mockFeedbackData),
    });

    const params = Promise.resolve({id: mockId});
    const response = await POST(request, {params});

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({message: "Success"});

    expect(mockResendSend).toHaveBeenCalledWith({
      from: "AROLARIU.RO <doNotReply@mail.arolariu.ro>",
      to: "admin@arolariu.ro",
      cc: "user@example.com",
      subject: `Feedback #${mockId}`,
      react: "InvoiceFeedback component",
    });
  });

  it("should handle resend error and return 500", async () => {
    const mockId = "feedback-456";
    const mockFeedbackData = {
      feedbackFrom: "user@example.com",
      feedbackText: "Needs improvement",
      feedbackRating: 3,
      feedbackFeatures: ["feature1"],
    };

    mockResendSend.mockResolvedValue({
      data: null,
      error: {message: "Email sending failed"},
    });

    const request = new NextRequest("http://localhost/api/mail/invoices/feedback/feedback-456", {
      method: "POST",
      body: JSON.stringify(mockFeedbackData),
    });

    const params = Promise.resolve({id: mockId});
    const response = await POST(request, {params});

    expect(response.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error sending email:", {message: "Email sending failed"});
  });

  it("should handle exception during email sending", async () => {
    const mockId = "feedback-789";
    const mockFeedbackData = {
      feedbackFrom: "user@example.com",
      feedbackText: "Error test",
      feedbackRating: 1,
      feedbackFeatures: [],
    };

    const mockError = new Error("Network error");
    mockResendSend.mockRejectedValue(mockError);

    const request = new NextRequest("http://localhost/api/mail/invoices/feedback/feedback-789", {
      method: "POST",
      body: JSON.stringify(mockFeedbackData),
    });

    const params = Promise.resolve({id: mockId});
    const response = await POST(request, {params});

    expect(response.status).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error:", mockError);
  });

  it("should handle all feedback rating values", async () => {
    const mockId = "feedback-rating";
    const ratings = [1, 2, 3, 4, 5];

    for (const rating of ratings) {
      const mockFeedbackData = {
        feedbackFrom: "user@example.com",
        feedbackText: `Rating ${rating} feedback`,
        feedbackRating: rating,
        feedbackFeatures: ["feature1"],
      };

      mockResendSend.mockResolvedValue({
        data: {id: `email-${rating}`},
        error: null,
      });

      const request = new NextRequest(`http://localhost/api/mail/invoices/feedback/${mockId}`, {
        method: "POST",
        body: JSON.stringify(mockFeedbackData),
      });

      const params = Promise.resolve({id: mockId});
      const response = await POST(request, {params});

      expect(response.status).toBe(200);
    }
  });

  it("should handle empty features array", async () => {
    const mockId = "feedback-empty-features";
    const mockFeedbackData = {
      feedbackFrom: "user@example.com",
      feedbackText: "No features selected",
      feedbackRating: 4,
      feedbackFeatures: [],
    };

    mockResendSend.mockResolvedValue({
      data: {id: "email-empty"},
      error: null,
    });

    const request = new NextRequest(`http://localhost/api/mail/invoices/feedback/${mockId}`, {
      method: "POST",
      body: JSON.stringify(mockFeedbackData),
    });

    const params = Promise.resolve({id: mockId});
    const response = await POST(request, {params});

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({message: "Success"});
  });
});
