import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const samplePytestXml = `<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="pytest" tests="3" failures="1" errors="0" skipped="0" time="0.05">
    <testcase classname="tests.api" name="test_health" file="tests/test_api.py" line="5" time="0.01"/>
    <testcase classname="tests.api" name="test_root" file="tests/test_api.py" line="10" time="0.02"/>
    <testcase classname="tests.api" name="test_broken" file="tests/test_api.py" line="20" time="0.02">
      <failure message="AssertionError">expected 200, got 500</failure>
    </testcase>
  </testsuite>
</testsuites>`;

describe("testPythonProvider", () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "python-test-"));
    vi.resetModules();
  });
  afterEach(async () => {
    await fs.rm(tmpDir, {recursive: true, force: true});
  });

  it("has stable identity fields", async () => {
    const {testPythonProvider} = await import("./testPythonProvider.ts");
    expect(testPythonProvider.id).toBe("test-python");
    expect(testPythonProvider.name).toBe("Python Unit Tests");
    expect(testPythonProvider.defaultGate).toEqual({kind: "blocking", blockOn: "error"});
  });

  it("is applicable only for exp/Python or broad changes", async () => {
    const {testPythonProvider} = await import("./testPythonProvider.ts");

    expect(
      testPythonProvider.applicableTo({
        workspaceRoot: tmpDir,
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "known",
        changedFiles: ["sites/exp.arolariu.ro/main.py"],
        env: {},
      }),
    ).toBe(true);
    expect(
      testPythonProvider.applicableTo({
        workspaceRoot: tmpDir,
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "known",
        changedFiles: ["sites/api.arolariu.ro/src/Core/Program.cs"],
        env: {},
      }),
    ).toBe(false);
    expect(
      testPythonProvider.applicableTo({
        workspaceRoot: tmpDir,
        baseRef: "main",
        headRef: "HEAD",
        changeScope: "unknown",
        changedFiles: [],
        env: {},
      }),
    ).toBe(true);
  });

  it("parses pytest JUnit XML into a suite", async () => {
    const xmlPath = path.join(tmpDir, "sites", "exp.arolariu.ro", ".pytest-cache", "hygiene-junit.xml");
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockImplementation(async () => {
        await fs.mkdir(path.dirname(xmlPath), {recursive: true});
        await fs.writeFile(xmlPath, samplePytestXml, "utf-8");
        return {exitCode: 1, stdout: "", stderr: ""};
      }),
    }));
    const {testPythonProvider} = await import("./testPythonProvider.ts");
    const result = await testPythonProvider.run({
      workspaceRoot: tmpDir,
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "unknown",
      changedFiles: [],
      env: {},
    });
    expect(result.payload.suites).toHaveLength(1);
    expect(result.payload.suites[0]?.name).toBe("python");
    expect(result.payload.totalTests).toBe(3);
    expect(result.payload.failed).toBe(1);
    const f = result.findings[0];
    if (f?.kind === "line") {
      expect(f.suite).toBe("python");
      expect(f.file).toBe("tests/test_api.py");
    }
  });

  it("emits runner-failed synthetic suite when no JUnit XML is produced", async () => {
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockResolvedValue({exitCode: 1, stdout: "", stderr: "python missing"}),
    }));
    const {testPythonProvider} = await import("./testPythonProvider.ts");
    const result = await testPythonProvider.run({
      workspaceRoot: tmpDir,
      baseRef: "main",
      headRef: "HEAD",
      changeScope: "unknown",
      changedFiles: [],
      env: {},
    });
    expect(result.payload.suites[0]?.name).toBe("python");
    expect(result.payload.failed).toBe(1);
    const f = result.findings[0];
    if (f?.kind === "line") {
      expect(f.ruleId).toBe("python/runner-failed");
    }
  });
});
