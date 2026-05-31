import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const sampleTrx = `<?xml version="1.0"?>
<TestRun>
  <Results>
    <UnitTestResult testName="Core.Foo_Pass" outcome="Passed" duration="00:00:00.001"/>
    <UnitTestResult testName="Core.Bar_Fail" outcome="Failed" duration="00:00:00.002">
      <Output><ErrorInfo><Message>Assert failed</Message></ErrorInfo></Output>
    </UnitTestResult>
  </Results>
</TestRun>`;

describe("testDotnetProvider", () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "dotnet-test-"));
    vi.resetModules();
  });
  afterEach(async () => {
    await fs.rm(tmpDir, {recursive: true, force: true});
  });

  it("has stable identity fields", async () => {
    const {testDotnetProvider} = await import("./testDotnetProvider.ts");
    expect(testDotnetProvider.id).toBe("test-dotnet");
    expect(testDotnetProvider.name).toBe("DotNet Unit Tests");
    expect(testDotnetProvider.defaultGate).toEqual({kind: "blocking", blockOn: "error"});
  });

  it("is applicable only for backend or broad changes", async () => {
    const {testDotnetProvider} = await import("./testDotnetProvider.ts");

    expect(
      testDotnetProvider.applicableTo({
        workspaceRoot: tmpDir,
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "known",
        changedFiles: ["sites/api.arolariu.ro/src/Core/Program.cs"],
        env: {},
      }),
    ).toBe(true);
    expect(
      testDotnetProvider.applicableTo({
        workspaceRoot: tmpDir,
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "known",
        changedFiles: ["sites/arolariu.ro/src/app/page.tsx"],
        env: {},
      }),
    ).toBe(false);
    expect(
      testDotnetProvider.applicableTo({
        workspaceRoot: tmpDir,
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "unknown",
        changedFiles: [],
        env: {},
      }),
    ).toBe(true);
  });

  it("parses .trx files written by dotnet test into per-file suites", async () => {
    const trxDir = path.join(tmpDir, "sites", "api.arolariu.ro", "TestResults");
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockImplementation(async () => {
        await fs.mkdir(trxDir, {recursive: true});
        await fs.writeFile(path.join(trxDir, "hygiene.Core.trx"), sampleTrx, "utf-8");
        await fs.writeFile(path.join(trxDir, "hygiene.Domain.trx"), sampleTrx, "utf-8");
        return {exitCode: 1, stdout: "", stderr: ""};
      }),
    }));
    const {testDotnetProvider} = await import("./testDotnetProvider.ts");
    const result = await testDotnetProvider.run({
      workspaceRoot: tmpDir,
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "unknown",
      changedFiles: [],
      env: {},
    });
    expect(result.payload.suites).toHaveLength(2);
    expect(result.payload.suites.map((s) => s.name).sort()).toEqual(["Core", "Domain"]);
    expect(result.payload.totalTests).toBe(4);
    expect(result.payload.failed).toBe(2);
  });

  it("emits runner-failed synthetic suite when no .trx files exist", async () => {
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockResolvedValue({exitCode: 1, stdout: "", stderr: "dotnet not found"}),
    }));
    const {testDotnetProvider} = await import("./testDotnetProvider.ts");
    const result = await testDotnetProvider.run({
      workspaceRoot: tmpDir,
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "unknown",
      changedFiles: [],
      env: {},
    });
    expect(result.payload.suites[0]?.name).toBe("dotnet");
    expect(result.payload.failed).toBe(1);
    const f = result.findings[0];
    if (f?.kind === "line") {
      expect(f.ruleId).toBe("dotnet/runner-failed");
    }
  });
});
