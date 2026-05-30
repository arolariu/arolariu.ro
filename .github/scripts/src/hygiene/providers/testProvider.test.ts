import {describe, it, expect, vi, beforeEach} from "vitest";
import {parseVitestJsonReport, type VitestJsonReport} from "./testProvider.ts";

describe("parseVitestJsonReport", () => {
  it("extracts pass/fail counts from numTotalTests, numPassedTests, numFailedTests", () => {
    const report: VitestJsonReport = {
      numTotalTests: 10, numPassedTests: 8, numFailedTests: 2, numPendingTests: 0,
      testResults: [
        {
          name: "/w/src/a.test.ts",
          status: "failed",
          assertionResults: [
            {fullName: "suite > test 1", status: "passed", failureMessages: []},
            {
              fullName: "suite > test 2",
              status: "failed",
              failureMessages: ["AssertionError: expected 1 to be 2"],
              location: {line: 42, column: 5},
            },
          ],
        },
      ],
    };
    const r = parseVitestJsonReport(report);
    expect(r.totalTests).toBe(10);
    expect(r.passed).toBe(8);
    expect(r.failed).toBe(2);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]).toMatchObject({
      kind: "line",
      severity: "error",
      file: "/w/src/a.test.ts",
      line: 42,
      column: 5,
      ruleId: "vitest/test-failure",
    });
    expect(r.findings[0]?.message).toContain("suite > test 2");
  });

  it("uses line 1 col 1 when location is missing", () => {
    const report: VitestJsonReport = {
      numTotalTests: 1, numPassedTests: 0, numFailedTests: 1, numPendingTests: 0,
      testResults: [{
        name: "/w/x.test.ts", status: "failed",
        assertionResults: [{fullName: "t", status: "failed", failureMessages: ["boom"]}],
      }],
    };
    const r = parseVitestJsonReport(report);
    const first = r.findings[0];
    expect(first?.kind).toBe("line");
    if (first?.kind === "line") {
      expect(first.line).toBe(1);
      expect(first.column).toBe(1);
    }
  });
});

describe("testProvider", () => {
  beforeEach(() => vi.resetModules());

  it("metadata", async () => {
    const {testProvider} = await import("./testProvider.ts");
    expect(testProvider.id).toBe("test");
    expect(testProvider.name).toBe("Vitest");
    expect(testProvider.defaultGate).toEqual({kind: "blocking", blockOn: "error"});
  });

  it("emits MetricFinding for low coverage", async () => {
    const vitestReport: VitestJsonReport = {
      numTotalTests: 5, numPassedTests: 5, numFailedTests: 0, numPendingTests: 0,
      testResults: [],
    };
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: JSON.stringify(vitestReport),
        stderr: "",
      }),
    }));
    vi.doMock("node:fs/promises", () => ({
      default: {readFile: vi.fn().mockResolvedValue(JSON.stringify({
        total: {
          lines: {total: 100, covered: 70, pct: 70},
          statements: {total: 100, covered: 70, pct: 70},
          functions: {total: 50, covered: 40, pct: 80},
          branches: {total: 40, covered: 35, pct: 87.5},
        },
      }))},
      readFile: vi.fn().mockResolvedValue(JSON.stringify({
        total: {
          lines: {total: 100, covered: 70, pct: 70},
          statements: {total: 100, covered: 70, pct: 70},
          functions: {total: 50, covered: 40, pct: 80},
          branches: {total: 40, covered: 35, pct: 87.5},
        },
      })),
    }));
    const {testProvider} = await import("./testProvider.ts");
    const result = await testProvider.run({
      workspaceRoot: "/w", baseRef: "main", headRef: "HEAD", changedFiles: [], env: {},
    });
    const lineMetric = result.findings.find((f) => f.kind === "metric" && f.name === "coverage.lines");
    expect(lineMetric).toBeDefined();
    expect(result.payload.coverage?.lines.pct).toBe(70);
  });
});
