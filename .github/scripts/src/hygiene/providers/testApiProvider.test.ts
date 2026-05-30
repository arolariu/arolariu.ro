import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

const sampleTrx = `<?xml version="1.0"?>
<TestRun>
  <Results>
    <UnitTestResult testName="Core.Foo_Pass" outcome="Passed" duration="00:00:00.001"/>
    <UnitTestResult testName="Core.Bar_Fail" outcome="Failed" duration="00:00:00.002">
      <Output><ErrorInfo><Message>Assert failed</Message></ErrorInfo></Output>
    </UnitTestResult>
  </Results>
</TestRun>`;

describe("testApiProvider", () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "api-test-"));
    vi.resetModules();
  });
  afterEach(async () => {
    await fs.rm(tmpDir, {recursive: true, force: true});
  });

  it("has stable identity fields", async () => {
    const {testApiProvider} = await import("./testApiProvider.ts");
    expect(testApiProvider.id).toBe("test-api");
    expect(testApiProvider.name).toBe("Tests · API (.NET)");
    expect(testApiProvider.defaultGate).toEqual({kind: "blocking", blockOn: "error"});
  });

  it("parses .trx files written by dotnet test into per-file suites", async () => {
    // testApiProvider clears the TRX dir before invoking dotnet test, so we
    // need to make the mocked exec write the .trx files as a side effect.
    const trxDir = path.join(tmpDir, "sites", "api.arolariu.ro", "TestResults");
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockImplementation(async () => {
        await fs.mkdir(trxDir, {recursive: true});
        await fs.writeFile(path.join(trxDir, "hygiene.Core.trx"), sampleTrx, "utf-8");
        await fs.writeFile(path.join(trxDir, "hygiene.Domain.trx"), sampleTrx, "utf-8");
        return {exitCode: 1, stdout: "", stderr: ""};
      }),
    }));
    const {testApiProvider} = await import("./testApiProvider.ts");
    const result = await testApiProvider.run({
      workspaceRoot: tmpDir, baseRef: "main", headRef: "HEAD", changedFiles: [], env: {},
    });
    expect(result.payload.suites).toHaveLength(2);
    const names = result.payload.suites.map((s) => s.name).sort();
    expect(names).toEqual(["Core", "Domain"]);
    expect(result.payload.totalTests).toBe(4); // 2 tests × 2 suites
    expect(result.payload.failed).toBe(2);
    expect(result.findings).toHaveLength(2);
  });

  it("emits a runner-failed synthetic suite when no .trx files exist", async () => {
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockResolvedValue({exitCode: 1, stdout: "", stderr: "dotnet not found"}),
    }));
    const {testApiProvider} = await import("./testApiProvider.ts");
    const result = await testApiProvider.run({
      workspaceRoot: tmpDir, baseRef: "main", headRef: "HEAD", changedFiles: [], env: {},
    });
    expect(result.payload.suites).toHaveLength(1);
    expect(result.payload.suites[0]?.name).toBe("api");
    expect(result.payload.failed).toBe(1);
    const f = result.findings[0];
    if (f?.kind === "line") {
      expect(f.ruleId).toBe("api/runner-failed");
      expect(f.message).toContain("dotnet test produced no .trx files");
    }
  });
});
