import {NextRequest} from "next/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {POST} from "./route";

// Create hoisted mocks
const {mockVerifyWebhook, mockClerkClient, mockGenerateGuid} = vi.hoisted(() => ({
  mockVerifyWebhook: vi.fn(),
  mockClerkClient: vi.fn(),
  mockGenerateGuid: vi.fn(),
}));

// Mock Clerk webhook verification
vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: mockVerifyWebhook,
}));

// Mock Clerk client
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: mockClerkClient,
}));

// Mock utility functions
vi.mock("@/lib/utils.generic", () => ({
  generateGuid: mockGenerateGuid,
}));

describe("POST /api/auth/clerk", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let mockUpdateUserMetadata: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Setup mock Clerk client with updateUserMetadata
    mockUpdateUserMetadata = vi.fn().mockResolvedValue({});
    mockClerkClient.mockResolvedValue({
      users: {
        updateUserMetadata: mockUpdateUserMetadata,
      },
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should process user.created event successfully", async () => {
    const mockUserId = "user_123456";
    const mockEmail = "test@example.com";
    const mockUuid = "550e8400-e29b-41d4-a716-446655440000";

    mockVerifyWebhook.mockResolvedValue({
      type: "user.created",
      data: {
        id: mockUserId,
        email_addresses: [{email_address: mockEmail}],
      },
    });

    mockGenerateGuid.mockReturnValue(mockUuid);

    const request = new NextRequest("http://localhost/api/auth/clerk", {
      method: "POST",
      body: JSON.stringify({type: "user.created"}),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({received: true});

    expect(mockVerifyWebhook).toHaveBeenCalledWith(request);
    expect(mockGenerateGuid).toHaveBeenCalled();
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith(mockUserId, {
      publicMetadata: {uuidV4: mockUuid},
    });
  });

  it("should use user ID when no email is provided", async () => {
    const mockUserId = "user_no_email";
    const mockUuid = "650e8400-e29b-41d4-a716-446655440001";

    mockVerifyWebhook.mockResolvedValue({
      type: "user.created",
      data: {
        id: mockUserId,
        email_addresses: [],
      },
    });

    mockGenerateGuid.mockReturnValue(mockUuid);

    const request = new NextRequest("http://localhost/api/auth/clerk", {
      method: "POST",
      body: JSON.stringify({type: "user.created"}),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockGenerateGuid).toHaveBeenCalled();
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith(mockUserId, {
      publicMetadata: {uuidV4: mockUuid},
    });
  });

  it("should ignore non-user.created events", async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: "user.updated",
      data: {
        id: "user_789",
      },
    });

    const request = new NextRequest("http://localhost/api/auth/clerk", {
      method: "POST",
      body: JSON.stringify({type: "user.updated"}),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({received: true});

    // Should not call generateGuid or updateUserMetadata for non-user.created events
    expect(mockGenerateGuid).not.toHaveBeenCalled();
    expect(mockUpdateUserMetadata).not.toHaveBeenCalled();
  });

  it("should handle webhook verification failure", async () => {
    const mockError = new Error("Invalid webhook signature");
    mockVerifyWebhook.mockRejectedValue(mockError);

    const request = new NextRequest("http://localhost/api/auth/clerk", {
      method: "POST",
      body: JSON.stringify({type: "user.created"}),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toBe("Invalid webhook");

    expect(consoleErrorSpy).toHaveBeenCalledWith("Webhook error:", mockError);
    expect(mockUpdateUserMetadata).not.toHaveBeenCalled();
  });

  it("should handle Clerk client error", async () => {
    const mockUserId = "user_error";
    const mockEmail = "error@example.com";

    mockVerifyWebhook.mockResolvedValue({
      type: "user.created",
      data: {
        id: mockUserId,
        email_addresses: [{email_address: mockEmail}],
      },
    });

    mockGenerateGuid.mockReturnValue("error-uuid");

    const clientError = new Error("Clerk API error");
    mockUpdateUserMetadata.mockRejectedValue(clientError);

    const request = new NextRequest("http://localhost/api/auth/clerk", {
      method: "POST",
      body: JSON.stringify({type: "user.created"}),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should generate unique UUID from email hash", async () => {
    const mockUserId = "user_uuid_test";
    const mockEmail1 = "test1@example.com";
    const mockEmail2 = "test2@example.com";
    const mockUuid1 = "uuid-1";
    const mockUuid2 = "uuid-2";

    // First request
    mockVerifyWebhook.mockResolvedValueOnce({
      type: "user.created",
      data: {
        id: mockUserId,
        email_addresses: [{email_address: mockEmail1}],
      },
    });

    mockGenerateGuid.mockReturnValueOnce(mockUuid1);

    const request1 = new NextRequest("http://localhost/api/auth/clerk", {
      method: "POST",
      body: JSON.stringify({type: "user.created"}),
    });

    await POST(request1);

    // Second request with different email
    mockVerifyWebhook.mockResolvedValueOnce({
      type: "user.created",
      data: {
        id: mockUserId,
        email_addresses: [{email_address: mockEmail2}],
      },
    });

    mockGenerateGuid.mockReturnValueOnce(mockUuid2);

    const request2 = new NextRequest("http://localhost/api/auth/clerk", {
      method: "POST",
      body: JSON.stringify({type: "user.created"}),
    });

    await POST(request2);

    expect(mockGenerateGuid).toHaveBeenCalledTimes(2);
    expect(mockUpdateUserMetadata).toHaveBeenNthCalledWith(1, mockUserId, {
      publicMetadata: {uuidV4: mockUuid1},
    });
    expect(mockUpdateUserMetadata).toHaveBeenNthCalledWith(2, mockUserId, {
      publicMetadata: {uuidV4: mockUuid2},
    });
  });

  it("should handle empty email_addresses array", async () => {
    const mockUserId = "user_no_emails";
    const mockUuid = "uuid-no-email";

    mockVerifyWebhook.mockResolvedValue({
      type: "user.created",
      data: {
        id: mockUserId,
        email_addresses: [],
      },
    });

    mockGenerateGuid.mockReturnValue(mockUuid);

    const request = new NextRequest("http://localhost/api/auth/clerk", {
      method: "POST",
      body: JSON.stringify({type: "user.created"}),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockGenerateGuid).toHaveBeenCalled();
    expect(mockUpdateUserMetadata).toHaveBeenCalledWith(mockUserId, {
      publicMetadata: {uuidV4: mockUuid},
    });
  });

  it("should handle multiple email addresses and use first one", async () => {
    const mockUserId = "user_multiple_emails";
    const mockEmail1 = "primary@example.com";
    const mockEmail2 = "secondary@example.com";
    const mockUuid = "uuid-multiple";

    mockVerifyWebhook.mockResolvedValue({
      type: "user.created",
      data: {
        id: mockUserId,
        email_addresses: [{email_address: mockEmail1}, {email_address: mockEmail2}],
      },
    });

    mockGenerateGuid.mockReturnValue(mockUuid);

    const request = new NextRequest("http://localhost/api/auth/clerk", {
      method: "POST",
      body: JSON.stringify({type: "user.created"}),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    // Should use first email for UUID generation
    expect(mockGenerateGuid).toHaveBeenCalled();
  });
});
