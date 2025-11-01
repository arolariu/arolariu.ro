/**
 * @fileoverview Unit tests for server-side utility functions
 * @module lib/utils.server.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

// Mock the telemetry module before importing utils.server
vi.mock("@/telemetry", () => ({
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  recordSpanError: vi.fn(),
  withSpan: (name: string, fn: (span: any) => Promise<any>) => fn({setAttributes: vi.fn()}),
}));

// Mock Resend
vi.mock("resend", () => ({
  Resend: class {
    constructor() {}
  },
}));

describe("utils.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("API_URL and API_JWT", () => {
    it("should export API_URL constant", async () => {
      const {API_URL} = await import("./utils.server");
      expect(typeof API_URL).toBe("string");
    });

    it("should export API_JWT constant", async () => {
      const {API_JWT} = await import("./utils.server");
      expect(typeof API_JWT).toBe("string");
    });
  });

  describe("resend", () => {
    it("should export resend instance", async () => {
      const {resend} = await import("./utils.server");
      expect(resend).toBeDefined();
    });
  });

  describe("getMimeTypeFromBase64", () => {
    it("should extract mime type from base64 string", async () => {
      const {getMimeTypeFromBase64} = await import("./utils.server");
      const base64String = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg";
      const mimeType = getMimeTypeFromBase64(base64String);
      expect(mimeType).toBe("image/png");
    });

    it("should extract mime type for jpeg", async () => {
      const {getMimeTypeFromBase64} = await import("./utils.server");
      const base64String = "data:image/jpeg;base64,/9j/4AAQSkZJRg";
      const mimeType = getMimeTypeFromBase64(base64String);
      expect(mimeType).toBe("image/jpeg");
    });

    it("should extract mime type for pdf", async () => {
      const {getMimeTypeFromBase64} = await import("./utils.server");
      const base64String = "data:application/pdf;base64,JVBERi0xLjQK";
      const mimeType = getMimeTypeFromBase64(base64String);
      expect(mimeType).toBe("application/pdf");
    });

    it("should extract mime type for plain text", async () => {
      const {getMimeTypeFromBase64} = await import("./utils.server");
      const base64String = "data:text/plain;base64,SGVsbG8gV29ybGQ=";
      const mimeType = getMimeTypeFromBase64(base64String);
      expect(mimeType).toBe("text/plain");
    });

    it("should return null for invalid base64 string", async () => {
      const {getMimeTypeFromBase64} = await import("./utils.server");
      const invalidString = "not a base64 string";
      const mimeType = getMimeTypeFromBase64(invalidString);
      expect(mimeType).toBeNull();
    });

    it("should return null for base64 string without data prefix", async () => {
      const {getMimeTypeFromBase64} = await import("./utils.server");
      const invalidString = "image/png;base64,iVBORw0KGgoAAAANSUhEUg";
      const mimeType = getMimeTypeFromBase64(invalidString);
      expect(mimeType).toBeNull();
    });

    it("should return null for empty string", async () => {
      const {getMimeTypeFromBase64} = await import("./utils.server");
      const mimeType = getMimeTypeFromBase64("");
      expect(mimeType).toBeNull();
    });

    it("should handle complex mime types", async () => {
      const {getMimeTypeFromBase64} = await import("./utils.server");
      const base64String = "data:application/vnd.ms-excel;base64,UEsDBBQA";
      const mimeType = getMimeTypeFromBase64(base64String);
      expect(mimeType).toBe("application/vnd.ms-excel");
    });
  });

  describe("convertBase64ToBlob", () => {
    it("should convert base64 string to Blob", async () => {
      const {convertBase64ToBlob} = await import("./utils.server");
      // "Hello" in base64
      const base64String = "data:text/plain;base64,SGVsbG8=";
      const blob = await convertBase64ToBlob(base64String);

      expect(blob.type).toBe("text/plain");
      expect(blob.size).toBeGreaterThan(0);
      expect(typeof blob.text).toBe("function");
    });

    it("should convert base64 image to Blob", async () => {
      const {convertBase64ToBlob} = await import("./utils.server");
      // Minimal PNG header in base64
      const base64String = "data:image/png;base64,iVBORw0KGgo=";
      const blob = await convertBase64ToBlob(base64String);

      expect(blob.type).toBe("image/png");
      expect(blob.size).toBeGreaterThan(0);
    });

    it("should convert base64 pdf to Blob", async () => {
      const {convertBase64ToBlob} = await import("./utils.server");
      const base64String = "data:application/pdf;base64,JVBERi0xLjQ=";
      const blob = await convertBase64ToBlob(base64String);

      expect(blob.type).toBe("application/pdf");
      expect(blob.size).toBeGreaterThan(0);
    });

    it("should handle empty base64 content", async () => {
      const {convertBase64ToBlob} = await import("./utils.server");
      const base64String = "data:text/plain;base64,";
      const blob = await convertBase64ToBlob(base64String);

      expect(blob.type).toBe("text/plain");
      expect(blob.size).toBe(0);
    });

    it("should preserve blob content", async () => {
      const {convertBase64ToBlob} = await import("./utils.server");
      const originalText = "Hello World!";
      const base64 = btoa(originalText);
      const base64String = `data:text/plain;base64,${base64}`;
      const blob = await convertBase64ToBlob(base64String);

      const text = await blob.text();
      expect(text).toBe(originalText);
    });

    it("should handle binary data correctly", async () => {
      const {convertBase64ToBlob} = await import("./utils.server");
      // Create binary data
      const binaryArray = new Uint8Array([0, 1, 2, 3, 4, 5]);
      const binaryString = String.fromCharCode(...binaryArray);
      const base64 = btoa(binaryString);
      const base64String = `data:application/octet-stream;base64,${base64}`;

      const blob = await convertBase64ToBlob(base64String);

      expect(blob.type).toBe("application/octet-stream");
      expect(blob.size).toBe(binaryArray.length);
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
});
