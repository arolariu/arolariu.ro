/**
 * @fileoverview Tests for Newman parser helper
 * @module github/scripts/helpers/newman/tests
 *
 * @remarks
 * Uses fixture-like objects to validate parsing and categorization.
 */

import {beforeEach, describe, expect, it} from "vitest";
import {
  categorizeFailures,
  createNewmanHelper,
  generateNewmanResultsSection,
  parseNewmanReport,
  type MarkdownOptions,
  type NewmanExecutionStats,
  type NewmanReport,
} from "./index.ts";

/**
 * Test fixtures
 */
function createMockNewmanReport(overrides: Partial<NewmanReport> = {}): NewmanReport {
  return {
    collection: {
      info: {
        name: "Test Collection",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
    },
    run: {
      stats: {
        requests: {
          total: 10,
          failed: 2,
        },
        assertions: {
          total: 20,
          failed: 3,
        },
      },
      timings: {
        started: 1699000000000,
        completed: 1699000010000,
        responseAverage: 250,
        responseMin: 100,
        responseMax: 500,
      },
      executions: [
        {
          item: {name: "GET Health Check"},
          request: {
            method: "GET",
            url: {
              raw: "https://api.example.com/health",
              protocol: "https",
              host: ["api", "example", "com"],
              path: ["health"],
              toString: () => "https://api.example.com/health",
            },
          },
          response: {
            code: 200,
            status: "OK",
            responseTime: 150,
          },
          assertions: [],
        },
        {
          item: {name: "GET Users - 404 Error"},
          request: {
            method: "GET",
            url: {
              raw: "https://api.example.com/users/999",
              protocol: "https",
              host: ["api", "example", "com"],
              path: ["users", "999"],
              toString: () => "https://api.example.com/users/999",
            },
          },
          response: {
            code: 404,
            status: "Not Found",
            responseTime: 200,
            stream: new TextEncoder().encode("User not found"),
          },
          assertions: [
            {
              assertion: "Status code is 200",
              error: {
                name: "AssertionError",
                message: "expected 404 to equal 200",
                toString: () => "AssertionError: expected 404 to equal 200",
              },
            },
          ],
        },
        {
          item: {name: "POST Create User - 500 Error"},
          request: {
            method: "POST",
            url: {
              raw: "https://api.example.com/users",
              protocol: "https",
              host: ["api", "example", "com"],
              path: ["users"],
              toString: () => "https://api.example.com/users",
            },
          },
          response: {
            code: 500,
            status: "Internal Server Error",
            responseTime: 300,
            stream: new TextEncoder().encode("Database connection failed"),
          },
          assertions: [
            {
              assertion: "Status code is 201",
              error: {
                message: "expected 500 to equal 201",
                toString: () => "expected 500 to equal 201",
              },
            },
          ],
        },
      ],
    },
    ...overrides,
  } as NewmanReport;
}

describe("NewmanHelper", () => {
  let helper: ReturnType<typeof createNewmanHelper>;

  beforeEach(() => {
    helper = createNewmanHelper();
  });

  describe("parseReport", () => {
    it("should parse a valid Newman report", () => {
      const mockReport = createMockNewmanReport();
      const result = helper.parseReport(mockReport);

      expect(result.collectionName).toBe("Test Collection");
      expect(result.totalRequests).toBe(10);
      expect(result.failedRequests).toBe(2);
      expect(result.totalAssertions).toBe(20);
      expect(result.failedAssertions).toBe(3);
    });

    it("should calculate success rates correctly", () => {
      const mockReport = createMockNewmanReport();
      const result = helper.parseReport(mockReport);

      expect(result.successRate).toBe(80); // 8/10 * 100
      expect(result.assertionSuccessRate).toBe(85); // 17/20 * 100
    });

    it("should handle zero requests", () => {
      const mockReport = createMockNewmanReport({
        run: {
          stats: {
            requests: {total: 0, failed: 0},
            assertions: {total: 0, failed: 0},
          },
          timings: {
            started: 1699000000000,
            completed: 1699000001000,
            responseAverage: 0,
            responseMin: 0,
            responseMax: 0,
          },
          executions: [],
        },
      } as Partial<NewmanReport>);

      const result = helper.parseReport(mockReport);

      expect(result.successRate).toBe(0);
      expect(result.assertionSuccessRate).toBe(0);
      expect(result.failures).toHaveLength(0);
    });

    it("should convert timings to milliseconds and ISO strings", () => {
      const mockReport = createMockNewmanReport();
      const result = helper.parseReport(mockReport);

      expect(result.timings.totalDuration).toBe(10000); // 10 seconds in ms
      expect(result.timings.responseTimeMin).toBe(100);
      expect(result.timings.responseTimeMax).toBe(500);
      expect(result.timings.responseTimeAvg).toBe(250);
      expect(result.timings.started).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
      expect(result.timings.completed).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should extract failed requests with details", () => {
      const mockReport = createMockNewmanReport();
      const result = helper.parseReport(mockReport);

      expect(result.failures).toHaveLength(2);

      const failure404 = result.failures.find((f) => f.statusCode === 404);
      expect(failure404).toBeDefined();
      expect(failure404?.name).toBe("GET Users - 404 Error");
      expect(failure404?.method).toBe("GET");
      expect(failure404?.url).toBe("https://api.example.com/users/999");
      expect(failure404?.failedAssertions).toHaveLength(1);

      const failure500 = result.failures.find((f) => f.statusCode === 500);
      expect(failure500).toBeDefined();
      expect(failure500?.name).toBe("POST Create User - 500 Error");
    });

    it("should handle missing response stream", () => {
      const mockReport = createMockNewmanReport();
      // Test mutation - override readonly for testing purposes
      (mockReport.run.executions[1]!.response! as {stream?: Uint8Array | undefined}).stream = undefined;

      const result = helper.parseReport(mockReport);
      const failure = result.failures.find((f) => f.statusCode === 404);

      expect(failure?.responseBody).toBe("");
    });

    it("should truncate long response bodies to 500 chars", () => {
      const longBody = "A".repeat(1000);
      const mockReport = createMockNewmanReport();
      // Test mutation - override readonly for testing purposes
      (mockReport.run.executions[1]!.response! as {stream?: Uint8Array}).stream = new TextEncoder().encode(longBody);

      const result = helper.parseReport(mockReport);
      const failure = result.failures.find((f) => f.statusCode === 404);

      expect(failure?.responseBody).toHaveLength(500);
    });

    it("should handle URL construction when raw URL is missing", () => {
      const mockReport = createMockNewmanReport();
      // Test mutation - override readonly for testing purposes
      (mockReport.run.executions[1]!.request.url as {raw: string}).raw = "";

      const result = helper.parseReport(mockReport);
      const failure = result.failures[0];

      expect(failure?.url).toBe("https://api.example.com/users/999");
    });
  });

  describe("categorizeFailures", () => {
    it("should categorize client errors (4xx)", () => {
      const stats: NewmanExecutionStats = {
        collectionName: "Test",
        totalRequests: 5,
        failedRequests: 2,
        successRate: 60,
        totalAssertions: 10,
        failedAssertions: 2,
        assertionSuccessRate: 80,
        timings: {
          started: "2023-01-01T00:00:00.000Z",
          completed: "2023-01-01T00:00:10.000Z",
          totalDuration: 10000,
          responseTimeMin: 100,
          responseTimeMax: 500,
          responseTimeAvg: 250,
        },
        failures: [
          {
            name: "Test 1",
            method: "GET",
            url: "https://example.com/404",
            statusCode: 404,
            responseTime: 200,
            failedAssertions: [],
          },
          {
            name: "Test 2",
            method: "GET",
            url: "https://example.com/400",
            statusCode: 400,
            responseTime: 150,
            failedAssertions: [],
          },
        ],
      };

      const categories = helper.categorizeFailures(stats);

      expect(categories.clientErrors).toBe(2);
      expect(categories.serverErrors).toBe(0);
      expect(categories.timeouts).toBe(0);
      expect(categories.assertionFailures).toBe(0);
      expect(categories.other).toBe(0);
    });

    it("should categorize server errors (5xx)", () => {
      const stats: NewmanExecutionStats = {
        collectionName: "Test",
        totalRequests: 3,
        failedRequests: 2,
        successRate: 33.33,
        totalAssertions: 6,
        failedAssertions: 2,
        assertionSuccessRate: 66.67,
        timings: {
          started: "2023-01-01T00:00:00.000Z",
          completed: "2023-01-01T00:00:10.000Z",
          totalDuration: 10000,
          responseTimeMin: 100,
          responseTimeMax: 500,
          responseTimeAvg: 250,
        },
        failures: [
          {
            name: "Test 1",
            method: "GET",
            url: "https://example.com/500",
            statusCode: 500,
            responseTime: 300,
            failedAssertions: [],
          },
          {
            name: "Test 2",
            method: "GET",
            url: "https://example.com/503",
            statusCode: 503,
            responseTime: 400,
            failedAssertions: [],
          },
        ],
      };

      const categories = helper.categorizeFailures(stats);

      expect(categories.serverErrors).toBe(2);
      expect(categories.clientErrors).toBe(0);
    });

    it("should categorize timeout errors", () => {
      const stats: NewmanExecutionStats = {
        collectionName: "Test",
        totalRequests: 2,
        failedRequests: 1,
        successRate: 50,
        totalAssertions: 4,
        failedAssertions: 1,
        assertionSuccessRate: 75,
        timings: {
          started: "2023-01-01T00:00:00.000Z",
          completed: "2023-01-01T00:00:10.000Z",
          totalDuration: 10000,
          responseTimeMin: 100,
          responseTimeMax: 30000,
          responseTimeAvg: 15000,
        },
        failures: [
          {
            name: "Test 1",
            method: "GET",
            url: "https://example.com/slow",
            statusCode: 0,
            responseTime: 30000,
            failedAssertions: [
              {
                assertion: "Response received",
                error: "Request timeout after 30000ms",
              },
            ],
          },
        ],
      };

      const categories = helper.categorizeFailures(stats);

      expect(categories.timeouts).toBe(1);
    });

    it("should categorize assertion failures", () => {
      const stats: NewmanExecutionStats = {
        collectionName: "Test",
        totalRequests: 2,
        failedRequests: 1,
        successRate: 50,
        totalAssertions: 4,
        failedAssertions: 2,
        assertionSuccessRate: 50,
        timings: {
          started: "2023-01-01T00:00:00.000Z",
          completed: "2023-01-01T00:00:10.000Z",
          totalDuration: 10000,
          responseTimeMin: 100,
          responseTimeMax: 500,
          responseTimeAvg: 250,
        },
        failures: [
          {
            name: "Test 1",
            method: "GET",
            url: "https://example.com/test",
            statusCode: 200,
            responseTime: 200,
            failedAssertions: [
              {
                assertion: "Response has valid JSON",
                error: "Invalid JSON format",
              },
            ],
          },
        ],
      };

      const categories = helper.categorizeFailures(stats);

      expect(categories.assertionFailures).toBe(1);
    });

    it("should handle mixed failure types", () => {
      const stats: NewmanExecutionStats = {
        collectionName: "Test",
        totalRequests: 10,
        failedRequests: 5,
        successRate: 50,
        totalAssertions: 20,
        failedAssertions: 5,
        assertionSuccessRate: 75,
        timings: {
          started: "2023-01-01T00:00:00.000Z",
          completed: "2023-01-01T00:00:10.000Z",
          totalDuration: 10000,
          responseTimeMin: 100,
          responseTimeMax: 500,
          responseTimeAvg: 250,
        },
        failures: [
          {name: "Test 1", method: "GET", url: "https://example.com/404", statusCode: 404, responseTime: 200, failedAssertions: []},
          {name: "Test 2", method: "GET", url: "https://example.com/500", statusCode: 500, responseTime: 300, failedAssertions: []},
          {
            name: "Test 3",
            method: "GET",
            url: "https://example.com/timeout",
            statusCode: 0,
            responseTime: 30000,
            failedAssertions: [{assertion: "Response", error: "timeout"}],
          },
          {
            name: "Test 4",
            method: "GET",
            url: "https://example.com/assertion",
            statusCode: 200,
            responseTime: 150,
            failedAssertions: [{assertion: "JSON valid", error: "Invalid"}],
          },
        ],
      };

      const categories = helper.categorizeFailures(stats);

      expect(categories.clientErrors).toBe(1);
      expect(categories.serverErrors).toBe(1);
      expect(categories.timeouts).toBe(1);
      expect(categories.assertionFailures).toBe(1);
    });
  });

  describe("generateMarkdownSection", () => {
    let mockStats: NewmanExecutionStats;

    beforeEach(() => {
      mockStats = {
        collectionName: "API Test Suite",
        totalRequests: 10,
        failedRequests: 2,
        successRate: 80,
        totalAssertions: 20,
        failedAssertions: 3,
        assertionSuccessRate: 85,
        timings: {
          started: "2023-01-01T00:00:00.000Z",
          completed: "2023-01-01T00:00:10.000Z",
          totalDuration: 10000,
          responseTimeMin: 100,
          responseTimeMax: 500,
          responseTimeAvg: 250,
        },
        failures: [
          {
            name: "GET Users",
            method: "GET",
            url: "https://api.example.com/users/999",
            statusCode: 404,
            responseTime: 200,
            failedAssertions: [
              {
                assertion: "Status code is 200",
                error: "expected 404 to equal 200",
              },
            ],
            responseBody: "User not found",
          },
        ],
      };
    });

    it("should generate complete markdown section with all components", () => {
      const markdown = helper.generateMarkdownSection(mockStats, "Backend API");

      expect(markdown).toContain("## 📊 Backend API Newman Test Results");
      expect(markdown).toContain("### Test Execution Summary");
      expect(markdown).toContain("### ⏱️ Performance Metrics");
      expect(markdown).toContain("### ❌ Failed Requests");
      expect(markdown).toContain("API Test Suite");
      expect(markdown).toContain("80.00%"); // Success rate
    });

    it("should exclude performance section when option is false", () => {
      const options: MarkdownOptions = {includePerformance: false};
      const markdown = helper.generateMarkdownSection(mockStats, "Backend API", options);

      expect(markdown).not.toContain("### ⏱️ Performance Metrics");
      expect(markdown).toContain("### Test Execution Summary");
    });

    it("should exclude failure details when option is false", () => {
      const options: MarkdownOptions = {includeFailureDetails: false};
      const markdown = helper.generateMarkdownSection(mockStats, "Backend API", options);

      expect(markdown).not.toContain("### ❌ Failed Requests");
      expect(markdown).toContain("### Test Execution Summary");
    });

    it("should show success message when no failures", () => {
      // Test mutation - override readonly for testing purposes
      (mockStats as unknown as {failures: []}).failures = [];
      (mockStats as unknown as {failedRequests: number}).failedRequests = 0;
      (mockStats as unknown as {failedAssertions: number}).failedAssertions = 0;

      const markdown = helper.generateMarkdownSection(mockStats, "Frontend");

      expect(markdown).toContain("### ✅ All Requests Passed");
      expect(markdown).toContain("No failed requests detected");
    });

    it("should include status emojis for failures", () => {
      // Test mutation - override readonly for testing purposes
      (mockStats.failures[0]! as {statusCode: number}).statusCode = 500;
      const markdown = helper.generateMarkdownSection(mockStats, "Backend API");

      expect(markdown).toContain("🔴"); // Server error emoji
    });

    it("should respect maxResponseBodyLength option", () => {
      const longBody = "A".repeat(1000);
      // Test mutation - override readonly for testing purposes
      (mockStats.failures[0]! as {responseBody: string}).responseBody = longBody;

      const options: MarkdownOptions = {maxResponseBodyLength: 100};
      const markdown = helper.generateMarkdownSection(mockStats, "Backend API", options);

      expect(markdown).toContain("(truncated)");
    });

    it("should format timing durations correctly", () => {
      const markdown = helper.generateMarkdownSection(mockStats, "Backend API");

      expect(markdown).toContain("10.00s"); // 10000ms = 10s
    });
  });

  describe("Convenience exports", () => {
    it("should export parseNewmanReport function", () => {
      const mockReport = createMockNewmanReport();
      const result = parseNewmanReport(mockReport);

      expect(result.collectionName).toBe("Test Collection");
    });

    it("should export categorizeFailures function", () => {
      const mockReport = createMockNewmanReport();
      const stats = parseNewmanReport(mockReport);
      const categories = categorizeFailures(stats);

      expect(categories).toHaveProperty("clientErrors");
      expect(categories).toHaveProperty("serverErrors");
    });

    it("should export generateNewmanResultsSection function", () => {
      const mockReport = createMockNewmanReport();
      const stats = parseNewmanReport(mockReport);
      const markdown = generateNewmanResultsSection(stats, "Test");

      expect(markdown).toContain("## 📊 Test Newman Test Results");
    });
  });
});
