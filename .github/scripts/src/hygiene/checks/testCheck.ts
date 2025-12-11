/**
 * @fileoverview Test check module for hygiene pipeline
 * @module hygiene/checks/testCheck
 *
 * Runs Vitest unit tests with JSON reporter and produces structured results.
 * Captures test statistics, failed tests, and coverage data.
 *
 * @example
 * ```typescript
 * import { runTestCheck } from './testCheck.ts';
 * const result = await runTestCheck();
 * // Writes test-result.json to artifacts directory
 * ```
 */

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import {
  type CoverageSummary,
  type HygieneCheckResult,
  type TestResult,
  type TestSummary,
  createErrorResult,
  createFailureResult,
  createSuccessResult,
} from "../types.ts";

/**
 * Artifact output directory (relative to workspace root)
 */
const ARTIFACT_DIR = "artifacts/hygiene";

/**
 * Artifact filename for test check results
 */
const ARTIFACT_FILENAME = "test-result.json";

/**
 * Path to Vitest JSON output (relative to workspace root)
 */
const VITEST_JSON_OUTPUT = "artifacts/vitest-output.json";

/**
 * Path to coverage summary (relative to workspace root)
 */
const COVERAGE_SUMMARY_PATH = "coverage/vitest/coverage-summary.json";

/**
 * Vitest JSON reporter output structure
 */
interface VitestJsonOutput {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numPendingTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  startTime: number;
  success: boolean;
  testResults: VitestTestFileResult[];
}

interface VitestTestFileResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  startTime: number;
  endTime: number;
  assertionResults: VitestAssertionResult[];
}

interface VitestAssertionResult {
  ancestorTitles: string[];
  fullName: string;
  status: "passed" | "failed" | "pending" | "todo";
  title: string;
  duration: number;
  failureMessages: string[];
}

/**
 * Coverage summary JSON structure
 */
interface CoverageSummaryJson {
  total: {
    lines: {total: number; covered: number; pct: number};
    statements: {total: number; covered: number; pct: number};
    functions: {total: number; covered: number; pct: number};
    branches: {total: number; covered: number; pct: number};
  };
}

/**
 * Runs the test check and produces a result artifact
 *
 * @returns The test check result
 */
