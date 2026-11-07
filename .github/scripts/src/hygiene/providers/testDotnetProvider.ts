/**
 * @fileoverview .NET provider preserving command status and real TRX evidence.
 * @module github/scripts/src/hygiene/providers/testDotnetProvider
 */
import * as exec from "../../../helpers/sdk/exec.ts";
import {fs} from "../../../helpers/filesystem/index.ts";
import {MAX_REPORT_BYTES} from "../../../helpers/reports/validation.ts";
import * as path from "node:path";
import {touchesBackend} from "../domain/changedFiles.ts";
import type {CheckProvider, ProviderRunInput, ProviderRunOutput} from "../../../lib/hygiene/contracts.ts";
import {providerDescriptor} from "../../../lib/hygiene/registry.ts";
import {
  aggregateSuites,
  flattenSuiteFindings,
  parseTrxToSuiteResult,
  runnerErrorSuite,
  testSuitesPayloadSchema,
  type SuiteResult,
  type TestSuitesPayload,
} from "../../../lib/testing/suites.ts";

const API_DIR = path.join("sites", "api.arolariu.ro");
const TEST_RESULTS_REL = path.join(API_DIR, "TestResults");

/** Executes the existing solution command; operational failures do not become fake tests. */
export const testDotnetProvider: CheckProvider<TestSuitesPayload> = {
  ...providerDescriptor("test-dotnet"),
  payloadSchema: testSuitesPayloadSchema,
  applicableTo: touchesBackend,
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<TestSuitesPayload>> {
    const root = path.join(input.workspaceRoot, TEST_RESULTS_REL);
    await fs.remove(root, {recursive: true, force: true});
    const result = await exec.getExecOutput(
      "dotnet",
      [
        "test",
        "arolariu.slnx",
        "--configuration",
        "Release",
        "--logger",
        "trx;LogFilePrefix=hygiene",
        "--results-directory",
        TEST_RESULTS_REL,
        "--nologo",
        "--verbosity",
        "quiet",
      ],
      {cwd: input.workspaceRoot, ignoreReturnCode: true, silent: true},
    );
    const reports = (await fs.exists(root)) ? await fs.find(root, /\.trx$/) : [];
    if (reports.length === 0) {
      const suite = runnerErrorSuite("dotnet", "<dotnet test>", `dotnet test produced no .trx files (exit code ${result.exitCode}).`);
      return {payload: aggregateSuites([suite]), findings: suite.findings, executionStatus: "errored", evidenceStatus: "missing"};
    }
    const suites: SuiteResult[] = [];
    for (const file of reports) {
      const name = path.basename(file, ".trx").replace(/^hygiene[._-]/, "") || "dotnet";
      suites.push(parseTrxToSuiteResult(name, await fs.readTextBounded(file, MAX_REPORT_BYTES)));
    }
    const payload = aggregateSuites(suites);
    const findings = flattenSuiteFindings(suites);
    if (result.exitCode !== 0 && payload.failed === 0) {
      findings.push(
        ...runnerErrorSuite(
          "dotnet",
          "<dotnet test>",
          `dotnet test exited with code ${result.exitCode} despite the available passing assertions. ${result.stderr.slice(-4000)}`,
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
