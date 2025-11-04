import {renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useUserInformation} from "./useUserInformation";

// Mock the utils module
vi.mock("@/lib/utils.generic", () => ({
  SITE_URL: "https://test.example.com",
}));

describe("useUserInformation", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  it("should initialize with default values", () => {
    mockFetch.mockResolvedValue({
      json: async () => ({
        user: null,
        userIdentifier: "00000000-0000-0000-0000-000000000000",
        userJwt: "",
      }),
    });

    const {result} = renderHook(() => useUserInformation());

    expect(result.current.userInformation).toEqual({
      user: null,
      userIdentifier: "00000000-0000-0000-0000-000000000000",
      userJwt: "",
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it("should fetch user information successfully", async () => {
    const mockUserData = {
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      },
      userIdentifier: "user-123",
      userJwt: "mock-jwt-token",
    };

    mockFetch.mockResolvedValue({
      json: async () => mockUserData,
    });

    const {result} = renderHook(() => useUserInformation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.userInformation).toEqual(mockUserData);
    expect(result.current.isError).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://test.example.com/api/user",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("should handle fetch errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error("Network error"));

    const {result} = renderHook(() => useUserInformation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      ">>> Error fetching user information in useUserInformation hook:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("should set loading state during fetch", async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValue(promise);

    const {result} = renderHook(() => useUserInformation());

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    resolvePromise!({
      json: async () => ({
        user: null,
        userIdentifier: "test-id",
        userJwt: "test-jwt",
      }),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should abort previous request when component unmounts", () => {
    mockFetch.mockResolvedValue({
      json: async () => ({
        user: null,
        userIdentifier: "test-id",
        userJwt: "",
      }),
    });

    const {unmount} = renderHook(() => useUserInformation());

    unmount();

    // The abort should have been called
    expect(mockFetch).toHaveBeenCalled();
  });

  it("should handle JSON parsing errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockFetch.mockResolvedValue({
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    const {result} = renderHook(() => useUserInformation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should maintain userInformation on error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error("Network error"));

    const {result} = renderHook(() => useUserInformation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should maintain initial default values
    expect(result.current.userInformation).toEqual({
      user: null,
      userIdentifier: "00000000-0000-0000-0000-000000000000",
      userJwt: "",
    });

    consoleErrorSpy.mockRestore();
  });
});
