/**
 * @fileoverview Test check module for hygiene pipeline.
 * @module github/scripts/src/hygiene/checks/testCheck
 *
 * @remarks
 * Runs unit tests via `npm run test:unit` (NX runner) and produces structured results.
 * Captures test statistics from output parsing and coverage data from coverage-summary.json.
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
 * Path to coverage summary (relative to workspace root)
 */
const COVERAGE_SUMMARY_PATH = "coverage/vitest/coverage-summary.json";

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
 * Parsed test statistics from Vitest output
 */
interface ParsedTestStats {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failedTestNames: string[];
}

/**
 * Parses Vitest console output to extract test statistics
 *
 * @param output - The stdout/stderr from vitest run
 * @returns Parsed test statistics
 */
function parseVitestOutput(output: string): ParsedTestStats {
  const stats: ParsedTestStats = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    failedTestNames: [],
  };

  // Vitest summary format: "Tests  204 passed (204)" or "Tests  5 passed | 2 failed (7)"
  const vitestSummary = output.match(/Tests\s+(\d+)\s+passed(?:\s*\|\s*(\d+)\s+failed)?(?:\s*\|\s*(\d+)\s+skipped)?/);
  if (vitestSummary) {
    stats.passed += parseInt(vitestSummary[1] ?? "0", 10);
    stats.failed += parseInt(vitestSummary[2] ?? "0", 10);
    stats.skipped += parseInt(vitestSummary[3] ?? "0", 10);
  }

  // Also match "Test Files  N passed (N)" for file count (informational)
  // But we care about individual test counts above

  // Parse duration: "Duration  1.23s" or "Time: 1.23s"
  const durationMatch = output.match(/(?:Duration|Time)[:\s]+(\d+(?:\.\d+)?)\s*s/i);
  if (durationMatch) {
    stats.duration = Math.round(parseFloat(durationMatch[1] ?? "0") * 1000);
  }

  // Extract failed test names from Vitest output
  const failedTestMatches = output.matchAll(/FAIL\s+(.+?)\s+>\s+(.+)/g);
  for (const match of failedTestMatches) {
    stats.failedTestNames.push(match[2] ?? "Unknown test");
  }

  stats.totalTests = stats.passed + stats.failed + stats.skipped;
  return stats;
}

/**
 * Parses .NET xUnit/MSTest output to extract test statistics
 *
 * @param output - The stdout/stderr from dotnet test
 * @returns Parsed test statistics
 */
function parseDotnetOutput(output: string): ParsedTestStats {
  const stats: ParsedTestStats = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    failedTestNames: [],
  };

  // .NET test output: "Passed!  - Failed:     0, Passed:  1033, Skipped:     0, Total:  1033, Duration: 2 s"
  // There may be multiple such lines (one per test assembly)
  const dotnetMatches = output.matchAll(/(?:Passed!|Failed!)\s*-\s*Failed:\s*(\d+),\s*Passed:\s*(\d+),\s*Skipped:\s*(\d+),\s*Total:\s*(\d+)(?:,\s*Duration:\s*(\d+)\s*s)?/g);
  for (const match of dotnetMatches) {
    stats.failed += parseInt(match[1] ?? "0", 10);
    stats.passed += parseInt(match[2] ?? "0", 10);
    stats.skipped += parseInt(match[3] ?? "0", 10);
    stats.totalTests += parseInt(match[4] ?? "0", 10);
    if (match[5]) {
      stats.duration += parseInt(match[5], 10) * 1000;
    }
  }

  return stats;
}

/**
 * Combines test statistics from multiple test runners
 *
 * @param runners - Array of parsed stats from different runners
 * @returns Combined statistics
 */
function combineTestStats(...runners: ParsedTestStats[]): ParsedTestStats {
  const combined: ParsedTestStats = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    failedTestNames: [],
  };
  for (const runner of runners) {
    combined.totalTests += runner.totalTests;
    combined.passed += runner.passed;
    combined.failed += runner.failed;
    combined.skipped += runner.skipped;
    combined.duration = Math.max(combined.duration, runner.duration);
    combined.failedTestNames.push(...runner.failedTestNames);
  }
  return combined;
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

    // Run npm run test:unit which uses nx to run tests across workspace projects
    // This ensures we only run tests for actual projects, not .github/scripts tests
    core.info("Running npm run test:unit...");
    const testResult = await exec.getExecOutput("npm", ["run", "test:unit"], {
      ignoreReturnCode: true,
      silent: false,
    });

    const totalDuration = Math.round(performance.now() - startTime);

    // Parse test statistics from output (supports both Vitest and .NET xUnit)
    const combinedOutput = testResult.stdout + "\n" + testResult.stderr;
    const vitestStats = parseVitestOutput(combinedOutput);
    const dotnetStats = parseDotnetOutput(combinedOutput);
    const parsedStats = combineTestStats(vitestStats, dotnetStats);

    // Use parsed duration or fallback to total duration
    const testDuration = parsedStats.duration > 0 ? parsedStats.duration : totalDuration;

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

    // Build test summary
    const testSummary: TestSummary = {
      totalFiles: 0, // Not available from output parsing
      totalSuites: 0, // Not available from output parsing
      totalTests: parsedStats.totalTests,
      passed: parsedStats.passed,
      failed: parsedStats.failed,
      skipped: parsedStats.skipped,
      todo: 0,
      duration: testDuration,
    };

    let result: HygieneCheckResult;

    if (testResult.exitCode === 0) {
      core.info("✅ All tests passed");

      result = createSuccessResult(
        "test",
        testSummary.totalTests > 0 ? `All ${testSummary.totalTests} tests passed` : "Tests passed",
        totalDuration,
        {
          testSummary,
          failedTests: [],
          coverage,
        },
      );
    } else {
      core.warning("❌ Tests failed");

      // Build failed tests list from parsed names
      const failedTests: TestResult[] = parsedStats.failedTestNames.map((name) => ({
        file: "unknown",
        suite: "",
        name,
        status: "failed" as const,
        duration: 0,
        error: "See test output for details",
      }));

      result = createFailureResult(
        "test",
        testSummary.failed > 0
          ? `${testSummary.failed} of ${testSummary.totalTests} tests failed`
          : "Tests failed (see output for details)",
        totalDuration,
        {
          testSummary,
          failedTests,
          coverage,
        },
      );
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
