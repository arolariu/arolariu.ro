import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {fs} from "../../helpers/filesystem/index.ts";
import {decodeVitestReport} from "../../helpers/reports/vitest.ts";
import {extractLastVitestReport, parseTrxToSuiteResult, testSuitesPayloadSchema, vitestReportToSuiteResult} from "./suites.ts";

describe("shared suite normalization", () => {
  it("validates suite counters and findings instead of trusting a cast payload", () => {
    const suite = {
      name: "scripts",
      totalTests: 1,
      passed: 0,
      failed: 1,
      skipped: 0,
      findings: [{kind: "line", severity: "error", file: "example.ts", line: 1, column: 1, message: "failed"}],
    };
    const payload = {totalTests: 1, passed: 0, failed: 1, skipped: 0, suites: [suite]};
    expect(testSuitesPayloadSchema.parse(payload)).toEqual(payload);
    expect(() => testSuitesPayloadSchema.parse({...payload, passed: 10})).toThrow();
    expect(() => testSuitesPayloadSchema.parse({...payload, suites: [{...suite, findings: [{kind: "line", line: -1}]}]})).toThrow();
    expect(() => testSuitesPayloadSchema.parse({...payload, suites: [{...suite, failed: "1"}]})).toThrow();
  });
  it("never counts Error, Aborted, or unknown TRX outcomes as passing", () => {
    for (const outcome of ["Error", "Aborted", "Unknown"]) {
      expect(
        parseTrxToSuiteResult("dotnet", `<TestRun><Results><UnitTestResult testName="one" outcome="${outcome}"/></Results></TestRun>`),
      ).toMatchObject({passed: 0, failed: 1});
    }
  });
  it("normalizes serialized Vitest pending/todo and preserves failure locations", async () => {
    const raw = await fs.readJson<unknown>(fileURLToPath(new URL("../../helpers/reports/fixtures/vitest.json", import.meta.url)));
    const report = decodeVitestReport(raw);
    const suite = vitestReportToSuiteResult("scripts", report);
    expect(suite).toMatchObject({totalTests: 4, passed: 1, failed: 1, skipped: 2});
    expect(suite.findings[0]).toMatchObject({file: "example.test.ts", line: 12, column: 3});
    expect(extractLastVitestReport(`npm preamble\n${JSON.stringify(report)}\nnoise\n${JSON.stringify(report)}`)).toEqual(report);
  });
});
