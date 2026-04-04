/**
 * @fileoverview Unit tests for server-only utilities.
 * @module sites/arolariu.ro/src/lib/utils.server/tests
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import {COMMIT_SHA, TIMESTAMP} from "./utils.generic";
import {convertBase64ToBlob} from "./utils.server";

const instrumentationMocks = vi.hoisted(() => ({
  injectTraceContextHeaders: vi.fn((headers?: Headers) => {
    const enrichedHeaders = headers instanceof Headers ? headers : new Headers();
    enrichedHeaders.set("traceparent", "00-1234567890abcdef1234567890abcdef-1234567890abcdef-01");
    enrichedHeaders.set("X-Request-Id", "1234567890abcdef1234567890abcdef");
    return enrichedHeaders;
  }),
}));

// Mock the telemetry module
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn(async (_spanName, fn) =>
    fn({
      setAttributes: vi.fn(),
      setStatus: vi.fn(),
      recordException: vi.fn(),
    }),
  ),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  recordSpanError: vi.fn(),
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: instrumentationMocks.injectTraceContextHeaders,
}));

const mockFetchApiUrl = vi.fn(async () => "https://api.example.com");
vi.mock("@/lib/config/configProxy", () => ({
  fetchApiUrl: () => mockFetchApiUrl(),
}));

// Mock jose library for JWT operations
vi.mock("jose", () => {
  class MockSignJWT {
    constructor(public payload: Record<string, unknown>) {}

    setProtectedHeader() {
      return this;
    }

    setIssuedAt() {
      return this;
    }

    async sign() {
      return "mocked.jwt.token";
    }
  }

  return {
    SignJWT: MockSignJWT,
    jwtVerify: vi.fn().mockImplementation((token: string) => {
      // Reject only truly invalid tokens (empty or malformed)
      if (!token || token.length < 5) {
        return Promise.reject(new Error("Invalid token"));
      }
      // Accept all other tokens as valid
      return Promise.resolve({
        payload: {
          sub: "user123",
          iss: "test-issuer",
          aud: "test-audience",
          iat: Math.floor(Date.now() / 1000),
        },
      });
    }),
  };
});

describe("Build metadata", () => {
  it("should have COMMIT_SHA defined", () => {
    expect(COMMIT_SHA).toBeDefined();
  });

  it("should have TIMESTAMP defined", () => {
    expect(TIMESTAMP).toBeDefined();
  });
});

describe("convertBase64ToBlob", () => {
  // Mock atob for Node.js environment
  beforeEach(() => {
    if (typeof global.atob === "undefined") {
      global.atob = (str: string) => Buffer.from(str, "base64").toString("binary");
    }
  });

  it("should convert base64 string to Blob with correct MIME type", async () => {
    const base64 = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
    const blob = await convertBase64ToBlob(base64);

    // Check that blob has Blob-like properties (Node.js Blob might not pass instanceof)
    expect(blob).toBeDefined();
    expect(blob.type).toBe("text/plain");
    expect(typeof blob.size).toBe("number");
  });

  it("should convert base64 image to Blob", async () => {
    const base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const blob = await convertBase64ToBlob(base64);

    expect(blob).toBeDefined();
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("should convert base64 JSON to Blob", async () => {
    const base64 = "data:application/json;base64,eyJrZXkiOiJ2YWx1ZSJ9";
    const blob = await convertBase64ToBlob(base64);

    expect(blob).toBeDefined();
    expect(blob.type).toBe("application/json");
    expect(typeof blob.size).toBe("number");
  });

  it("should handle empty base64 content", async () => {
    const base64 = "data:text/plain;base64,";
    const blob = await convertBase64ToBlob(base64);

    expect(blob).toBeDefined();
    expect(blob.size).toBe(0);
  });

  it("should preserve binary data integrity", async () => {
    // "Hello World" in base64
    const base64 = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
    const blob = await convertBase64ToBlob(base64);

    // Convert blob back to text to verify integrity
    const text = await blob.text();
    expect(text).toBe("Hello World");
  });

  it("should handle PDF MIME type", async () => {
    const base64 = "data:application/pdf;base64,JVBERi0xLjQ=";
    const blob = await convertBase64ToBlob(base64);

    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("should handle image/jpeg MIME type", async () => {
    const base64 = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const blob = await convertBase64ToBlob(base64);

    expect(blob.type).toBe("image/jpeg");
  });

  it("should handle complex MIME types", async () => {
    const base64 = "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQ=";
    const blob = await convertBase64ToBlob(base64);

    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });
});

describe("createJwtToken", () => {
  it("should create a valid JWT token with proper payload", async () => {
    const {createJwtToken} = await import("./utils.server");

    const payload = {
      sub: "user123",
      iss: "test-issuer",
      aud: "test-audience",
      email: "user@example.com",
    };
    const secret = "test-secret-key-with-sufficient-length";

    const token = await createJwtToken(payload, secret);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token).toBe("mocked.jwt.token"); // Matches our mock
  });

  it("should create token with minimal payload", async () => {
    const {createJwtToken} = await import("./utils.server");

    const payload = {sub: "user"};
    const secret = "test-secret-key";

    const token = await createJwtToken(payload, secret);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token).toBe("mocked.jwt.token");
  });

  it("should create token with all optional claims", async () => {
    const {createJwtToken} = await import("./utils.server");

    const payload = {
      sub: "user123",
      iss: "issuer",
      aud: "audience",
      exp: Math.floor(Date.now() / 1000) + 3600,
      nbf: Math.floor(Date.now() / 1000),
      jti: "token-id-123",
    };
    const secret = "test-secret-key";

    const token = await createJwtToken(payload, secret);

    expect(token).toBeDefined();
    expect(token).toBe("mocked.jwt.token");
  });

  it("should create token without subject claim", async () => {
    const {createJwtToken} = await import("./utils.server");

    const payload = {
      iss: "issuer",
      aud: "audience",
    };
    const secret = "test-secret-key";

    const token = await createJwtToken(payload, secret);

    expect(token).toBeDefined();
    expect(token).toBe("mocked.jwt.token");
  });

  it("should create token without issuer claim", async () => {
    const {createJwtToken} = await import("./utils.server");

    const payload = {
      sub: "user123",
      aud: "audience",
    };
    const secret = "test-secret-key";

    const token = await createJwtToken(payload, secret);

    expect(token).toBeDefined();
    expect(token).toBe("mocked.jwt.token");
  });

  it("should create token without audience claim", async () => {
    const {createJwtToken} = await import("./utils.server");

    const payload = {
      sub: "user123",
      iss: "issuer",
    };
    const secret = "test-secret-key";

    const token = await createJwtToken(payload, secret);

    expect(token).toBeDefined();
    expect(token).toBe("mocked.jwt.token");
  });

  it("should handle errors gracefully", async () => {
    const {createJwtToken} = await import("./utils.server");

    // The actual createJwtToken will catch errors from jose library
    // Since our mock doesn't throw, we test that the function completes successfully
    const payload = {sub: "user"};
    const secret = "test-secret";

    const token = await createJwtToken(payload, secret);
    expect(token).toBeDefined();
  });

  it("should handle Error object in catch block", async () => {
    // Import SignJWT from the mocked jose module
    const {SignJWT} = await import("jose");

    // Override the sign method to throw an Error
    const originalSign = SignJWT.prototype.sign;
    SignJWT.prototype.sign = vi.fn().mockRejectedValueOnce(new Error("Signing failed"));

    const {createJwtToken} = await import("./utils.server");

    const payload = {sub: "user123"};
    const secret = "test-secret";

    await expect(createJwtToken(payload, secret)).rejects.toThrow("Signing failed");

    // Restore original method
    SignJWT.prototype.sign = originalSign;
  });

  it("should handle non-Error object in catch block", async () => {
    // Import SignJWT from the mocked jose module
    const {SignJWT} = await import("jose");

    // Override the sign method to throw a non-Error object
    const originalSign = SignJWT.prototype.sign;
    SignJWT.prototype.sign = vi.fn().mockRejectedValueOnce("String error message");

    const {createJwtToken} = await import("./utils.server");

    const payload = {sub: "user123"};
    const secret = "test-secret";

    await expect(createJwtToken(payload, secret)).rejects.toThrow("Failed to create JWT token");

    // Restore original method
    SignJWT.prototype.sign = originalSign;
  });
});

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchApiUrl.mockResolvedValue("https://api.example.com");
  });

  it("should call fetch with correct parameters", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    const mockFetch = vi.fn().mockResolvedValue(new Response("OK"));
    globalThis.fetch = mockFetch;

    const url = "https://api.example.com/data";
    const options = {method: "GET"};

    await fetchWithTimeout(url, options, 5000);

    expect(mockFetch).toHaveBeenCalled();
    const firstCall = mockFetch.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [fetchUrl, fetchOptions] = firstCall!;
    expect(fetchUrl).toBe(url);
    expect((fetchOptions as RequestInit).method).toBe("GET");
    expect((fetchOptions as RequestInit).signal).toBeDefined();
    expect((fetchOptions as RequestInit).cache).toBe("no-store");
  });

  it("should resolve API-relative paths through exp-backed API discovery", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    const mockFetch = vi.fn().mockResolvedValue(new Response("OK"));
    globalThis.fetch = mockFetch;

    await fetchWithTimeout("/rest/v1/invoices");

    expect(mockFetchApiUrl).toHaveBeenCalledTimes(1);
    const firstCall = mockFetch.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [fetchUrl] = firstCall!;
    expect(fetchUrl).toBe("https://api.example.com/rest/v1/invoices");
  });

  it("should propagate trace context headers on outbound requests", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    const mockFetch = vi.fn().mockResolvedValue(new Response("OK"));
    globalThis.fetch = mockFetch;

    await fetchWithTimeout("https://api.example.com/data");

    const [, fetchOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(fetchOptions.headers).toMatchObject({
      "X-Request-Id": "1234567890abcdef1234567890abcdef",
      traceparent: "00-1234567890abcdef1234567890abcdef-1234567890abcdef-01",
    });
  });

  it("should return response on success", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    const mockResponse = new Response("Success", {status: 200});
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const response = await fetchWithTimeout("https://api.example.com/data");

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });

  it("should use default timeout when not specified", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("OK"));

    await fetchWithTimeout("https://api.example.com/data");

    expect(globalThis.fetch).toHaveBeenCalled();
    expect(mockFetchApiUrl).not.toHaveBeenCalled();
  });

  it("should throw timeout error when request times out", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    const abortError = new Error("signal is aborted without reason");
    abortError.name = "AbortError";
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    await expect(fetchWithTimeout("https://api.example.com/data", {}, 100)).rejects.toThrow(/timed out/);
  });

  it("should re-throw non-abort errors", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    const networkError = new Error("Network error");
    globalThis.fetch = vi.fn().mockRejectedValue(networkError);

    await expect(fetchWithTimeout("https://api.example.com/data")).rejects.toThrow("Network error");
  });
});

describe("mapHttpStatusToErrorCode", () => {
  it("should map 401 to AUTH_ERROR", async () => {
    const {mapHttpStatusToErrorCode} = await import("./utils.server");
    expect(mapHttpStatusToErrorCode(401)).toBe("AUTH_ERROR");
  });

  it("should map 403 to AUTH_ERROR", async () => {
    const {mapHttpStatusToErrorCode} = await import("./utils.server");
    expect(mapHttpStatusToErrorCode(403)).toBe("AUTH_ERROR");
  });

  it("should map 404 to NOT_FOUND", async () => {
    const {mapHttpStatusToErrorCode} = await import("./utils.server");
    expect(mapHttpStatusToErrorCode(404)).toBe("NOT_FOUND");
  });

  it("should map 400 to VALIDATION_ERROR", async () => {
    const {mapHttpStatusToErrorCode} = await import("./utils.server");
    expect(mapHttpStatusToErrorCode(400)).toBe("VALIDATION_ERROR");
  });

  it("should map 422 to VALIDATION_ERROR", async () => {
    const {mapHttpStatusToErrorCode} = await import("./utils.server");
    expect(mapHttpStatusToErrorCode(422)).toBe("VALIDATION_ERROR");
  });

  it("should map 500 to SERVER_ERROR", async () => {
    const {mapHttpStatusToErrorCode} = await import("./utils.server");
    expect(mapHttpStatusToErrorCode(500)).toBe("SERVER_ERROR");
  });

  it("should map 502 to SERVER_ERROR", async () => {
    const {mapHttpStatusToErrorCode} = await import("./utils.server");
    expect(mapHttpStatusToErrorCode(502)).toBe("SERVER_ERROR");
  });

  it("should map 503 to SERVER_ERROR", async () => {
    const {mapHttpStatusToErrorCode} = await import("./utils.server");
    expect(mapHttpStatusToErrorCode(503)).toBe("SERVER_ERROR");
  });

  it("should map unknown status codes to UNKNOWN_ERROR", async () => {
    const {mapHttpStatusToErrorCode} = await import("./utils.server");
    expect(mapHttpStatusToErrorCode(200)).toBe("UNKNOWN_ERROR");
    expect(mapHttpStatusToErrorCode(201)).toBe("UNKNOWN_ERROR");
    expect(mapHttpStatusToErrorCode(418)).toBe("UNKNOWN_ERROR");
  });
});

describe("createErrorResult", () => {
  it("should create error result from Error object", async () => {
    const {createErrorResult} = await import("./utils.server");
    const error = new Error("Something went wrong");

    const result = createErrorResult<string>(error, "Default message");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.code).toBe("NETWORK_ERROR");
      expect(result.error?.message).toBe("Something went wrong");
    }
  });

  it("should identify timeout errors", async () => {
    const {createErrorResult} = await import("./utils.server");
    const error = new Error("Request timed out after 5000ms");

    const result = createErrorResult<string>(error, "Default message");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.code).toBe("TIMEOUT_ERROR");
      expect(result.error?.message).toContain("timed out");
    }
  });

  it("should handle non-Error objects", async () => {
    const {createErrorResult} = await import("./utils.server");

    const result = createErrorResult<string>("String error", "Default message");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.code).toBe("UNKNOWN_ERROR");
      expect(result.error?.message).toBe("Default message");
    }
  });

  it("should use default message for unknown errors", async () => {
    const {createErrorResult} = await import("./utils.server");

    const result = createErrorResult<number>(null, "An unknown error occurred");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.code).toBe("UNKNOWN_ERROR");
      expect(result.error?.message).toBe("An unknown error occurred");
    }
  });

  it("should handle undefined as error", async () => {
    const {createErrorResult} = await import("./utils.server");

    const result = createErrorResult<boolean>(undefined, "Unexpected error");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.code).toBe("UNKNOWN_ERROR");
      expect(result.error?.message).toBe("Unexpected error");
    }
  });
});

describe("parseBackendError", () => {
  it("should return specific message for 429 rate limiting", async () => {
    const {parseBackendError} = await import("./utils.server");

    const message = parseBackendError(429, "{}");

    expect(message).toBe("Too many requests. Please wait a moment and try again.");
  });

  it("should return specific message for 402 payment required", async () => {
    const {parseBackendError} = await import("./utils.server");

    const message = parseBackendError(402, "{}");

    expect(message).toBe("This feature requires a paid subscription.");
  });

  it("should return specific message for 409 conflict", async () => {
    const {parseBackendError} = await import("./utils.server");

    const message = parseBackendError(409, "{}");

    expect(message).toBe("Conflict: this resource was modified by another user.");
  });

  it("should return specific message for 413 payload too large", async () => {
    const {parseBackendError} = await import("./utils.server");

    const message = parseBackendError(413, "{}");

    expect(message).toBe("File is too large. Please check the size limit and try again.");
  });

  it("should extract maxSize from 413 response body", async () => {
    const {parseBackendError} = await import("./utils.server");

    const body = JSON.stringify({maxSize: "10MB"});
    const message = parseBackendError(413, body);

    expect(message).toBe("File is too large. Maximum size is 10MB.");
  });

  it("should extract detail from 413 response body when no maxSize", async () => {
    const {parseBackendError} = await import("./utils.server");

    const body = JSON.stringify({detail: "File exceeds the maximum allowed size"});
    const message = parseBackendError(413, body);

    expect(message).toBe("File exceeds the maximum allowed size");
  });

  it("should handle malformed JSON in 413 response body", async () => {
    const {parseBackendError} = await import("./utils.server");

    const message = parseBackendError(413, "not valid json {");

    expect(message).toBe("File is too large. Please check the size limit and try again.");
  });

  it("should extract detail from JSON response for other status codes", async () => {
    const {parseBackendError} = await import("./utils.server");

    const body = JSON.stringify({detail: "Custom error message"});
    const message = parseBackendError(500, body);

    expect(message).toBe("Custom error message");
  });

  it("should sanitize raw body when JSON parsing fails", async () => {
    const {parseBackendError} = await import("./utils.server");

    const longBody = "a".repeat(300);
    const message = parseBackendError(500, longBody);

    expect(message).toHaveLength(200);
    expect(message).toBe("a".repeat(200));
  });

  it("should handle empty body gracefully", async () => {
    const {parseBackendError} = await import("./utils.server");

    const message = parseBackendError(500, "");

    expect(message).toBe("An unknown error occurred.");
  });

  it("should return fallback message when JSON has no detail field", async () => {
    const {parseBackendError} = await import("./utils.server");

    const body = JSON.stringify({error: "Something went wrong"});
    const message = parseBackendError(500, body);

    expect(message).toBe("An unknown error occurred.");
  });

  it("should handle 400 bad request with detail", async () => {
    const {parseBackendError} = await import("./utils.server");

    const body = JSON.stringify({detail: "Invalid input format"});
    const message = parseBackendError(400, body);

    expect(message).toBe("Invalid input format");
  });

  it("should handle 401 unauthorized with detail", async () => {
    const {parseBackendError} = await import("./utils.server");

    const body = JSON.stringify({detail: "Token expired"});
    const message = parseBackendError(401, body);

    expect(message).toBe("Token expired");
  });

  it("should handle 404 not found with detail", async () => {
    const {parseBackendError} = await import("./utils.server");

    const body = JSON.stringify({detail: "Resource not found"});
    const message = parseBackendError(404, body);

    expect(message).toBe("Resource not found");
  });
});

describe("convertBase64ToBlob - edge cases", () => {
  beforeEach(() => {
    if (typeof global.atob === "undefined") {
      global.atob = (str: string) => Buffer.from(str, "base64").toString("binary");
    }
  });

  it("should handle base64 without data URL prefix", async () => {
    const {convertBase64ToBlob} = await import("./utils.server");

    const base64 = "SGVsbG8gV29ybGQ=";
    const blob = await convertBase64ToBlob(base64);

    expect(blob).toBeDefined();
    expect(blob.type).toBe("application/octet-stream"); // Default MIME type
    expect(blob.size).toBeGreaterThan(0);
  });

  it("should handle invalid base64 input gracefully", async () => {
    const {convertBase64ToBlob} = await import("./utils.server");

    // Invalid base64 throws DOMException in happy-dom
    await expect(convertBase64ToBlob("invalid!!!")).rejects.toBeDefined();
  });

  it("should extract MIME type correctly from data URL", async () => {
    const {convertBase64ToBlob} = await import("./utils.server");

    const base64 = "data:application/xml;base64,PHhtbD48L3htbD4=";
    const blob = await convertBase64ToBlob(base64);

    expect(blob.type).toBe("application/xml");
  });
});

describe("fetchWithTimeout - edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchApiUrl.mockResolvedValue("https://api.example.com");
  });

  it("should handle injectedHeaders as non-Headers object", async () => {
    const {fetchWithTimeout} = await import("./utils.server");

    // Mock injectTraceContextHeaders to return a plain object
    instrumentationMocks.injectTraceContextHeaders.mockReturnValueOnce({
      "X-Custom-Header": "custom-value",
      traceparent: "00-abc-def-01",
    } as any);

    const mockFetch = vi.fn().mockResolvedValue(new Response("OK"));
    globalThis.fetch = mockFetch;

    await fetchWithTimeout("https://api.example.com/data");

    const [, fetchOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(fetchOptions.headers).toMatchObject({
      "X-Custom-Header": "custom-value",
      traceparent: "00-abc-def-01",
    });
  });

  it("should handle AbortError correctly", async () => {
    const {fetchWithTimeout} = await import("./utils.server");

    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    await expect(fetchWithTimeout("https://api.example.com/data", {}, 1000)).rejects.toThrow(/timed out after 1000ms/);
  });

  it("should clear timeout on success", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    globalThis.fetch = vi.fn().mockResolvedValue(new Response("OK"));

    await fetchWithTimeout("https://api.example.com/data");

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("should clear timeout on error", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(fetchWithTimeout("https://api.example.com/data")).rejects.toThrow("Network error");

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("should handle URL with query parameters", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    const mockFetch = vi.fn().mockResolvedValue(new Response("OK"));
    globalThis.fetch = mockFetch;

    await fetchWithTimeout("https://api.example.com/data?foo=bar&baz=qux");

    const firstCall = mockFetch.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [fetchUrl] = firstCall!;
    expect(fetchUrl).toBe("https://api.example.com/data?foo=bar&baz=qux");
  });

  it("should handle relative path without leading slash", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    const mockFetch = vi.fn().mockResolvedValue(new Response("OK"));
    globalThis.fetch = mockFetch;

    await fetchWithTimeout("rest/v1/invoices");

    expect(mockFetchApiUrl).toHaveBeenCalled();
    const firstCall = mockFetch.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [fetchUrl] = firstCall!;
    expect(fetchUrl).toBe("https://api.example.com/rest/v1/invoices");
  });

  it("should handle empty API URL from config", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    mockFetchApiUrl.mockResolvedValueOnce("  "); // Empty/whitespace API URL

    const mockFetch = vi.fn().mockResolvedValue(new Response("OK"));
    globalThis.fetch = mockFetch;

    await fetchWithTimeout("/rest/v1/invoices");

    const firstCall2 = mockFetch.mock.calls[0];
    expect(firstCall2).toBeDefined();
    const [fetchUrl2] = firstCall2!;
    expect(fetchUrl2).toBe("/rest/v1/invoices"); // Should use relative path as-is
  });

  it("should trim trailing slashes from API URL", async () => {
    const {fetchWithTimeout} = await import("./utils.server");
    mockFetchApiUrl.mockResolvedValueOnce("https://api.example.com///");

    const mockFetch = vi.fn().mockResolvedValue(new Response("OK"));
    globalThis.fetch = mockFetch;

    await fetchWithTimeout("/rest/v1/invoices");

    const firstCall3 = mockFetch.mock.calls[0];
    expect(firstCall3).toBeDefined();
    const [fetchUrl3] = firstCall3!;
    expect(fetchUrl3).toBe("https://api.example.com/rest/v1/invoices");
  });
});

describe("verifyJwtToken", () => {
  it("should return result object with valid or error property", async () => {
    const {verifyJwtToken} = await import("./utils.server");

    const token = "test.jwt.token";
    const secret = "test-secret-key";

    const result = await verifyJwtToken(token, secret);

    // Result should have either valid=true with payload, or valid=false with error
    expect(result).toHaveProperty("valid");
    if (result.valid) {
      expect(result.payload).toBeDefined();
    } else {
      expect(result.error).toBeDefined();
    }
  });

  it("should call jose jwtVerify with correct parameters", async () => {
    const {verifyJwtToken} = await import("./utils.server");
    const {jwtVerify} = await import("jose");

    const token = "test.jwt.token";
    const secret = "test-secret";

    await verifyJwtToken(token, secret);

    expect(jwtVerify).toHaveBeenCalled();
  });

  it("should return error for empty token", async () => {
    const {verifyJwtToken} = await import("./utils.server");

    const result = await verifyJwtToken("", "test-secret");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    }
  });

  it("should return error for very short invalid token", async () => {
    const {verifyJwtToken} = await import("./utils.server");

    const result = await verifyJwtToken("abc", "test-secret");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeDefined();
    }
  });

  it("should handle verification errors from jose library", async () => {
    const {verifyJwtToken} = await import("./utils.server");

    // Test with a token that should fail verification
    const result = await verifyJwtToken("x", "test-secret");

    // Should return an error result
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    }
  });

  it("should handle token without subject claim", async () => {
    const {verifyJwtToken} = await import("./utils.server");
    const {jwtVerify} = await import("jose");

    // Mock jwtVerify to return payload without sub
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: {
        iss: "test-issuer",
        aud: "test-audience",
        iat: Math.floor(Date.now() / 1000),
      },
    } as any);

    const token = "test.jwt.token";
    const secret = "test-secret";

    const result = await verifyJwtToken(token, secret);

    // Should still be valid
    if (result.valid) {
      expect(result.payload).toBeDefined();
    }
  });

  it("should handle token without issuer claim", async () => {
    const {verifyJwtToken} = await import("./utils.server");
    const {jwtVerify} = await import("jose");

    // Mock jwtVerify to return payload without iss
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: {
        sub: "user123",
        aud: "test-audience",
        iat: Math.floor(Date.now() / 1000),
      },
    } as any);

    const token = "test.jwt.token";
    const secret = "test-secret";

    const result = await verifyJwtToken(token, secret);

    // Should still be valid
    if (result.valid) {
      expect(result.payload).toBeDefined();
    }
  });

  it("should handle Error objects in verification catch block", async () => {
    const {verifyJwtToken} = await import("./utils.server");
    const {jwtVerify} = await import("jose");

    // Mock jwtVerify to throw an Error
    const mockError = new Error("Token expired");
    vi.mocked(jwtVerify).mockRejectedValueOnce(mockError);

    const token = "expired.token";
    const secret = "test-secret";

    const result = await verifyJwtToken(token, secret);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("Token expired");
    }
  });

  it("should handle non-Error objects in verification catch block", async () => {
    const {verifyJwtToken} = await import("./utils.server");
    const {jwtVerify} = await import("jose");

    // Mock jwtVerify to throw a non-Error object
    vi.mocked(jwtVerify).mockRejectedValueOnce("String error" as any);

    const token = "invalid.token";
    const secret = "test-secret";

    const result = await verifyJwtToken(token, secret);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("Token verification failed");
    }
  });
});
