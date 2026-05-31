import {beforeEach, describe, expect, it, vi} from "vitest";
import type {VitestJsonReport} from "./_testHelpers.ts";

const passing: VitestJsonReport = {
  numTotalTests: 5,
  numPassedTests: 5,
  numFailedTests: 0,
  numPendingTests: 0,
  testResults: [{name: "x.test.ts", status: "passed", assertionResults: []}],
};

const failing: VitestJsonReport = {
  numTotalTests: 2,
  numPassedTests: 1,
  numFailedTests: 1,
  numPendingTests: 0,
  testResults: [
    {
      name: "x.test.ts",
      status: "failed",
      assertionResults: [
        {fullName: "ok", status: "passed", failureMessages: []},
        {fullName: "boom", status: "failed", failureMessages: ["fail"], location: {line: 1, column: 1}},
      ],
    },
  ],
};

describe("testTypescriptProvider", () => {
  beforeEach(() => vi.resetModules());

  it("has stable identity fields", async () => {
    const {testTypescriptProvider} = await import("./testTypescriptProvider.ts");
    expect(testTypescriptProvider.id).toBe("test-typescript");
    expect(testTypescriptProvider.name).toBe("TypeScript Unit Tests");
    expect(testTypescriptProvider.defaultGate).toEqual({kind: "blocking", blockOn: "error"});
  });

  it("exposes the suite list (scripts + 4 frontend projects)", async () => {
    const {TYPESCRIPT_SUITES} = await import("./testTypescriptProvider.ts");
    const names = TYPESCRIPT_SUITES.map(([n]) => n).sort();
    expect(names).toEqual(["components", "cv", "scripts", "status", "website"]);
  });

  it("is not applicable when known changes do not affect TypeScript suites", async () => {
    const {testTypescriptProvider} = await import("./testTypescriptProvider.ts");

    expect(
      testTypescriptProvider.applicableTo({
        workspaceRoot: "/w",
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "known",
        changedFiles: ["sites/api.arolariu.ro/src/Core/Program.cs"],
        env: {},
      }),
    ).toBe(false);
  });

  it("is applicable for website suite changes and unknown scope", async () => {
    const {testTypescriptProvider} = await import("./testTypescriptProvider.ts");

    expect(
      testTypescriptProvider.applicableTo({
        workspaceRoot: "/w",
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "known",
        changedFiles: ["sites/arolariu.ro/src/app/page.tsx"],
        env: {},
      }),
    ).toBe(true);
    expect(
      testTypescriptProvider.applicableTo({
        workspaceRoot: "/w",
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "unknown",
        changedFiles: [],
        env: {},
      }),
    ).toBe(true);
  });

  it("runs each suite in parallel and emits one SuiteResult per project", async () => {
    // Mock exec.getExecOutput to return a failing report only when cwd ends with sites/arolariu.ro (website).
    const getExecOutput = vi.fn().mockImplementation((_cmd: string, _args: string[], opts?: {cwd?: string}) => {
      const cwd = (opts?.cwd ?? "").replace(/\\/g, "/");
      const isWebsite = cwd.endsWith("sites/arolariu.ro");
      const report = isWebsite ? failing : passing;
      return Promise.resolve({exitCode: 0, stdout: JSON.stringify(report), stderr: ""});
    });
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    const {testTypescriptProvider} = await import("./testTypescriptProvider.ts");
    const result = await testTypescriptProvider.run({
      workspaceRoot: "/w",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "unknown",
      changedFiles: [],
      env: {},
    });
    expect(result.payload.suites).toHaveLength(5);
    expect(result.payload.suites.map((s) => s.name).sort()).toEqual(["components", "cv", "scripts", "status", "website"]);
    // website suite has 1 failing test; others all passing
    expect(result.payload.failed).toBe(1);
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    if (f?.kind === "line") {
      expect(f.suite).toBe("website");
    }
  });

  it("records a runner-failed synthetic suite when one project produces no JSON", async () => {
    const getExecOutput = vi.fn().mockImplementation((_cmd: string, _args: string[], opts?: {cwd?: string}) => {
      const cwd = opts?.cwd ?? "";
      if (cwd.includes("cv.arolariu.ro")) {
        return Promise.resolve({exitCode: 1, stdout: "garbage non-json", stderr: "build failed"});
      }
      return Promise.resolve({exitCode: 0, stdout: JSON.stringify(passing), stderr: ""});
    });
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    const {testTypescriptProvider} = await import("./testTypescriptProvider.ts");
    const result = await testTypescriptProvider.run({
      workspaceRoot: "/w",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "unknown",
      changedFiles: [],
      env: {},
    });
    const cv = result.payload.suites.find((s) => s.name === "cv");
    expect(cv).toBeDefined();
    expect(cv?.failed).toBe(1);
    const f = cv?.findings[0];
    if (f?.kind === "line") {
      expect(f.ruleId).toBe("cv/runner-failed");
      expect(f.message).toContain("vitest produced no JSON report");
    }
  });

  it("runs only the website suite for website-only changes", async () => {
    const getExecOutput = vi.fn().mockResolvedValue({exitCode: 0, stdout: JSON.stringify(passing), stderr: ""});
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    const {testTypescriptProvider} = await import("./testTypescriptProvider.ts");

    const result = await testTypescriptProvider.run({
      workspaceRoot: "/w",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "known",
      changedFiles: ["sites/arolariu.ro/src/app/page.tsx"],
      env: {},
    });

    expect(getExecOutput).toHaveBeenCalledTimes(1);
    expect((getExecOutput.mock.calls[0]?.[2] as {cwd?: string} | undefined)?.cwd?.replace(/\\/g, "/")).toBe("/w/sites/arolariu.ro");
    expect(result.payload.suites.map((s) => s.name)).toEqual(["website"]);
  });
});
