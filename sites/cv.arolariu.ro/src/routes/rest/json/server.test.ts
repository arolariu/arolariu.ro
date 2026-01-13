/**
 * Unit tests for the CV JSON API endpoint
 * Tests the GET handler that returns CV data in JSON Resume format
 */

import type {RequestEvent} from "@sveltejs/kit";
import {describe, expect, it, vi} from "vitest";
import {GET, OPTIONS} from "./+server";

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

/**
 * Creates a mock RequestEvent with proper url and request objects.
 */
function createMockEvent(queryParams: Record<string, string> = {}): RequestEvent {
  const url = new URL("http://localhost/rest/json");
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value);
  }

  return {
    request: new Request(url.toString()),
    url,
  } as RequestEvent;
}

describe("CV JSON API Endpoint", () => {
  const mockEvent = createMockEvent();

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

      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300, stale-while-revalidate=3600");
    });

    it("should return Content-Type as application/json", async () => {
      const response = await GET(mockEvent);

      const contentType = response.headers.get("Content-Type");
      expect(contentType).toContain("application/json");
    });
  });

  describe("GET /rest/json?format=resume", () => {
    it("should return raw resume data when format=resume", async () => {
      const event = createMockEvent({format: "resume"});
      const response = await GET(event);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("$schema");
      expect(data).toHaveProperty("basics");
      expect(data).not.toHaveProperty("meta");
    });
  });

  describe("GET /rest/json?format=minimal", () => {
    it("should return minimal data with basics and work only", async () => {
      const event = createMockEvent({format: "minimal"});
      const response = await GET(event);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("basics");
      expect(data).toHaveProperty("work");
      expect(data).toHaveProperty("meta");
      expect(data.meta.format).toBe("cv.minimal");
    });
  });

  describe("GET /rest/json?section=", () => {
    it("should return specific section when section param is valid", async () => {
      const event = createMockEvent({section: "basics"});
      const response = await GET(event);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("section", "basics");
      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("meta");
    });

    it("should return 404 for invalid section", async () => {
      const event = createMockEvent({section: "invalid"});
      const response = await GET(event);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty("error");
      expect(data).toHaveProperty("availableSections");
    });
  });

  describe("GET /rest/json?pretty=true", () => {
    it("should return pretty-printed JSON when pretty=true", async () => {
      const event = createMockEvent({pretty: "true"});
      const response = await GET(event);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toContain("\n");
    });
  });

  describe("ETag caching", () => {
    it("should return 304 when If-None-Match matches ETag", async () => {
      // Mock Date to ensure consistent timestamps for ETag generation
      const fixedDate = new Date("2024-01-01T00:00:00.000Z");
      vi.useFakeTimers();
      vi.setSystemTime(fixedDate);

      try {
        const firstResponse = await GET(createMockEvent());
        const etag = firstResponse.headers.get("ETag");

        const url = new URL("http://localhost/rest/json");
        const eventWithEtag = {
          request: new Request(url.toString(), {
            headers: {"If-None-Match": etag!},
          }),
          url,
        } as RequestEvent;

        const secondResponse = await GET(eventWithEtag);
        expect(secondResponse.status).toBe(304);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("OPTIONS /rest/json", () => {
    it("should return 204 with CORS headers", async () => {
      const response = await OPTIONS(mockEvent);

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
      expect(response.headers.get("Access-Control-Max-Age")).toBe("86400");
    });
  });
});
