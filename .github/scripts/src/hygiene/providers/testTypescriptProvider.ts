/**
 * @fileoverview Sequential Vitest suites using plan-owned dependency-aware selection.
 * @module github/scripts/src/hygiene/providers/testTypescriptProvider
 */
import * as exec from "../../../helpers/sdk/exec.ts";
import {fs, withTemporaryDirectory} from "../../../helpers/filesystem/index.ts";
import {MAX_REPORT_BYTES} from "../../../helpers/reports/validation.ts";
import type {VitestJsonReport} from "../../../helpers/reports/vitest.ts";
import * as path from "node:path";
import {suitesForTypeScriptChanges, type TypeScriptSuiteName} from "../domain/changedFiles.ts";
import type {CheckProvider, EvidenceStatus, ProviderRunInput, ProviderRunOutput} from "../../../lib/hygiene/contracts.ts";
import {providerDescriptor, TYPESCRIPT_SUITE_PROJECTS} from "../../../lib/hygiene/registry.ts";
import {
  aggregateSuites,
  extractLastVitestReport,
  flattenSuiteFindings,
  runnerErrorSuite,
  testSuitesPayloadSchema,
  vitestReportToSuiteResult,
  type SuiteResult,
  type TestSuitesPayload,
} from "../../../lib/testing/suites.ts";

/** Existing CI suite plus root tooling and the four frontend suites, in stable order. */
export const TYPESCRIPT_SUITES: ReadonlyArray<readonly [TypeScriptSuiteName, string]> = TYPESCRIPT_SUITE_PROJECTS.map(({name, root}) => [
  name,
  name === "tooling" ? "" : path.join(...root.split("/")),
]);

interface SuiteExecution {
  readonly suite: SuiteResult;
  readonly executionStatus: "passed" | "failed" | "errored";
  readonly evidenceStatus: EvidenceStatus;
}

async function runSuite(name: TypeScriptSuiteName, directory: string, root: string): Promise<SuiteExecution> {
  return withTemporaryDirectory("arolariu-hygiene-vitest-", async (temporary) => {
    const file = path.join(temporary, "report.json");
    const options = name === "tooling" ? ["--config", path.join("scripts", "vitest.config.ts"), "--pool=forks", "--maxWorkers=4"] : [];
    const result = await exec.getExecOutput(
      "npx",
      ["vitest", "run", ...options, "--coverage.enabled=false", "--reporter=json", "--outputFile", file],
      {
        cwd: path.join(root, directory),
        ignoreReturnCode: true,
        silent: true,
      },
    );
    let report: VitestJsonReport | null;
    try {
      report = extractLastVitestReport((await fs.exists(file)) ? await fs.readTextBounded(file, MAX_REPORT_BYTES) : result.stdout);
    } catch (error) {
      return {
        suite: runnerErrorSuite(
          name,
          `<vitest in ${directory || "."}>`,
          `Invalid Vitest report: ${error instanceof SyntaxError ? "invalid JSON" : error instanceof Error ? error.message : "unknown report error"}`,
        ),
        executionStatus: "errored",
        evidenceStatus: "invalid",
      };
    }
    if (!report)
      return {
        suite: runnerErrorSuite(
          name,
          `<vitest in ${directory || "."}>`,
          `vitest produced no JSON report. exit ${result.exitCode}. stderr: ${result.stderr.slice(-4000)}`,
        ),
        executionStatus: "errored",
        evidenceStatus: "missing",
      };
    const suite = vitestReportToSuiteResult(name, report);
    if (result.exitCode !== 0 && suite.failed === 0) {
      const findings = suite.findings.some((finding) => finding.severity === "error")
        ? suite.findings
        : [
            ...suite.findings,
            ...runnerErrorSuite(
              name,
              `<vitest in ${directory || "."}>`,
              `vitest exited with code ${result.exitCode} despite reporting no failed assertions. stderr: ${result.stderr.slice(-4000)}`,
            ).findings,
          ];
      return {suite: {...suite, findings}, executionStatus: "errored", evidenceStatus: "partial"};
    }
    return {suite, executionStatus: result.exitCode !== 0 || suite.failed > 0 ? "failed" : "passed", evidenceStatus: "complete"};
  });
}

/** Executes requested suites sequentially so each runner retains its existing memory controls. */
export const testTypescriptProvider: CheckProvider<TestSuitesPayload> = {
  ...providerDescriptor("test-typescript"),
  payloadSchema: testSuitesPayloadSchema,
  applicableTo: (input) => {
    const selected = input.selectedSuites ?? suitesForTypeScriptChanges(input);
    return selected === null || selected.length > 0;
  },
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<TestSuitesPayload>> {
    const selected = input.selectedSuites ?? suitesForTypeScriptChanges(input);
    const suites = selected === null ? TYPESCRIPT_SUITES : TYPESCRIPT_SUITES.filter(([name]) => selected.includes(name));
    const results: SuiteExecution[] = [];
    for (const [name, directory] of suites) results.push(await runSuite(name, directory, input.workspaceRoot));
    const normalized = results.map((result) => result.suite);
    const incomplete = results.some((result) => result.evidenceStatus !== "complete");
    return {
      payload: aggregateSuites(normalized),
      findings: flattenSuiteFindings(normalized),
      executionStatus: results.some((result) => result.executionStatus === "errored")
        ? "errored"
        : results.some((result) => result.executionStatus === "failed")
          ? "failed"
          : "passed",
      evidenceStatus: incomplete ? "partial" : "complete",
    };
  },
};
