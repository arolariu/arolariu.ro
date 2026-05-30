/**
 * @fileoverview Test provider for the frontend Vitest projects.
 * @module github/scripts/src/hygiene/providers/testFrontendProvider
 *
 * @remarks
 * Runs Vitest individually for each frontend nx project (website, components,
 * cv, status), then aggregates per-project results into a single
 * TestSuitesPayload. Each project becomes its own SuiteResult so the PR comment
 * surfaces per-project sub-sections.
 *
 * Why per-project (not `nx run-many --target=test`)?
 *   - nx run-many concatenates JSON reports across projects but tags only one
 *     of them as "current", so a single match could miss output from other
 *     projects. Running per-project gives us deterministic per-suite parsing.
 *   - Per-project execution lets us cleanly isolate failures and timing.
 *   - If any one project fails to start, we continue with the others.
 */

import * as exec from "@actions/exec";
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

/** Frontend nx projects that use Vitest. Add new Vitest-enabled projects here. */
const FRONTEND_PROJECTS: readonly string[] = ["website", "components", "cv", "status"];

/**
 * Runs `nx run @arolariu/<project>:test:unit -- --reporter=json` and returns
 * the parsed Vitest report, or `null` if the project exited without emitting
 * a parseable JSON report (e.g. because the build failed before tests ran).
 */
async function runFrontendProject(project: string, workspaceRoot: string): Promise<SuiteResult> {
  const result = await exec.getExecOutput(
    "npx",
    ["nx", "run", `@arolariu/${project}:test:unit`, "--", "--reporter=json"],
    {cwd: workspaceRoot, ignoreReturnCode: true, silent: true},
  );

  const report = extractLastVitestReport(result.stdout);
  if (!report) {
    // The project failed before producing a parseable report. Record this as
    // a single failed test so the suite still appears in the PR comment with
    // a clear diagnostic instead of being silently dropped.
    return {
      name: project,
      totalTests: 1,
      passed: 0,
      failed: 1,
      skipped: 0,
      findings: [{
        kind: "line",
        severity: "error",
        file: `<nx target ${project}:test:unit>`,
        line: 1,
        column: 1,
        message: `nx target failed before producing a JSON report. exit ${result.exitCode}. stderr: ${result.stderr.substring(0, 300)}`,
        ruleId: `${project}/runner-failed`,
        suite: project,
      }],
    };
  }
  return vitestReportToSuiteResult(project, report);
}

export const testFrontendProvider: CheckProvider<TestSuitesPayload> = {
  id: "test-frontend",
  name: "Tests · Frontend",
  icon: "🧪",
  defaultGate: {kind: "blocking", blockOn: "error"},
  payloadSchema: testSuitesPayloadSchema,
  applicableTo: () => true,
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<TestSuitesPayload>> {
    // Run all frontend projects in parallel; one slow project shouldn't gate the others.
    const suiteResults = await Promise.all(
      FRONTEND_PROJECTS.map((p) => runFrontendProject(p, input.workspaceRoot)),
    );
    return {
      payload: aggregateSuites(suiteResults),
      findings: flattenSuiteFindings(suiteResults),
    };
  },
};
