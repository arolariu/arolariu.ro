import type {UserInformation} from "@/types";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {GET} from "./route";

// Create hoisted mocks
const {mockAuth, mockCurrentUser, mockCreateJwtToken, mockWithSpan, mockGenerateGuid} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCurrentUser: vi.fn(),
  mockCreateJwtToken: vi.fn(),
  mockWithSpan: vi.fn(),
  mockGenerateGuid: vi.fn(),
}));

// Mock Clerk functions
vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}));

// Mock server utilities
vi.mock("@/lib/utils.server", () => ({
  API_JWT: "mock-api-jwt-secret",
  createJwtToken: mockCreateJwtToken,
}));

// Mock generateGuid
vi.mock("@/lib/utils.generic", () => ({
  generateGuid: mockGenerateGuid,
}));

// Mock telemetry functions
vi.mock("@/instrumentation.server", () => ({
  withSpan: mockWithSpan,
  createCounter: vi.fn(() => ({
    add: vi.fn(),
  })),
  createHistogram: vi.fn(() => ({
    record: vi.fn(),
  })),
  addSpanEvent: vi.fn(),
  setSpanAttributes: vi.fn(),
  logWithTrace: vi.fn(),
  recordSpanError: vi.fn(),
  createAuthAttributes: vi.fn(() => ({})),
  createHttpServerAttributes: vi.fn(() => ({})),
  createNextJsAttributes: vi.fn(() => ({})),
}));

