import {describe, it, expect, vi, beforeEach} from "vitest";
import type {VitestJsonReport} from "./_testHelpers.ts";

describe("testScriptsProvider", () => {
  beforeEach(() => vi.resetModules());

  it("has stable identity fields", async () => {
    const {testScriptsProvider} = await import("./testScriptsProvider.ts");
    expect(testScriptsProvider.id).toBe("test-scripts");
    expect(testScriptsProvider.name).toBe("Tests · Scripts");
    expect(testScriptsProvider.icon).toBe("🧪");
    expect(testScriptsProvider.defaultGate).toEqual({kind: "blocking", blockOn: "error"});
  });

  it("runs vitest in .github/scripts and produces a single-suite payload", async () => {
    const vitestJson: VitestJsonReport = {
      numTotalTests: 3, numPassedTests: 2, numFailedTests: 1, numPendingTests: 0,
      testResults: [{
        name: "src/foo.test.ts",
        status: "failed",
        assertionResults: [
          {fullName: "passes", status: "passed", failureMessages: []},
          {fullName: "passes again", status: "passed", failureMessages: []},
          {fullName: "fails", status: "failed", failureMessages: ["boom"], location: {line: 10, column: 5}},
        ],
      }],
    };
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockResolvedValue({
        exitCode: 1,
        stdout: JSON.stringify(vitestJson),
        stderr: "",
      }),
    }));
    const {testScriptsProvider} = await import("./testScriptsProvider.ts");
    const result = await testScriptsProvider.run({
      workspaceRoot: "/w", baseRef: "main", headRef: "HEAD", changedFiles: [], env: {},
    });
    expect(result.payload.suites).toHaveLength(1);
    expect(result.payload.suites[0]?.name).toBe("scripts");
    expect(result.payload.totalTests).toBe(3);
    expect(result.payload.passed).toBe(2);
    expect(result.payload.failed).toBe(1);
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f?.kind).toBe("line");
    if (f?.kind === "line") {
      expect(f.suite).toBe("scripts");
      expect(f.ruleId).toBe("scripts/test-failure");
    }
  });

  it("throws a descriptive error when no JSON report is found", async () => {
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockResolvedValue({
        exitCode: 1,
        stdout: "garbage non-json output",
        stderr: "npm err!",
      }),
    }));
    const {testScriptsProvider} = await import("./testScriptsProvider.ts");
    await expect(testScriptsProvider.run({
      workspaceRoot: "/w", baseRef: "main", headRef: "HEAD", changedFiles: [], env: {},
    })).rejects.toThrow(/Failed to extract Vitest JSON report/);
  });
});
