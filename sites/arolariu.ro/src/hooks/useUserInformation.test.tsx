import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {SITE_URL} from "@/lib/utils.generic";
import {useUserInformation} from "./useUserInformation";

describe("useUserInformation", () => {
  type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

  let mockFetch: ReturnType<typeof vi.fn<FetchLike>>;

  beforeEach(() => {
    mockFetch = vi.fn<FetchLike>();
    globalThis.fetch = mockFetch;
    vi.clearAllMocks();
  });

  it("should initialize with default values", () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: null,
          userIdentifier: "00000000-0000-0000-0000-000000000000",
          userJwt: "",
        }),
        {headers: {"Content-Type": "application/json"}},
      ),
    );

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

    mockFetch.mockResolvedValue(new Response(JSON.stringify(mockUserData), {headers: {"Content-Type": "application/json"}}));

    const {result} = renderHook(() => useUserInformation());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.userInformation).toEqual(mockUserData);
    expect(result.current.isError).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      `${SITE_URL}/api/user`,
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
    expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error fetching user information in useUserInformation hook:", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it("should set loading state during fetch", async () => {
    let resolvePromise: (value: Response) => void;
    const promise: Promise<Response> = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockReturnValue(promise);

    const {result} = renderHook(() => useUserInformation());

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    resolvePromise!(
      new Response(
        JSON.stringify({
          user: null,
          userIdentifier: "test-id",
          userJwt: "test-jwt",
        }),
        {headers: {"Content-Type": "application/json"}},
      ),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should abort previous request when component unmounts", () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: null,
          userIdentifier: "test-id",
          userJwt: "",
        }),
        {headers: {"Content-Type": "application/json"}},
      ),
    );

    const {unmount} = renderHook(() => useUserInformation());

    unmount();

    // The abort should have been called
    expect(mockFetch).toHaveBeenCalled();
  });

  it("should handle JSON parsing errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockFetch.mockResolvedValue(new Response("{not-valid-json", {headers: {"Content-Type": "application/json"}}));

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

describe("useUserInformation - abort signal handling", () => {
  type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

  let mockFetch: ReturnType<typeof vi.fn<FetchLike>>;

  beforeEach(() => {
    mockFetch = vi.fn<FetchLike>();
    globalThis.fetch = mockFetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  /**
   * Helper that returns a fetch implementation which rejects with an AbortError
   * the moment the provided AbortSignal is aborted. This emulates the real
   * `fetch` cancellation behavior used by the browser.
   */
  const createAbortableFetch = (): ReturnType<typeof vi.fn<FetchLike>> => {
    const fetchImpl = vi.fn<FetchLike>((_input, init) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          reject(new DOMException("The operation was aborted.", "AbortError"));
          return;
        }
        signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });
    return fetchImpl;
  };

  describe("in development mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("does not log AbortError thrown by the cleanup function", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch = createAbortableFetch();
      globalThis.fetch = mockFetch;

      const {unmount} = renderHook(() => useUserInformation());

      // Trigger the cleanup, which aborts the in-flight request.
      unmount();

      // Yield so any pending microtasks (the rejected fetch) settle.
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("does not set isError when the request is aborted", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch = createAbortableFetch();
      globalThis.fetch = mockFetch;

      const {result, unmount} = renderHook(() => useUserInformation());
      unmount();

      await Promise.resolve();
      await Promise.resolve();

      expect(result.current.isError).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    it("still logs and sets isError for non-abort errors", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error("Network error"));

      const {result} = renderHook(() => useUserInformation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error fetching user information in useUserInformation hook:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe("DOMException AbortError with non-aborted signal (race condition)", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("silences DOMException AbortError even when signal.aborted is false at catch time", async () => {
      // This covers the second half of the isAbort OR: signal is NOT aborted yet
      // but a DOMException "AbortError" is thrown — a real race condition in browsers.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Reject with a DOMException AbortError but do NOT abort the signal
      mockFetch.mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"));

      const {result} = renderHook(() => useUserInformation());

      await waitFor(() => {
        // In dev mode, silenced → isError stays false and isLoading is not reset
        // (shouldSkipLoadingReset = dev && signal.aborted; signal NOT aborted here,
        //  so isLoading DOES get reset to false)
        expect(result.current.isLoading).toBe(false);
      });

      // Should NOT log the AbortError and should NOT set isError (treated as abort)
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(result.current.isError).toBe(false);
      consoleErrorSpy.mockRestore();
    });
  });

  describe("in production mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    it("logs the AbortError when the request is aborted", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch = createAbortableFetch();
      globalThis.fetch = mockFetch;

      const {unmount} = renderHook(() => useUserInformation());
      unmount();

      // After unmount React will not flush state updates back into the hook
      // result, so we assert against the spy instead of `result.current`.
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error fetching user information in useUserInformation hook:", expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
