import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

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

describe("testExpProvider", () => {
  let tmpDir: string;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "exp-test-"));
    vi.resetModules();
  });
  afterEach(async () => {
    await fs.rm(tmpDir, {recursive: true, force: true});
  });

  it("has stable identity fields", async () => {
    const {testExpProvider} = await import("./testExpProvider.ts");
    expect(testExpProvider.id).toBe("test-exp");
    expect(testExpProvider.name).toBe("Tests · Exp (Python)");
    expect(testExpProvider.defaultGate).toEqual({kind: "blocking", blockOn: "error"});
  });

  it("parses pytest JUnit XML output into a suite", async () => {
    // testExpProvider deletes the junit file before running, so the mocked
    // exec must write it as a side effect.
    const xmlPath = path.join(tmpDir, "sites", "exp.arolariu.ro", ".pytest-cache", "hygiene-junit.xml");
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockImplementation(async () => {
        await fs.mkdir(path.dirname(xmlPath), {recursive: true});
        await fs.writeFile(xmlPath, samplePytestXml, "utf-8");
        return {exitCode: 1, stdout: "", stderr: ""};
      }),
    }));
    const {testExpProvider} = await import("./testExpProvider.ts");
    const result = await testExpProvider.run({
      workspaceRoot: tmpDir, baseRef: "main", headRef: "HEAD", changedFiles: [], env: {},
    });
    expect(result.payload.suites).toHaveLength(1);
    expect(result.payload.suites[0]?.name).toBe("exp");
    expect(result.payload.totalTests).toBe(3);
    expect(result.payload.passed).toBe(2);
    expect(result.payload.failed).toBe(1);
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    if (f?.kind === "line") {
      expect(f.suite).toBe("exp");
      expect(f.file).toBe("tests/test_api.py");
      expect(f.line).toBe(20);
    }
  });

  it("emits a runner-failed synthetic suite when no JUnit XML is produced", async () => {
    vi.doMock("@actions/exec", () => ({
      getExecOutput: vi.fn().mockResolvedValue({exitCode: 1, stdout: "", stderr: "python missing"}),
    }));
    const {testExpProvider} = await import("./testExpProvider.ts");
    const result = await testExpProvider.run({
      workspaceRoot: tmpDir, baseRef: "main", headRef: "HEAD", changedFiles: [], env: {},
    });
    expect(result.payload.suites).toHaveLength(1);
    expect(result.payload.suites[0]?.name).toBe("exp");
    expect(result.payload.failed).toBe(1);
    const f = result.findings[0];
    if (f?.kind === "line") {
      expect(f.ruleId).toBe("exp/runner-failed");
    }
  });
});
