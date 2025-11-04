import {beforeEach, describe, expect, it, vi} from "vitest";
import {convertBase64ToBlob, getMimeTypeFromBase64} from "./utils.server";

// Mock the telemetry module
vi.mock("@/telemetry", () => ({
  withSpan: vi.fn((name, fn) => fn({setAttributes: vi.fn(), setStatus: vi.fn()})),
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
  it("should handle errors during token creation", async () => {
    const {createJwtToken} = await import("./utils.server");

    // Empty secret should cause an error
    const payload = {sub: "user"};
    const secret = "";

    await expect(createJwtToken(payload, secret)).rejects.toThrow();
  });
});

describe("verifyJwtToken", () => {
  it("should return error for malformed token", async () => {
    const {verifyJwtToken} = await import("./utils.server");

    const malformedToken = "not.a.valid.jwt.token";
    const secret = "test-secret";

    const result = await verifyJwtToken(malformedToken, secret);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeDefined();
    }
  });

  it("should return error for empty token", async () => {
    const {verifyJwtToken} = await import("./utils.server");

    const result = await verifyJwtToken("", "test-secret");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBeDefined();
    }
  });
});
