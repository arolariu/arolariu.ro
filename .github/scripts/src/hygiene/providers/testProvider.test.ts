import {describe, it, expect, vi, beforeEach} from "vitest";
import {parseVitestJsonReport, extractLastVitestReport, type VitestJsonReport} from "./testProvider.ts";

describe("extractLastVitestReport", () => {
  const single: VitestJsonReport = {
    numTotalTests: 1, numPassedTests: 1, numFailedTests: 0, numPendingTests: 0,
    testResults: [{name: "/w/a.test.ts", status: "passed", assertionResults: []}],
  };

  it("returns null when no JSON object is present", () => {
    expect(extractLastVitestReport("plain noise without any braces")).toBeNull();
  });

  it("returns null when JSON exists but has no testResults field", () => {
    expect(extractLastVitestReport('{"foo": 1}')).toBeNull();
  });

  it("extracts a single Vitest JSON report from clean stdout", () => {
    const out = JSON.stringify(single);
    expect(extractLastVitestReport(out)).toEqual(single);
  });

  it("ignores leading noise from npm/nx before the JSON object", () => {
    const noise = "> arolariu@1.0.0 test:unit\n> nx run-many --target=test --all\n\n";
    const out = noise + JSON.stringify(single) + "\n";
    expect(extractLastVitestReport(out)).toEqual(single);
  });

  it("returns the LAST Vitest report when nx run-many emits multiple", () => {
    const first: VitestJsonReport = {
      ...single,
      testResults: [{name: "/w/first.test.ts", status: "passed", assertionResults: []}],
    };
    const last: VitestJsonReport = {
      ...single,
      testResults: [{name: "/w/last.test.ts", status: "passed", assertionResults: []}],
    };
    const out = JSON.stringify(first) + "\n--- project boundary ---\n" + JSON.stringify(last);
    expect(extractLastVitestReport(out)).toEqual(last);
  });

  it("ignores curly braces appearing inside JSON-encoded strings", () => {
    const tricky: VitestJsonReport = {
      ...single,
      testResults: [{
        name: "/w/tricky.test.ts",
        status: "failed",
        assertionResults: [{
          fullName: "regex with } and { in message",
          status: "failed",
          failureMessages: ["expected `{x: 1}` to equal `{y: 2}`"],
        }],
      }],
    };
    const out = JSON.stringify(tricky);
    expect(extractLastVitestReport(out)).toEqual(tricky);
  });

  it("skips non-Vitest JSON blobs (e.g. nx telemetry) in favor of the report", () => {
    const telemetry = '{"projectName": "scripts", "duration": 123}';
    const out = telemetry + "\n" + JSON.stringify(single);
    expect(extractLastVitestReport(out)).toEqual(single);
  });
});

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
