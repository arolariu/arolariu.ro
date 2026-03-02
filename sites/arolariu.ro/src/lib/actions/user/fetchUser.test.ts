/**
 * @fileoverview Tests for user fetch server actions.
 * @module lib/actions/user/fetchUser.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// Mock utils.generic
vi.mock("@/lib/utils.generic", () => ({
  EMPTY_GUID: "00000000-0000-0000-0000-000000000000",
  generateGuid: vi.fn((seed?: string) => (seed ? `guid-${seed}` : "generated-guid")),
}));

// Mock utils.server
vi.mock("@/lib/utils.server", () => ({
  API_JWT: "test-api-jwt-secret",
  createJwtToken: vi.fn().mockResolvedValue("mock-jwt-token"),
}));

// Mock Clerk
const mockCurrentUser = vi.fn();
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: () => mockCurrentUser(),
  auth: () => mockAuth(),
}));

// Import after mocks
import {EMPTY_GUID, generateGuid} from "@/lib/utils.generic";
import {createJwtToken} from "@/lib/utils.server";
import {fetchAaaSUserFromAuthService, fetchBFFUserFromAuthService} from "./fetchUser";

describe("fetchUser actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAaaSUserFromAuthService", () => {
    it("should return authenticated user when user exists", async () => {
      const mockUser = {
        id: "user-123",
        firstName: "John",
        lastName: "Doe",
        primaryEmailAddress: {emailAddress: "john@example.com"},
      };
      mockCurrentUser.mockResolvedValue(mockUser);

      const result = await fetchAaaSUserFromAuthService();

      expect(result.isAuthenticated).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it("should return not authenticated when user is null", async () => {
      mockCurrentUser.mockResolvedValue(null);

      const result = await fetchAaaSUserFromAuthService();

      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeNull();
    });

    it("should throw error when currentUser fails", async () => {
      const error = new Error("Auth service error");
      mockCurrentUser.mockRejectedValue(error);

      await expect(fetchAaaSUserFromAuthService()).rejects.toThrow("Auth service error");
    });
  });

  describe("fetchBFFUserFromAuthService", () => {
    describe("when user is authenticated", () => {
      const mockUser = {
        id: "user-123",
        primaryEmailAddress: {emailAddress: "john@example.com"},
        emailAddresses: [{emailAddress: "john@example.com"}],
        primaryPhoneNumber: null,
        phoneNumbers: [],
      };

      beforeEach(() => {
        mockAuth.mockResolvedValue({isAuthenticated: true, userId: "user-123"});
        mockCurrentUser.mockResolvedValue(mockUser);
      });

      it("should return user information with userIdentifier", async () => {
        const result = await fetchBFFUserFromAuthService();

        expect(result.user).toEqual(mockUser);
        expect(result.userIdentifier).toBe("guid-john@example.com");
      });

      it("should generate userIdentifier from email", async () => {
        await fetchBFFUserFromAuthService();

        expect(generateGuid).toHaveBeenCalledWith("john@example.com");
      });

      it("should create JWT with correct payload", async () => {
        await fetchBFFUserFromAuthService();

        expect(createJwtToken).toHaveBeenCalledWith(
          expect.objectContaining({
            iss: "https://auth.arolariu.ro",
            aud: "https://api.arolariu.ro",
            sub: "john@example.com",
            userIdentifier: "guid-john@example.com",
            role: "user",
          }),
          "test-api-jwt-secret",
        );
      });

      it("should fallback to secondary email when primary is missing", async () => {
        const userWithSecondaryEmail = {
          ...mockUser,
          primaryEmailAddress: null,
          emailAddresses: [{emailAddress: "secondary@example.com"}],
        };
        mockCurrentUser.mockResolvedValue(userWithSecondaryEmail);

        await fetchBFFUserFromAuthService();

        expect(createJwtToken).toHaveBeenCalledWith(
          expect.objectContaining({
            sub: "secondary@example.com",
          }),
          expect.any(String),
        );
      });

      it("should fallback to phone number when email is missing", async () => {
        const userWithPhone = {
          ...mockUser,
          primaryEmailAddress: null,
          emailAddresses: [],
          primaryPhoneNumber: {phoneNumber: "+1234567890"},
        };
        mockCurrentUser.mockResolvedValue(userWithPhone);

        await fetchBFFUserFromAuthService();

        expect(createJwtToken).toHaveBeenCalledWith(
          expect.objectContaining({
            sub: "+1234567890",
          }),
          expect.any(String),
        );
      });

      it("should fallback to secondary phone when primary is missing", async () => {
        const userWithSecondaryPhone = {
          ...mockUser,
          primaryEmailAddress: null,
          emailAddresses: [],
          primaryPhoneNumber: null,
          phoneNumbers: [{phoneNumber: "+9876543210"}],
        };
        mockCurrentUser.mockResolvedValue(userWithSecondaryPhone);

        await fetchBFFUserFromAuthService();

        expect(createJwtToken).toHaveBeenCalledWith(
          expect.objectContaining({
            sub: "+9876543210",
          }),
          expect.any(String),
        );
      });

      it("should fallback to user ID when all contact info is missing", async () => {
        const userWithNoContact = {
          ...mockUser,
          primaryEmailAddress: null,
          emailAddresses: [],
          primaryPhoneNumber: null,
          phoneNumbers: [],
        };
        mockCurrentUser.mockResolvedValue(userWithNoContact);

        await fetchBFFUserFromAuthService();

        expect(createJwtToken).toHaveBeenCalledWith(
          expect.objectContaining({
            sub: "user-123",
          }),
          expect.any(String),
        );
      });

      it("should use userId for guid when email is missing", async () => {
        const userWithNoEmail = {
          ...mockUser,
          primaryEmailAddress: null,
        };
        mockCurrentUser.mockResolvedValue(userWithNoEmail);

        await fetchBFFUserFromAuthService();

        expect(generateGuid).toHaveBeenCalledWith("user-123");
      });
    });

    describe("when user is not authenticated", () => {
      beforeEach(() => {
        mockAuth.mockResolvedValue({isAuthenticated: false, userId: null});
      });

      it("should return guest user information with empty GUID", async () => {
        const result = await fetchBFFUserFromAuthService();

        expect(result.user).toBeNull();
        expect(result.userIdentifier).toBe(EMPTY_GUID);
      });

      it("should create JWT with guest role", async () => {
        await fetchBFFUserFromAuthService();

        expect(createJwtToken).toHaveBeenCalledWith(
          expect.objectContaining({
            iss: "https://auth.arolariu.ro",
            aud: "https://api.arolariu.ro",
            sub: "guest",
            userIdentifier: EMPTY_GUID,
            role: "guest",
          }),
          "test-api-jwt-secret",
        );
      });
    });

    describe("error handling", () => {
      it("should throw error when auth fails", async () => {
        const error = new Error("Auth failed");
        mockAuth.mockRejectedValue(error);

        await expect(fetchBFFUserFromAuthService()).rejects.toThrow("Auth failed");
      });

      it("should throw error when currentUser fails for authenticated user", async () => {
        mockAuth.mockResolvedValue({isAuthenticated: true, userId: "user-123"});
        mockCurrentUser.mockRejectedValue(new Error("User fetch failed"));

        await expect(fetchBFFUserFromAuthService()).rejects.toThrow("User fetch failed");
      });

      it("should throw error when JWT creation fails", async () => {
        mockAuth.mockResolvedValue({isAuthenticated: true, userId: "user-123"});
        mockCurrentUser.mockResolvedValue({
          id: "user-123",
          primaryEmailAddress: {emailAddress: "test@example.com"},
          emailAddresses: [],
          primaryPhoneNumber: null,
          phoneNumbers: [],
        });
        vi.mocked(createJwtToken).mockRejectedValueOnce(new Error("JWT creation failed"));

        await expect(fetchBFFUserFromAuthService()).rejects.toThrow("JWT creation failed");
      });
    });
  });
});