export async function runTestCheck(): Promise<HygieneCheckResult> {
  const startTime = performance.now();
  const workspaceRoot = process.env["GITHUB_WORKSPACE"] ?? process.cwd();

  try {
    core.info("🧪 Starting test check...");

    // Ensure artifacts directory exists for vitest output
    const vitestOutputPath = path.join(workspaceRoot, VITEST_JSON_OUTPUT);
    await fs.mkdir(path.dirname(vitestOutputPath), {recursive: true});

    // Run vitest with JSON reporter
    core.info("Running npm run test:unit with JSON reporter...");
    const testResult = await exec.getExecOutput(
      "npx",
      ["vitest", "run", "--reporter=json", `--outputFile=${vitestOutputPath}`, "--coverage"],
      {
        ignoreReturnCode: true,
        silent: false,
      },
    );

    const duration = Math.round(performance.now() - startTime);

    // Parse Vitest JSON output
    let vitestOutput: VitestJsonOutput | null = null;
    try {
      const jsonContent = await fs.readFile(vitestOutputPath, "utf-8");
      vitestOutput = JSON.parse(jsonContent) as VitestJsonOutput;
    } catch (parseError) {
      core.warning(`Could not parse Vitest JSON output: ${(parseError as Error).message}`);
    }

    // Parse coverage if available
    let coverage: CoverageSummary | undefined;
    try {
      const coveragePath = path.join(workspaceRoot, COVERAGE_SUMMARY_PATH);
      const coverageContent = await fs.readFile(coveragePath, "utf-8");
      const coverageJson = JSON.parse(coverageContent) as CoverageSummaryJson;

      coverage = {
        lines: {
          total: coverageJson.total.lines.total,
          covered: coverageJson.total.lines.covered,
          percentage: coverageJson.total.lines.pct,
        },
        statements: {
          total: coverageJson.total.statements.total,
          covered: coverageJson.total.statements.covered,
          percentage: coverageJson.total.statements.pct,
        },
        functions: {
          total: coverageJson.total.functions.total,
          covered: coverageJson.total.functions.covered,
          percentage: coverageJson.total.functions.pct,
        },
        branches: {
          total: coverageJson.total.branches.total,
          covered: coverageJson.total.branches.covered,
          percentage: coverageJson.total.branches.pct,
        },
      };
    } catch {
      core.info("Coverage summary not available");
    }

    let result: HygieneCheckResult;

    if (testResult.exitCode === 0 && vitestOutput?.success !== false) {
      core.info("✅ All tests passed");

      const testSummary: TestSummary = vitestOutput
        ? {
            totalFiles: vitestOutput.testResults.length,
            totalSuites: vitestOutput.numTotalTestSuites,
            totalTests: vitestOutput.numTotalTests,
            passed: vitestOutput.numPassedTests,
            failed: vitestOutput.numFailedTests,
            skipped: vitestOutput.numPendingTests,
            todo: vitestOutput.numTodoTests,
            duration,
          }
        : {
            totalFiles: 0,
            totalSuites: 0,
            totalTests: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            todo: 0,
            duration,
          };

      result = createSuccessResult("test", `All ${testSummary.totalTests} tests passed`, duration, {
        testSummary,
        failedTests: [],
        coverage,
      });
    } else {
      core.warning("❌ Tests failed");

      // Extract failed tests
      const failedTests: TestResult[] = [];

      if (vitestOutput) {
        for (const file of vitestOutput.testResults) {
          for (const assertion of file.assertionResults) {
            if (assertion.status === "failed") {
              failedTests.push({
                file: file.name,
                suite: assertion.ancestorTitles.join(" > "),
                name: assertion.title,
                status: "failed",
                duration: assertion.duration,
                error: assertion.failureMessages.join("\n"),
              });
            }
          }
        }
      }

      const testSummary: TestSummary = vitestOutput
        ? {
            totalFiles: vitestOutput.testResults.length,
            totalSuites: vitestOutput.numTotalTestSuites,
            totalTests: vitestOutput.numTotalTests,
            passed: vitestOutput.numPassedTests,
            failed: vitestOutput.numFailedTests,
            skipped: vitestOutput.numPendingTests,
            todo: vitestOutput.numTodoTests,
            duration,
          }
        : {
            totalFiles: 0,
            totalSuites: 0,
            totalTests: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            todo: 0,
            duration,
          };

      result = createFailureResult("test", `${testSummary.failed} of ${testSummary.totalTests} tests failed`, duration, {
        testSummary,
        failedTests,
        coverage,
      });
    }

    // Write artifact
    await writeArtifact(result);

    return result;
  } catch (error) {
    const err = error as Error;
    const duration = Math.round(performance.now() - startTime);

    core.error(`❌ Test check failed: ${err.message}`);

    const result = createErrorResult("test", err, duration);
    await writeArtifact(result);

    return result;
  }
}

/**
 * Writes the result to the artifact directory
 */
async function writeArtifact(result: HygieneCheckResult): Promise<void> {
  const workspaceRoot = process.env["GITHUB_WORKSPACE"] ?? process.cwd();
  const artifactDir = path.join(workspaceRoot, ARTIFACT_DIR);
  const artifactPath = path.join(artifactDir, ARTIFACT_FILENAME);

  // Ensure directory exists
  await fs.mkdir(artifactDir, {recursive: true});

  // Write JSON file
  await fs.writeFile(artifactPath, JSON.stringify(result, null, 2), "utf-8");

  core.info(`📦 Wrote artifact: ${artifactPath}`);
}

/**
 * Entry point when run directly
 */
export default runTestCheck;
