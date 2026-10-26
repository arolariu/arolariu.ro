/**
 * @fileoverview Pytest provider retaining nonzero execution and genuine JUnit counters.
 * @module github/scripts/src/hygiene/providers/testPythonProvider
 */
import * as exec from "../../../helpers/sdk/exec.ts";
import {fs} from "../../../helpers/filesystem/index.ts";
import {parseJUnitXml} from "../../../helpers/reports/junit.ts";
import {MAX_REPORT_BYTES} from "../../../helpers/reports/validation.ts";
import * as path from "node:path";
import {touchesPython} from "../domain/changedFiles.ts";
import type {CheckProvider, ProviderRunInput, ProviderRunOutput} from "../../../lib/hygiene/contracts.ts";
import {providerDescriptor} from "../../../lib/hygiene/registry.ts";
import {
  aggregateSuites,
  flattenSuiteFindings,
  jUnitSuitesToResult,
  runnerErrorSuite,
  testSuitesPayloadSchema,
  type TestSuitesPayload,
} from "../../../lib/testing/suites.ts";

const EXP_DIR = path.join("sites", "exp.arolariu.ro");
const JUNIT_REL = path.join(EXP_DIR, ".pytest-cache", "hygiene-junit.xml");

/** Executes pytest with bounded report reads and no fabricated runner-failure test. */
export const testPythonProvider: CheckProvider<TestSuitesPayload> = {
  ...providerDescriptor("test-python"),
  payloadSchema: testSuitesPayloadSchema,
  applicableTo: touchesPython,
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<TestSuitesPayload>> {
    const file = path.join(input.workspaceRoot, JUNIT_REL);
    const cwd = path.join(input.workspaceRoot, EXP_DIR);
    await fs.remove(file, {recursive: false, force: true});
    await fs.ensureDirectory(path.dirname(file));
    const result = await exec.getExecOutput("python", ["-m", "pytest", "-q", `--junitxml=${path.relative(cwd, file)}`], {
      cwd,
      ignoreReturnCode: true,
      silent: true,
    });
    if (!(await fs.exists(file))) {
      const suite = runnerErrorSuite("python", "<pytest>", `pytest produced no JUnit XML report (exit code ${result.exitCode}).`);
      return {payload: aggregateSuites([suite]), findings: suite.findings, executionStatus: "errored", evidenceStatus: "missing"};
    }
    const raw = parseJUnitXml(await fs.readTextBounded(file, MAX_REPORT_BYTES));
    const suites =
      raw.length === 1 ? [jUnitSuitesToResult("python", raw)] : raw.map((suite) => jUnitSuitesToResult(suite.name || "python", [suite]));
    const payload = aggregateSuites(suites);
    const findings = flattenSuiteFindings(suites);
    if (result.exitCode !== 0 && payload.failed === 0) {
      findings.push(
        ...runnerErrorSuite(
          "python",
          "<pytest>",
          `pytest exited with code ${result.exitCode} despite the available passing assertions. ${result.stderr.slice(-4000)}`,
        ).findings,
      );
      return {payload, findings, executionStatus: "errored", evidenceStatus: "partial"};
    }
    return {
      payload,
      findings,
      executionStatus: result.exitCode !== 0 || payload.failed > 0 ? "failed" : "passed",
      evidenceStatus: "complete",
    };
  },
};
