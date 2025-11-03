/**
 * @fileoverview Comprehensive test suite for Playwright helper
 * @module helpers/playwright/index.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import type {IFileSystemHelper} from "../filesystem/index.ts";
import {
  categorizePlaywrightFailures,
  createPlaywrightHelper,
  generatePlaywrightMarkdownSection,
  generateSimplePlaywrightSection,
  parsePlaywrightResults,
  playwright,
  type IPlaywrightHelper,
  type ParsedTestResults,
  type PlaywrightMarkdownOptions,
  type TestCase,
  type TestStatistics,
} from "./index.ts";

/**
 * Creates a mock Playwright JSON report structure
 */
function createMockPlaywrightReport(
  options: {
    passed?: number;
    failed?: number;
    skipped?: number;
    flaky?: number;
    includeError?: boolean;
  } = {},
) {
  const {passed = 10, failed = 2, skipped = 1, flaky = 1, includeError = true} = options;

  const report = {
    stats: {
      expected: passed,
      unexpected: failed,
      flaky,
      skipped,
      duration: 15000,
    },
    suites: [
      {
        title: "Authentication Tests",
        file: "tests/auth.spec.ts",
        specs: [
          {
            title: "should login successfully",
            tests: [
              {
                status: "passed",
                results: [{status: "passed", duration: 1200}],
              },
            ],
          },
          {
            title: "should handle invalid credentials",
            tests: [
              {
                status: "failed",
                results: [
                  {
                    status: "failed",
                    duration: 2500,
                    error: includeError
                      ? {
                          message: "expect(received).toBe(expected)\n\nExpected: 401\nReceived: 500",
                          stack: "Error: expect(received).toBe(expected)\n    at tests/auth.spec.ts:25:30",
                        }
                      : undefined,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        title: "Checkout Tests",
        file: "tests/checkout.spec.ts",
        specs: [
          {
            title: "should complete purchase",
            tests: [
              {
                status: "timedOut",
                results: [
                  {
                    status: "timedOut",
                    duration: 30000,
                    error: {
                      message: "Test timeout of 30000ms exceeded",
                    },
                  },
                ],
              },
            ],
          },
          {
            title: "should apply discount code",
            tests: [
              {
                status: "skipped",
                results: [{status: "skipped", duration: 0}],
              },
            ],
          },
          {
            title: "should handle payment errors",
            tests: [
              {
                status: "flaky",
                results: [
                  {status: "failed", duration: 1000, retry: 0},
                  {status: "passed", duration: 1100, retry: 1},
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  return report;
}

/**
 * Creates a mock file system helper for testing
 */
function createMockFileSystemHelper(mockData: any): IFileSystemHelper {
  return {
    exists: vi.fn().mockResolvedValue(true),
    readJson: vi.fn().mockResolvedValue(mockData),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    createDirectory: vi.fn(),
    listFiles: vi.fn(),
    getFileStats: vi.fn(),
  } as unknown as IFileSystemHelper;
}

describe("PlaywrightHelper", () => {
  let helper: IPlaywrightHelper;

  beforeEach(() => {
    helper = createPlaywrightHelper();
  });

  describe("parseResults", () => {
    it("should successfully parse valid test results", async () => {
      const mockReport = createMockPlaywrightReport();
      const mockFs = createMockFileSystemHelper(mockReport);

      const results = await helper.parseResults("test-results.json", mockFs);

      expect(results.statistics.total).toBe(14);
      expect(results.statistics.passed).toBe(10);
      expect(results.statistics.failed).toBe(2);
      expect(results.statistics.skipped).toBe(1);
      expect(results.statistics.flaky).toBe(1);
      expect(results.tests).toHaveLength(5);
      expect(results.failures).toHaveLength(2);
      expect(results.flaky).toHaveLength(1);
    });

    it("should throw error when results file does not exist", async () => {
      const mockFs = {
        exists: vi.fn().mockResolvedValue(false),
        readJson: vi.fn(),
      } as unknown as IFileSystemHelper;

      await expect(helper.parseResults("missing.json", mockFs)).rejects.toThrow("Playwright results file not found");
    });

    it("should handle report with no suites", async () => {
      const mockReport = {stats: {expected: 0, unexpected: 0, flaky: 0, skipped: 0, duration: 0}};
      const mockFs = createMockFileSystemHelper(mockReport);

      const results = await helper.parseResults("empty.json", mockFs);

      expect(results.tests).toHaveLength(0);
      expect(results.statistics.total).toBe(0);
    });

    it("should handle report with missing stats", async () => {
      const mockReport = {
        suites: [
          {
            title: "Test Suite",
            file: "test.spec.ts",
            specs: [
              {
                title: "test case",
                tests: [{status: "passed", results: [{status: "passed", duration: 1000}]}],
              },
            ],
          },
        ],
      };
      const mockFs = createMockFileSystemHelper(mockReport);

      const results = await helper.parseResults("results.json", mockFs);

      expect(results.tests).toHaveLength(1);
      expect(results.statistics.total).toBe(1);
      expect(results.statistics.passed).toBe(1);
    });

    it("should extract error information from failed tests", async () => {
      const mockReport = createMockPlaywrightReport({passed: 0, failed: 1, includeError: true});
      const mockFs = createMockFileSystemHelper(mockReport);

      const results = await helper.parseResults("results.json", mockFs);

      expect(results.failures).toHaveLength(2);
      const failureWithError = results.failures[0];
      expect(failureWithError?.error).toBeDefined();
      expect(failureWithError?.error?.message).toContain("expect(received).toBe(expected)");
    });

    it("should count retries correctly for flaky tests", async () => {
      const mockReport = createMockPlaywrightReport({flaky: 1});
      const mockFs = createMockFileSystemHelper(mockReport);

      const results = await helper.parseResults("results.json", mockFs);

      const flakyTest = results.flaky[0];
      expect(flakyTest).toBeDefined();
      expect(flakyTest?.retries).toBe(1);
    });
  });

  describe("generateMarkdownSection", () => {
    let mockResults: ParsedTestResults;

    beforeEach(() => {
      const passedTest: TestCase = {
        title: "should work",
        fullTitle: "Feature › should work",
        file: "test.spec.ts",
        status: "passed",
        duration: 1000,
      };

      const failedTest: TestCase = {
        title: "should fail",
        fullTitle: "Feature › should fail",
        file: "test.spec.ts",
        status: "failed",
        duration: 2000,
        error: {message: "Expected true to be false"},
      };

      const flakyTest: TestCase = {
        title: "should be flaky",
        fullTitle: "Feature › should be flaky",
        file: "test.spec.ts",
        status: "flaky",
        duration: 1500,
        retries: 2,
      };

      const statistics: TestStatistics = {
        total: 10,
        passed: 8,
        failed: 1,
        skipped: 0,
        flaky: 1,
        duration: 15000,
      };

      mockResults = {
        statistics,
        tests: [passedTest, failedTest, flakyTest],
        failures: [failedTest],
        flaky: [flakyTest],
        categories: {
          assertions: [failedTest],
          timeouts: [],
          other: [],
        },
      };
    });

    it("should generate markdown with default options", () => {
      const markdown = helper.generateMarkdownSection(mockResults);

      expect(markdown).toContain("### ❌ 🎭 Playwright Tests");
      expect(markdown).toContain("| ✅ Passed | 8 |");
      expect(markdown).toContain("| ❌ Failed | 1 |");
      expect(markdown).toContain("| ⚠️ Flaky | 1 |");
      expect(markdown).toContain("#### ❌ Failed Tests");
      expect(markdown).toContain("#### ⚠️ Flaky Tests");
      expect(markdown).toContain("----");
    });

    it("should include workflow run URL when provided", () => {
      const options: PlaywrightMarkdownOptions = {
        workflowRunUrl: "https://github.com/owner/repo/actions/runs/123",
      };

      const markdown = helper.generateMarkdownSection(mockResults, options);

      expect(markdown).toContain("[View Full HTML Report](https://github.com/owner/repo/actions/runs/123#artifacts)");
    });

    it("should exclude failure details when requested", () => {
      const options: PlaywrightMarkdownOptions = {
        includeFailureDetails: false,
      };

      const markdown = helper.generateMarkdownSection(mockResults, options);

      expect(markdown).not.toContain("#### ❌ Failed Tests");
      expect(markdown).not.toContain("Expected true to be false");
    });

    it("should exclude flaky tests when requested", () => {
      const options: PlaywrightMarkdownOptions = {
        includeFlakyTests: false,
      };

      const markdown = helper.generateMarkdownSection(mockResults, options);

      expect(markdown).not.toContain("#### ⚠️ Flaky Tests");
      expect(markdown).not.toContain("should be flaky");
    });

    it("should use custom title when provided", () => {
      const options: PlaywrightMarkdownOptions = {
        title: "E2E Test Results",
      };

      const markdown = helper.generateMarkdownSection(mockResults, options);

      expect(markdown).toContain("### ❌ E2E Test Results");
      expect(markdown).not.toContain("🎭 Playwright Tests");
    });

    it("should hide duration when requested", () => {
      const options: PlaywrightMarkdownOptions = {
        showDuration: false,
      };

      const markdown = helper.generateMarkdownSection(mockResults, options);

      expect(markdown).not.toContain("⏱️ Duration");
      expect(markdown).not.toContain("15.00s");
    });

    it("should limit number of failures displayed", () => {
      const manyFailures: TestCase[] = Array.from({length: 20}, (_, index) => ({
        title: `Test ${index}`,
        fullTitle: `Suite › Test ${index}`,
        file: "test.spec.ts",
        status: "failed" as const,
        duration: 1000,
        error: {message: `Error ${index}`},
      }));

      const resultsWithManyFailures: ParsedTestResults = {
        ...mockResults,
        failures: manyFailures,
        categories: {
          assertions: manyFailures,
          timeouts: [],
          other: [],
        },
      };

      const options: PlaywrightMarkdownOptions = {
        maxFailuresToShow: 5,
      };

      const markdown = helper.generateMarkdownSection(resultsWithManyFailures, options);

      expect(markdown).toContain("Test 0");
      expect(markdown).toContain("Test 4");
      expect(markdown).not.toContain("Test 5");
      expect(markdown).toContain("... and 15 more failures");
    });

    it("should show success emoji when all tests pass", () => {
      const successResults: ParsedTestResults = {
        ...mockResults,
        statistics: {...mockResults.statistics, failed: 0, flaky: 0},
        failures: [],
        flaky: [],
      };

      const markdown = helper.generateMarkdownSection(successResults);

      expect(markdown).toContain("### ✅ 🎭 Playwright Tests");
    });

    it("should show warning emoji when tests are flaky but not failed", () => {
      const flakyResults: ParsedTestResults = {
        ...mockResults,
        statistics: {...mockResults.statistics, failed: 0},
        failures: [],
      };

      const markdown = helper.generateMarkdownSection(flakyResults);

      expect(markdown).toContain("### ⚠️ 🎭 Playwright Tests");
    });
  });

  describe("generateSimpleSection", () => {
    it("should generate simple section for success", () => {
      const markdown = helper.generateSimpleSection("success", "https://github.com/owner/repo/actions/runs/123");

      expect(markdown).toContain("### ✅ Playwright Tests");
      expect(markdown).toContain("All Playwright tests passed!");
      expect(markdown).toContain("[View Full Report](https://github.com/owner/repo/actions/runs/123#artifacts)");
    });

    it("should generate simple section for failure", () => {
      const markdown = helper.generateSimpleSection("failure", "https://github.com/owner/repo/actions/runs/456");

      expect(markdown).toContain("### ❌ Playwright Tests");
      expect(markdown).toContain("Playwright tests failed.");
    });

    it("should generate simple section for unknown status", () => {
      const markdown = helper.generateSimpleSection("cancelled", "https://github.com/owner/repo/actions/runs/789");

      expect(markdown).toContain("### ⚠️ Playwright Tests");
      expect(markdown).toContain("Playwright tests status: cancelled");
    });
  });

  describe("categorizeFailures", () => {
    it("should categorize assertion failures", () => {
      const failures: TestCase[] = [
        {
          title: "test",
          fullTitle: "test",
          file: "test.spec.ts",
          status: "failed",
          duration: 1000,
          error: {message: "expect(received).toBe(expected)"},
        },
      ];

      const categories = helper.categorizeFailures(failures);

      expect(categories.assertions).toHaveLength(1);
      expect(categories.timeouts).toHaveLength(0);
      expect(categories.other).toHaveLength(0);
    });

    it("should categorize timeout failures", () => {
      const failures: TestCase[] = [
        {
          title: "test",
          fullTitle: "test",
          file: "test.spec.ts",
          status: "timedOut",
          duration: 30000,
          error: {message: "Test timeout exceeded"},
        },
      ];

      const categories = helper.categorizeFailures(failures);

      expect(categories.assertions).toHaveLength(0);
      expect(categories.timeouts).toHaveLength(1);
      expect(categories.other).toHaveLength(0);
    });

    it("should categorize other failures", () => {
      const failures: TestCase[] = [
        {
          title: "test",
          fullTitle: "test",
          file: "test.spec.ts",
          status: "failed",
          duration: 1000,
          error: {message: "Network error occurred"},
        },
      ];

      const categories = helper.categorizeFailures(failures);

      expect(categories.assertions).toHaveLength(0);
      expect(categories.timeouts).toHaveLength(0);
      expect(categories.other).toHaveLength(1);
    });

    it("should handle mixed failure types", () => {
      const failures: TestCase[] = [
        {
          title: "test1",
          fullTitle: "test1",
          file: "test.spec.ts",
          status: "failed",
          duration: 1000,
          error: {message: "expect(true).toBe(false)"},
        },
        {
          title: "test2",
          fullTitle: "test2",
          file: "test.spec.ts",
          status: "timedOut",
          duration: 30000,
          error: {message: "Timeout"},
        },
        {
          title: "test3",
          fullTitle: "test3",
          file: "test.spec.ts",
          status: "failed",
          duration: 1000,
          error: {message: "Something else"},
        },
      ];

      const categories = helper.categorizeFailures(failures);

      expect(categories.assertions).toHaveLength(1);
      expect(categories.timeouts).toHaveLength(1);
      expect(categories.other).toHaveLength(1);
    });

    it("should handle empty failures array", () => {
      const categories = helper.categorizeFailures([]);

      expect(categories.assertions).toHaveLength(0);
      expect(categories.timeouts).toHaveLength(0);
      expect(categories.other).toHaveLength(0);
    });
  });

  describe("convenience exports", () => {
    it("should export default playwright instance", () => {
      expect(playwright).toBeDefined();
      expect(playwright.parseResults).toBeDefined();
      expect(playwright.generateMarkdownSection).toBeDefined();
      expect(playwright.generateSimpleSection).toBeDefined();
    });

    it("should export createPlaywrightHelper factory", () => {
      const instance = createPlaywrightHelper();
      expect(instance).toBeDefined();
      expect(instance.parseResults).toBeDefined();
    });

    it("should export parsePlaywrightResults convenience function", async () => {
      const mockReport = createMockPlaywrightReport();
      const mockFs = createMockFileSystemHelper(mockReport);

      const results = await parsePlaywrightResults("results.json", mockFs);

      expect(results.statistics.total).toBeGreaterThan(0);
    });

    it("should export generatePlaywrightMarkdownSection convenience function", () => {
      const mockResults: ParsedTestResults = {
        statistics: {total: 10, passed: 10, failed: 0, skipped: 0, flaky: 0, duration: 10000},
        tests: [],
        failures: [],
        flaky: [],
        categories: {assertions: [], timeouts: [], other: []},
      };

      const markdown = generatePlaywrightMarkdownSection(mockResults);

      expect(markdown).toContain("### ✅ 🎭 Playwright Tests");
    });

    it("should export generateSimplePlaywrightSection convenience function", () => {
      const markdown = generateSimplePlaywrightSection("success", "https://example.com");

      expect(markdown).toContain("All Playwright tests passed!");
    });

    it("should export categorizePlaywrightFailures convenience function", () => {
      const failures: TestCase[] = [
        {
          title: "test",
          fullTitle: "test",
          file: "test.spec.ts",
          status: "timedOut",
          duration: 30000,
        },
      ];

      const categories = categorizePlaywrightFailures(failures);

      expect(categories.timeouts).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("should handle tests with no results", async () => {
      const mockReport = {
        stats: {expected: 0, unexpected: 0, flaky: 0, skipped: 0, duration: 0},
        suites: [
          {
            title: "Suite",
            file: "test.spec.ts",
            specs: [
              {
                title: "test",
                tests: [{status: "passed", results: []}],
              },
            ],
          },
        ],
      };
      const mockFs = createMockFileSystemHelper(mockReport);

      const results = await helper.parseResults("results.json", mockFs);

      expect(results.tests).toHaveLength(0);
    });

    it("should handle missing suite titles", async () => {
      const mockReport = {
        stats: {expected: 1, unexpected: 0, flaky: 0, skipped: 0, duration: 1000},
        suites: [
          {
            file: "test.spec.ts",
            specs: [
              {
                title: "test",
                tests: [{status: "passed", results: [{status: "passed", duration: 1000}]}],
              },
            ],
          },
        ],
      };
      const mockFs = createMockFileSystemHelper(mockReport);

      const results = await helper.parseResults("results.json", mockFs);

      expect(results.tests).toHaveLength(1);
      expect(results.tests[0]?.fullTitle).toBe("test");
    });

    it("should handle missing error messages", () => {
      const failures: TestCase[] = [
        {
          title: "test",
          fullTitle: "test",
          file: "test.spec.ts",
          status: "failed",
          duration: 1000,
        },
      ];

      const markdown = helper.generateMarkdownSection(
        {
          statistics: {total: 1, passed: 0, failed: 1, skipped: 0, flaky: 0, duration: 1000},
          tests: failures,
          failures,
          flaky: [],
          categories: {assertions: [], timeouts: [], other: failures},
        },
        {includeFailureDetails: true},
      );

      expect(markdown).toContain("**test**");
      expect(markdown).not.toContain("Error:");
    });
  });
});
