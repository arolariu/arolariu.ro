/**
 * @fileoverview Test provider for the `.github/scripts/` Vitest project.
 * @module github/scripts/src/hygiene/providers/testScriptsProvider
 *
 * @remarks
 * One of four test providers. Runs Vitest in the .github/scripts directory
 * (where the hygiene system's own code lives) and emits a single-suite
 * TestSuitesPayload.
 */

import * as exec from "@actions/exec";
import * as path from "node:path";
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

const SUITE_NAME = "scripts";

export const testScriptsProvider: CheckProvider<TestSuitesPayload> = {
  id: "test-scripts",
  name: "Tests · Scripts",
  icon: "🧪",
  defaultGate: {kind: "blocking", blockOn: "error"},
  payloadSchema: testSuitesPayloadSchema,
  applicableTo: () => true,
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<TestSuitesPayload>> {
    const cwd = path.join(input.workspaceRoot, ".github", "scripts");
    const result = await exec.getExecOutput(
      "npx",
      ["vitest", "run", "--reporter=json"],
      {cwd, ignoreReturnCode: true, silent: true},
    );

    const report = extractLastVitestReport(result.stdout);
    if (!report) {
      throw new Error(
        `Failed to extract Vitest JSON report from .github/scripts. ` +
        `exit ${result.exitCode}. stderr: ${result.stderr.substring(0, 500)}`,
      );
    }
    const suite: SuiteResult = vitestReportToSuiteResult(SUITE_NAME, report);
    return {
      payload: aggregateSuites([suite]),
      findings: flattenSuiteFindings([suite]),
    };
  },
};