describe("GET /api/user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default withSpan implementation that provides span object and handles nested withSpan calls
    mockWithSpan.mockImplementation(async (_spanName: string, fn: (span?: unknown) => Promise<unknown>) => {
      const mockSpan = {
        setAttributes: vi.fn(),
      };
      try {
        return await fn(mockSpan);
      } catch (error) {
        // Re-throw to allow outer withSpan to catch
        throw error;
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return authenticated user information with Clerk", async () => {
    const mockUser = {
      id: "user-123",
      firstName: "John",
      lastName: "Doe",
      emailAddresses: [{emailAddress: "john@example.com"}],
    };

    const mockToken = "mock-generated-jwt-token";
    const mockUserIdentifier = "generated-guid-123";

    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-123",
    });

    mockCurrentUser.mockResolvedValue(mockUser);
    mockGenerateGuid.mockReturnValue(mockUserIdentifier);
    mockCreateJwtToken.mockResolvedValue(mockToken);

    const response = await GET();

    expect(response.status).toBe(200);
    const data: UserInformation = await response.json();

    expect(data).toEqual({
      user: mockUser,
      userIdentifier: mockUserIdentifier,
      userJwt: mockToken,
    });

    expect(mockAuth).toHaveBeenCalled();
    expect(mockCurrentUser).toHaveBeenCalled();
    expect(mockGenerateGuid).toHaveBeenCalledWith("user-123");
  });

  it("should return guest user information when not authenticated", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: false,
      userId: null,
    });

    const mockGuestToken = "mock-guest-jwt-token";
    mockCreateJwtToken.mockResolvedValue(mockGuestToken);

    const response = await GET();

    expect(response.status).toBe(200);
    const data: UserInformation = await response.json();

    expect(data).toEqual({
      user: null,
      userIdentifier: "00000000-0000-0000-0000-000000000000",
      userJwt: mockGuestToken,
    });

    expect(mockAuth).toHaveBeenCalled();
    expect(mockCurrentUser).not.toHaveBeenCalled();
    expect(mockCreateJwtToken).toHaveBeenCalledWith(
      expect.objectContaining({
        iss: "https://auth.arolariu.ro",
        aud: "https://api.arolariu.ro",
        sub: "guest",
        role: "guest",
        userIdentifier: "00000000-0000-0000-0000-000000000000",
      }),
      "mock-api-jwt-secret",
    );
  });

  it("should generate JWT with proper expiration for guest users", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: false,
      userId: null,
    });

    mockCreateJwtToken.mockResolvedValue("guest-token");

    await GET();

    expect(mockCreateJwtToken).toHaveBeenCalledWith(
      expect.objectContaining({
        exp: expect.any(Number),
        iat: expect.any(Number),
        nbf: expect.any(Number),
      }),
      "mock-api-jwt-secret",
    );

    const callArgs = mockCreateJwtToken.mock.calls[0]?.[0] as Record<string, unknown>;
    const exp = callArgs["exp"] as number;
    const iat = callArgs["iat"] as number;

    // Verify expiration is 5 minutes (300 seconds) after issued time
    expect(exp - iat).toBe(300);
  });

  it("should handle null token from Clerk auth", async () => {
    const mockUser = {
      id: "user-456",
      firstName: "Jane",
      lastName: "Smith",
      emailAddresses: [{emailAddress: "jane@example.com"}],
    };

    const mockUserIdentifier = "generated-guid-456";

    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-456",
    });

    mockCurrentUser.mockResolvedValue(mockUser);
    mockGenerateGuid.mockReturnValue(mockUserIdentifier);
    // Return empty string to simulate token generation returning empty
    mockCreateJwtToken.mockResolvedValue("");

    const response = await GET();

    expect(response.status).toBe(200);
    const data: UserInformation = await response.json();

    expect(data).toEqual({
      user: mockUser,
      userIdentifier: mockUserIdentifier,
      userJwt: "",
    });
  });

  it("should return fallback guest user on error", async () => {
    mockAuth.mockRejectedValue(new Error("Auth service error"));

    const response = await GET();

    expect(response.status).toBe(200);
    const data: UserInformation = await response.json();

    expect(data).toEqual({
      user: null,
      userIdentifier: "00000000-0000-0000-0000-000000000000",
      userJwt: "",
    });
  });

  it("should call telemetry functions for authenticated users", async () => {
    const mockUser = {
      id: "user-telemetry",
      emailAddresses: [{emailAddress: "telemetry@example.com"}],
    };
    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-telemetry",
    });

    mockCurrentUser.mockResolvedValue(mockUser);
    mockGenerateGuid.mockReturnValue("generated-guid-telemetry");
    mockCreateJwtToken.mockResolvedValue("token");

    await GET();

    // Verify withSpan was called with correct name
    expect(mockWithSpan).toHaveBeenCalledWith(
      "api.user.get",
      expect.any(Function),
      expect.objectContaining({
        "service.name": "arolariu-website",
        component: "api",
      }),
    );
  });

  it("should call telemetry functions for guest users", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: false,
      userId: null,
    });

    mockCreateJwtToken.mockResolvedValue("guest-token");

    await GET();

    expect(mockWithSpan).toHaveBeenCalledWith("api.user.get", expect.any(Function), expect.any(Object));
  });

  it("should handle undefined userId from auth", async () => {
    mockAuth.mockResolvedValue({
      isAuthenticated: false,
      userId: undefined,
    });

    mockCreateJwtToken.mockResolvedValue("token");

    const response = await GET();

    expect(response.status).toBe(200);
    const data: UserInformation = await response.json();

    // Should treat as guest user
    expect(data.user).toBeNull();
    expect(data.userIdentifier).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("should handle non-Error exception types and fallback to guest user", async () => {
    mockAuth.mockRejectedValue("String error"); // Throw a non-Error type

    const response = await GET();

    expect(response.status).toBe(200);
    const data: UserInformation = await response.json();

    // Should fallback to guest user on non-Error exception
    expect(data.user).toBeNull();
    expect(data.userIdentifier).toBe("00000000-0000-0000-0000-000000000000");
  });

  it("should use primary phone number when no email addresses exist", async () => {
    const mockUser = {
      id: "user-phone-only",
      firstName: "Phone",
      lastName: "User",
      emailAddresses: [],
      primaryPhoneNumber: {phoneNumber: "+1-555-0123"},
      phoneNumbers: [{phoneNumber: "+1-555-0456"}],
    };

    const mockToken = "mock-jwt-token";
    const mockUserIdentifier = "phone-guid-123";

    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-phone-only",
    });

    mockCurrentUser.mockResolvedValue(mockUser);
    mockGenerateGuid.mockReturnValue(mockUserIdentifier);
    mockCreateJwtToken.mockResolvedValue(mockToken);

    await GET();

    expect(mockCreateJwtToken).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: "+1-555-0123",
      }),
      expect.any(String),
    );
  });

  it("should use first phone number when no primary phone exists", async () => {
    const mockUser = {
      id: "user-secondary-phone",
      firstName: "Secondary",
      lastName: "Phone",
      emailAddresses: [],
      primaryPhoneNumber: null,
      phoneNumbers: [{phoneNumber: "+1-555-0789"}],
    };

    const mockToken = "mock-jwt-token";
    const mockUserIdentifier = "secondary-phone-guid";

    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-secondary-phone",
    });

    mockCurrentUser.mockResolvedValue(mockUser);
    mockGenerateGuid.mockReturnValue(mockUserIdentifier);
    mockCreateJwtToken.mockResolvedValue(mockToken);

    await GET();

    expect(mockCreateJwtToken).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: "+1-555-0789",
      }),
      expect.any(String),
    );
  });

  it("should use user id when no email or phone exists", async () => {
    const mockUser = {
      id: "user-id-only",
      firstName: "Id",
      lastName: "Only",
      emailAddresses: [],
      primaryPhoneNumber: null,
      phoneNumbers: [],
    };

    const mockToken = "mock-jwt-token";
    const mockUserIdentifier = "id-only-guid";

    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-id-only",
    });

    mockCurrentUser.mockResolvedValue(mockUser);
    mockGenerateGuid.mockReturnValue(mockUserIdentifier);
    mockCreateJwtToken.mockResolvedValue(mockToken);

    await GET();

    expect(mockCreateJwtToken).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: "user-id-only",
      }),
      expect.any(String),
    );
  });

  it("should use N/A when user object has no identifiers", async () => {
    const mockUser = {
      id: null,
      firstName: "Anonymous",
      lastName: "User",
      emailAddresses: [],
      primaryPhoneNumber: null,
      phoneNumbers: [],
    };

    const mockToken = "mock-jwt-token";
    const mockUserIdentifier = "anon-guid";

    mockAuth.mockResolvedValue({
      isAuthenticated: true,
      userId: "user-anon",
    });

    mockCurrentUser.mockResolvedValue(mockUser);
    mockGenerateGuid.mockReturnValue(mockUserIdentifier);
    mockCreateJwtToken.mockResolvedValue(mockToken);

    await GET();

    expect(mockCreateJwtToken).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: "N/A",
      }),
      expect.any(String),
    );
  });
});
