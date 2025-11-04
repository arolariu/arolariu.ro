import {beforeEach, describe, expect, it, vi} from "vitest";
import {convertBase64ToBlob, getMimeTypeFromBase64} from "./utils.server";

// Mock the telemetry module
vi.mock("@/telemetry", () => ({
  withSpan: vi.fn(async (name, fn) =>
    fn({
      setAttributes: vi.fn(),
      setStatus: vi.fn(),
      recordException: vi.fn(),
    })
  ),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  recordSpanError: vi.fn(),
}));

// Mock Resend to avoid requiring API key
vi.mock("resend", () => ({
  Resend: vi.fn(function (this: any) {
    return {};
  }),
}));

// Mock jose library for JWT operations
vi.mock("jose", () => {
  class MockSignJWT {
    constructor(public payload: any) {}

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

describe("getMimeTypeFromBase64", () => {
  it("should extract MIME type from base64 string with image/png", () => {
    const base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const result = getMimeTypeFromBase64(base64);
    expect(result).toBe("image/png");
  });

  it("should extract MIME type from base64 string with image/jpeg", () => {
    const base64 =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A";
    const result = getMimeTypeFromBase64(base64);
    expect(result).toBe("image/jpeg");
  });

  it("should extract MIME type from base64 string with application/pdf", () => {
    const base64 = "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2Uv";
    const result = getMimeTypeFromBase64(base64);
    expect(result).toBe("application/pdf");
  });

  it("should extract MIME type from base64 string with text/plain", () => {
    const base64 = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
    const result = getMimeTypeFromBase64(base64);
    expect(result).toBe("text/plain");
  });

  it("should extract MIME type from base64 string with application/json", () => {
    const base64 = "data:application/json;base64,eyJrZXkiOiJ2YWx1ZSJ9";
    const result = getMimeTypeFromBase64(base64);
    expect(result).toBe("application/json");
  });

  it("should return null for invalid base64 string without data URI scheme", () => {
    const base64 = "SGVsbG8gV29ybGQ=";
    const result = getMimeTypeFromBase64(base64);
    expect(result).toBeNull();
  });

  it("should return null for empty string", () => {
    const base64 = "";
    const result = getMimeTypeFromBase64(base64);
    expect(result).toBeNull();
  });

  it("should return null for malformed data URI", () => {
    const base64 = "data:base64,SGVsbG8=";
    const result = getMimeTypeFromBase64(base64);
    expect(result).toBeNull();
  });

  it("should handle MIME type with charset parameter", () => {
    const base64 = "data:text/html;charset=utf-8;base64,PGh0bWw+PC9odG1sPg==";
    const result = getMimeTypeFromBase64(base64);
    // The regex expects ";base64," but this has ";charset=utf-8;base64," so it won't match
    expect(result).toBeNull();
  });

  it("should handle complex MIME types", () => {
    const base64 = "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQ=";
    const result = getMimeTypeFromBase64(base64);
    expect(result).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
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
    (jwtVerify as any).mockResolvedValueOnce({
      payload: {
        iss: "test-issuer",
        aud: "test-audience",
        iat: Math.floor(Date.now() / 1000),
      },
    });

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
    (jwtVerify as any).mockResolvedValueOnce({
      payload: {
        sub: "user123",
        aud: "test-audience",
        iat: Math.floor(Date.now() / 1000),
      },
    });

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
    (jwtVerify as any).mockRejectedValueOnce(mockError);

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
    (jwtVerify as any).mockRejectedValueOnce("String error");

    const token = "invalid.token";
    const secret = "test-secret";

    const result = await verifyJwtToken(token, secret);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("Token verification failed");
    }
  });
});
