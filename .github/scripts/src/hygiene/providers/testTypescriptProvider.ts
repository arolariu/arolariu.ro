/**
 * @fileoverview TypeScript unit tests provider (all Vitest suites in the monorepo).
 * @module github/scripts/src/hygiene/providers/testTypescriptProvider
 *
 * @remarks
 * Runs Vitest in each TypeScript project that has a `vitest.config.ts` and
 * aggregates per-project results into a single TestSuitesPayload. Each project
 * becomes its own SuiteResult so the PR comment surfaces per-project
 * sub-sections (scripts / website / components / cv / status).
 *
 * Each suite is run by invoking `npx vitest run --reporter=json` directly in
 * the project's directory (rather than via `nx run`) to:
 *   - Avoid nx target-specifier ambiguity warnings
 *   - Get deterministic, parseable JSON from an explicit per-run output file
 *   - Allow per-project parallelism via Promise.all
 */

import * as exec from "@actions/exec";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import * as path from "node:path";
import {suitesForTypeScriptChanges, type TypeScriptSuiteName} from "../domain/changedFiles.ts";
import type {CheckProvider, ProviderRunInput, ProviderRunOutput} from "../domain/provider.ts";
import {
  aggregateSuites,
  extractLastVitestReport,
  flattenSuiteFindings,
  testSuitesPayloadSchema,
  vitestReportToSuiteResult,
  type SuiteResult,
  type TestSuitesPayload,
} from "./_testHelpers.ts";

/**
 * TypeScript / Vitest suites included by this provider. Add new Vitest
 * projects here as `[suiteName, projectDirRelativeToWorkspaceRoot]`.
 */
export const TYPESCRIPT_SUITES: ReadonlyArray<readonly [TypeScriptSuiteName, string]> = [
  ["scripts", path.join(".github", "scripts")],
  ["website", path.join("sites", "arolariu.ro")],
  ["cv", path.join("sites", "cv.arolariu.ro")],
  ["status", path.join("sites", "status.arolariu.ro")],
  ["components", path.join("packages", "components")],
];

async function runSuite(name: string, projectDirRel: string, workspaceRoot: string): Promise<SuiteResult> {
  const cwd = path.join(workspaceRoot, projectDirRel);
  const reportDirectory = await mkdtemp(path.join(tmpdir(), "arolariu-hygiene-vitest-"));
  try {
    const reportPath = path.join(reportDirectory, "report.json");
    const result = await exec.getExecOutput("npx", ["vitest", "run", "--reporter=json", "--outputFile", reportPath], {
      cwd,
      ignoreReturnCode: true,
      silent: true,
    });
    let reportSource: string;
    try {
      reportSource = await readFile(reportPath, "utf8");
    } catch (error: unknown) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
      reportSource = result.stdout;
    }

    const report = extractLastVitestReport(reportSource);
    if (!report) {
      return {
        name,
        totalTests: 1,
        passed: 0,
        failed: 1,
        skipped: 0,
        findings: [
          {
            kind: "line",
            severity: "error",
            file: `<vitest in ${projectDirRel}>`,
            line: 1,
            column: 1,
            message: `vitest produced no JSON report. exit ${result.exitCode}. stderr: ${result.stderr.substring(0, 300)}`,
            ruleId: `${name}/runner-failed`,
            suite: name,
          },
        ],
      };
    }
    const suite = vitestReportToSuiteResult(name, report);
    if (result.exitCode === 0 || suite.findings.some((finding) => finding.severity === "error")) return suite;

    return {
      ...suite,
      findings: [
        ...suite.findings,
        {
          kind: "line",
          severity: "error",
          file: `<vitest in ${projectDirRel}>`,
          line: 1,
          column: 1,
          message: `vitest exited with code ${result.exitCode} despite reporting no failed assertions. stderr: ${result.stderr.substring(0, 300)}`,
          ruleId: `${name}/runner-failed`,
          suite: name,
        },
      ],
    };
  } finally {
    await rm(reportDirectory, {recursive: true, force: true});
  }
}

export const testTypescriptProvider: CheckProvider<TestSuitesPayload> = {
  id: "test-typescript",
  name: "TypeScript Unit Tests",
  icon: "🟦",
  defaultGate: {kind: "blocking", blockOn: "error"},
  payloadSchema: testSuitesPayloadSchema,
  applicableTo: (input) => {
    const suites = suitesForTypeScriptChanges(input);
    return suites === null || suites.length > 0;
  },
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<TestSuitesPayload>> {
    // Run all TypeScript suites in parallel. One slow / failing suite does not
    // gate the others; each contributes its own SuiteResult to the payload.
    const selectedSuites = suitesForTypeScriptChanges(input);
    const suitesToRun = selectedSuites === null ? TYPESCRIPT_SUITES : TYPESCRIPT_SUITES.filter(([name]) => selectedSuites.includes(name));
    const suiteResults = await Promise.all(suitesToRun.map(([name, dir]) => runSuite(name, dir, input.workspaceRoot)));
    return {
      payload: aggregateSuites(suiteResults),
      findings: flattenSuiteFindings(suiteResults),
    };
  },
};
