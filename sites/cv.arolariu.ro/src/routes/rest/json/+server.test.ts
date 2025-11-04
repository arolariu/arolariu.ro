/**
 * Unit tests for the CV JSON API endpoint
 * Tests the GET handler that returns CV data in JSON Resume format
 */

import {describe, expect, it, vi} from "vitest";
import {GET} from "./+server";

// Mock the data import
vi.mock("@/data/json", () => ({
  jsonCVData: {
    $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics: {
      name: "Test User",
      email: "test@example.com",
    },
    work: [],
    education: [],
  },
}));

describe("CV JSON API Endpoint", () => {
  // Mock RequestEvent - the GET handler doesn't use it, but it's required by the type
  const mockEvent = {} as any;

  describe("GET /rest/json", () => {
    it("should return JSON response with CV data", async () => {
      const response = await GET(mockEvent);

      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });

    it("should return response with resume data", async () => {
      const response = await GET(mockEvent);
      const data = await response.json();

      expect(data).toHaveProperty("resume");
      expect(data.resume).toBeDefined();
      expect(data.resume).toHaveProperty("$schema");
      expect(data.resume).toHaveProperty("basics");
    });

    it("should return response with metadata", async () => {
      const response = await GET(mockEvent);
      const data = await response.json();

      expect(data).toHaveProperty("meta");
      expect(data.meta).toHaveProperty("format");
      expect(data.meta).toHaveProperty("version");
      expect(data.meta).toHaveProperty("resumeSchema");
      expect(data.meta).toHaveProperty("generatedAt");
      expect(data.meta).toHaveProperty("source");
    });

    it("should have correct metadata values", async () => {
      const response = await GET(mockEvent);
      const data = await response.json();

      expect(data.meta.format).toBe("cv.bundle");
      expect(data.meta.version).toBe("1.0.0");
      expect(data.meta.source).toBe("cv.arolariu.ro");
    });

    it("should include resume schema in metadata", async () => {
      const response = await GET(mockEvent);
      const data = await response.json();

      expect(data.meta.resumeSchema).toBe("https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json");
    });

    it("should have generatedAt as ISO date string", async () => {
      const response = await GET(mockEvent);
      const data = await response.json();

      expect(data.meta.generatedAt).toBeDefined();
      expect(typeof data.meta.generatedAt).toBe("string");
      // Validate it's a valid ISO date
      const date = new Date(data.meta.generatedAt);
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe(data.meta.generatedAt);
    });

    it("should set CORS headers for external consumption", async () => {
      const response = await GET(mockEvent);

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("should set Cache-Control headers", async () => {
      const response = await GET(mockEvent);

      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    });

    it("should return Content-Type as application/json", async () => {
      const response = await GET(mockEvent);

      const contentType = response.headers.get("Content-Type");
      expect(contentType).toContain("application/json");
    });
  });
});
