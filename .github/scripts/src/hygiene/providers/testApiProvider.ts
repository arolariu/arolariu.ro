/**
 * @fileoverview Test provider for the @arolariu/api .NET / xUnit tests.
 * @module github/scripts/src/hygiene/providers/testApiProvider
 *
 * @remarks
 * Runs `dotnet test arolariu.slnx --configuration Release --logger trx` and
 * parses the produced .trx file(s) into per-suite results. One suite per
 * .trx file found under `TestResults/`.
 */

import * as exec from "@actions/exec";
import fs from "node:fs/promises";
import * as path from "node:path";
import type {CheckProvider, ProviderRunInput, ProviderRunOutput} from "../domain/provider.ts";
import {
  aggregateSuites,
  flattenSuiteFindings,
  parseTrxToSuiteResult,
  testSuitesPayloadSchema,
  type SuiteResult,
  type TestSuitesPayload,
} from "./_testHelpers.ts";

const API_DIR = path.join("sites", "api.arolariu.ro");
const TEST_RESULTS_REL = path.join(API_DIR, "TestResults");

/**
 * Recursively finds files matching the predicate under root. Returns absolute paths.
 * Tolerates missing root directory (returns []).
 */
async function findFiles(root: string, matcher: (name: string) => boolean): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(root, {withFileTypes: true});
  } catch {
    return [];
  }
  const results: string[] = [];
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findFiles(full, matcher));
    } else if (entry.isFile() && matcher(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

export const testApiProvider: CheckProvider<TestSuitesPayload> = {
  id: "test-api",
  name: "Tests · API (.NET)",
  icon: "🧪",
  defaultGate: {kind: "blocking", blockOn: "error"},
  payloadSchema: testSuitesPayloadSchema,
  applicableTo: () => true,
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<TestSuitesPayload>> {
    const trxDirAbs = path.join(input.workspaceRoot, TEST_RESULTS_REL);
    // Clean prior TRX so we only see this run's output.
    await fs.rm(trxDirAbs, {recursive: true, force: true}).catch(() => {});

    await exec.getExecOutput(
      "dotnet",
      [
        "test",
        "arolariu.slnx",
        "--configuration", "Release",
        "--logger", `trx;LogFilePrefix=hygiene`,
        "--results-directory", TEST_RESULTS_REL,
        "--nologo",
        "--verbosity", "quiet",
      ],
      {cwd: input.workspaceRoot, ignoreReturnCode: true, silent: true},
    );

    const trxFiles = await findFiles(trxDirAbs, (n) => n.endsWith(".trx"));
    if (trxFiles.length === 0) {
      // Surface a synthetic "runner-failed" suite so the PR comment shows
      // something actionable instead of silently passing with 0 tests.
      const suite: SuiteResult = {
        name: "api",
        totalTests: 1,
        passed: 0,
        failed: 1,
        skipped: 0,
        findings: [{
          kind: "line",
          severity: "error",
          file: "<dotnet test>",
          line: 1,
          column: 1,
          message: "dotnet test produced no .trx files (check setup-dotnet / restore steps in the workflow).",
          ruleId: "api/runner-failed",
          suite: "api",
        }],
      };
      return {payload: aggregateSuites([suite]), findings: flattenSuiteFindings([suite])};
    }

    // One TRX file per test project. Use the file stem as the suite name.
    const suites: SuiteResult[] = [];
    for (const trxFile of trxFiles) {
      const xml = await fs.readFile(trxFile, "utf-8");
      const suiteName = path.basename(trxFile, ".trx").replace(/^hygiene[._-]/, "");
      suites.push(parseTrxToSuiteResult(suiteName || "api", xml));
    }
    return {payload: aggregateSuites(suites), findings: flattenSuiteFindings(suites)};
  },
};
