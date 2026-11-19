import {spawnSync} from "node:child_process";
import {mkdtempSync, readFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {describe, expect, it} from "vitest";

const root = resolve(import.meta.dirname, "..", "sites", "status.arolariu.ro");
const latencyTest = "src/lib/aggregation/computeAvgLatency.test.ts";
const subprocessTimeout = 15_000;

function runStatusTests(args: readonly string[]): unknown {
  const directory = mkdtempSync(join(tmpdir(), "status-vitest-runner-"));
  const output = join(directory, "report.json");
  try {
    const {status, stderr, error} = spawnSync(
      process.execPath,
      ["tests/unit-coverage/run-unit.ts", "--no-coverage", "--retry=0", "--reporter=json", "--outputFile", output, ...args],
      {cwd: root, encoding: "utf8", timeout: subprocessTimeout},
    );
    expect(error, stderr).toBeUndefined();
    expect(status, stderr).toBe(0);
    return JSON.parse(readFileSync(output, "utf8"));
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
}

describe("Status Vitest runner", () => {
  it(
    "runs only the selected test when given a file and line",
    () => {
      const source = readFileSync(join(root, latencyTest), "utf8");
      const line = source.split(/\r?\n/u).findIndex((text) => text.includes('it("averages p50 across buckets"')) + 1;
      expect(line).toBeGreaterThan(0);

      const report = runStatusTests([`${latencyTest}:${line}`]);

      expect(report).toMatchObject({numPassedTests: 1, numPendingTests: 1});
    },
    subprocessTimeout + 5_000,
  );

  it(
    "adds a CLI exclusion without replacing the configured project exclusions",
    () => {
      const report = runStatusTests([latencyTest, "formatDuration.test.ts", "--exclude=**/formatDuration.test.ts"]);

      expect(report).toMatchObject({
        numPassedTests: 2,
        testResults: [{name: expect.stringContaining(latencyTest)}],
      });
    },
    subprocessTimeout + 5_000,
  );
});
