import * as fs from "node:fs/promises";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {access, writeFile} from "node:fs/promises";
import * as path from "node:path";
import type {VitestJsonReport} from "./_testHelpers.ts";

async function writeReport(args: readonly string[], report: VitestJsonReport, exitCode = 0) {
  const outputFile = args[args.indexOf("--outputFile") + 1];
  if (args.includes("--outputFile") && outputFile) {
    await fs.writeFile(outputFile, JSON.stringify(report));
  }
  return {exitCode, stdout: "JSON report written to output.json", stderr: ""};
}

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

  it("runs each suite and emits one SuiteResult per project", async () => {
    // Mock exec.getExecOutput to return a failing report only when cwd ends with sites/arolariu.ro (website).
    const getExecOutput = vi.fn().mockImplementation((_cmd: string, args: string[], opts?: {cwd?: string}) => {
      const cwd = (opts?.cwd ?? "").replace(/\\/g, "/");
      const isWebsite = cwd.endsWith("sites/arolariu.ro");
      const report = isWebsite ? failing : passing;
      return writeReport(args, report, isWebsite ? 1 : 0);
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
    expect(result.payload.totalTests).toBe(22);
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    if (f?.kind === "line") {
      expect(f.suite).toBe("website");
    }
    for (const call of getExecOutput.mock.calls) {
      const args = call[1] as string[];
      const outputFile = args[args.indexOf("--outputFile") + 1];
      expect(outputFile).toBeDefined();
      await expect(fs.access(outputFile ?? "")).rejects.toMatchObject({code: "ENOENT"});
    }
  });

  it("records a runner-failed synthetic suite when one project produces no JSON", async () => {
    const getExecOutput = vi.fn().mockImplementation((_cmd: string, args: string[], opts?: {cwd?: string}) => {
      const cwd = opts?.cwd ?? "";
      if (cwd.includes("cv.arolariu.ro")) {
        return Promise.resolve({exitCode: 1, stdout: "garbage non-json", stderr: "build failed"});
      }
      return writeReport(args, passing);
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

  it("reads the explicit JSON output file when Vitest writes no report to stdout and cleans up", async () => {
    let reportPath = "";
    const getExecOutput = vi.fn().mockImplementation(async (_cmd: string, args: string[]) => {
      const outputIndex = args.indexOf("--outputFile");
      if (outputIndex >= 0) {
        reportPath = args[outputIndex + 1] ?? "";
        await writeFile(reportPath, JSON.stringify(passing));
      }
      return {exitCode: 0, stdout: "JSON report written to file", stderr: ""};
    });
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    const {testTypescriptProvider} = await import("./testTypescriptProvider.ts");

    const result = await testTypescriptProvider.run({
      workspaceRoot: path.resolve("/w"),
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "known",
      changedFiles: ["packages/components/src/index.ts"],
      env: {},
    });

    expect(result.payload.passed).toBe(5);
    expect(result.payload.failed).toBe(0);
    expect(result.findings).toEqual([]);
    expect(path.isAbsolute(reportPath)).toBe(true);
    await expect(access(reportPath)).rejects.toMatchObject({code: "ENOENT"});
  });

  it("preserves a nonzero runner exit when all reported assertions passed", async () => {
    const stderr = `${"Vite configuration advisory\n".repeat(200)}Coverage threshold failed`;
    const getExecOutput = vi.fn().mockResolvedValue({exitCode: 1, stdout: JSON.stringify(passing), stderr});
    vi.doMock("@actions/exec", () => ({getExecOutput}));
    const {testTypescriptProvider} = await import("./testTypescriptProvider.ts");

    const result = await testTypescriptProvider.run({
      workspaceRoot: "/w",
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "known",
      changedFiles: ["packages/components/src/index.ts"],
      env: {},
    });

    expect(result.payload.passed).toBe(5);
    expect(result.findings).toEqual([
      expect.objectContaining({
        severity: "error",
        ruleId: "components/runner-failed",
        message: expect.stringContaining("Coverage threshold failed"),
      }),
    ]);
  });

  it("runs only the website suite for website-only changes", async () => {
    const getExecOutput = vi.fn().mockImplementation((_cmd: string, args: string[]) => writeReport(args, passing));
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

  it("does not accept passing assertions when the Vitest process fails", async () => {
    const getExecOutput = vi.fn().mockImplementation((_cmd: string, args: string[]) => writeReport(args, passing, 1));
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

    expect(result.payload.passed).toBe(5);
    expect(result.findings[0]).toMatchObject({ruleId: "website/runner-failed"});
    expect(result.findings[0]?.message).toContain("exited with code 1");
  });
});
