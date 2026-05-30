import {describe, it, expect, vi, beforeEach} from "vitest";
import type {VitestJsonReport} from "./_testHelpers.ts";

const passing: VitestJsonReport = {
  numTotalTests: 5, numPassedTests: 5, numFailedTests: 0, numPendingTests: 0,
  testResults: [{name: "x.test.ts", status: "passed", assertionResults: []}],
};

const failing: VitestJsonReport = {
  numTotalTests: 2, numPassedTests: 1, numFailedTests: 1, numPendingTests: 0,
  testResults: [{
    name: "x.test.ts", status: "failed",
    assertionResults: [
      {fullName: "ok", status: "passed", failureMessages: []},
      {fullName: "boom", status: "failed", failureMessages: ["fail"], location: {line: 1, column: 1}},
    ],
  }],
};

describe("testFrontendProvider", () => {
  beforeEach(() => vi.resetModules());

  it("has stable identity fields", async () => {
    const {testFrontendProvider} = await import("./testFrontendProvider.ts");
    expect(testFrontendProvider.id).toBe("test-frontend");
    expect(testFrontendProvider.name).toBe("Tests · Frontend");
    expect(testFrontendProvider.defaultGate).toEqual({kind: "blocking", blockOn: "error"});
  });

  it("runs each frontend project and emits one suite per project", async () => {
    // Mock exec.getExecOutput to return different reports per project.
    const getExecOutput = vi.fn().mockImplementation((_cmd: string, args: string[]) => {
      const target = args.find((a) => a.startsWith("@arolariu/")) ?? "";
      const report = target.includes("website") ? failing : passing;
      return Promise.resolve({exitCode: 0, stdout: JSON.stringify(report), stderr: ""});
    });
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    const {testFrontendProvider} = await import("./testFrontendProvider.ts");
    const result = await testFrontendProvider.run({
      workspaceRoot: "/w", baseRef: "main", headRef: "HEAD", changedFiles: [], env: {},
    });
    // 4 projects → 4 suites
    expect(result.payload.suites).toHaveLength(4);
    expect(result.payload.suites.map((s) => s.name).sort()).toEqual(["components", "cv", "status", "website"]);
    // Only the failing project contributes a finding
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    if (f?.kind === "line") {
      expect(f.suite).toBe("website");
    }
    expect(result.payload.totalTests).toBe(5 + 5 + 5 + 2); // 3 passing reports + 1 failing
    expect(result.payload.failed).toBe(1);
  });

  it("records a synthetic 'runner-failed' suite when a project produces no JSON", async () => {
    const getExecOutput = vi.fn().mockImplementation((_cmd: string, args: string[]) => {
      const target = args.find((a) => a.startsWith("@arolariu/")) ?? "";
      if (target.includes("cv")) {
        return Promise.resolve({exitCode: 1, stdout: "garbage", stderr: "build failed"});
      }
      return Promise.resolve({exitCode: 0, stdout: JSON.stringify(passing), stderr: ""});
    });
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    const {testFrontendProvider} = await import("./testFrontendProvider.ts");
    const result = await testFrontendProvider.run({
      workspaceRoot: "/w", baseRef: "main", headRef: "HEAD", changedFiles: [], env: {},
    });
    const cvSuite = result.payload.suites.find((s) => s.name === "cv");
    expect(cvSuite).toBeDefined();
    expect(cvSuite?.failed).toBe(1);
    expect(cvSuite?.findings[0]?.kind).toBe("line");
    const f = cvSuite?.findings[0];
    if (f?.kind === "line") {
      expect(f.ruleId).toBe("cv/runner-failed");
      expect(f.message).toContain("nx target failed");
    }
  });
});
