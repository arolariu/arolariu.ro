import path from "node:path";
import * as fs from "node:fs/promises";
import type { ScriptParams } from "../types";

/**
 * Interface for Jest coverage statistics per category (lines, statements, etc.)
 */
interface CoverageStats {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

/**
 * Interface for Jest coverage summary for a single file or total.
 */
interface CoverageFileSummary {
  lines: CoverageStats;
  statements: CoverageStats;
  functions: CoverageStats;
  branches: CoverageStats;
}

/**
 * Interface for the overall Jest coverage summary object.
 */
interface JestCoverageSummary {
  total: CoverageFileSummary; // For "All files"
  [filePath: string]: CoverageFileSummary; // For individual files, keys are absolute paths
}

/**
 * Interface for Jest snapshot summary.
 */
interface SnapshotSummary {
  added: number;
  didUpdate: boolean;
  failure: boolean;
  filesAdded: number;
  filesRemoved: number;
  filesRemovedList: string[];
  filesUnmatched: number;
  filesUpdated: number;
  matched: number;
  total: number; // Used for "Snapshots: X total"
  unchecked: number;
  uncheckedKeysByFile: Array<{ filePath: string; keys: string[] }>;
  unmatched: number;
  updated: number;
}

/**
 * Interface for Jest performance statistics.
 */
interface PerfStats {
  runtime: number; // in milliseconds
  slow: boolean;
  start?: number;
  end?: number;
}

/**
 * Interface for Jest test summary
 */
interface JestSummary {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numPendingTestSuites?: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests?: number;
  startTime: number; // Timestamp of start
  success: boolean;
  testResults: Array<{
    name: string; // Absolute path to the test suite file
    status: "passed" | "failed";
    summary: string;
    message: string;
    startTime: number;
    endTime: number;
    coverage?: any; // Individual file coverage if collected per test worker
    assertionResults?: Array<{
      ancestorTitles: string[];
      fullName: string;
      title: string; // Test name
      status: "passed" | "failed" | "pending" | "skipped" | "todo" | "disabled";
      failureMessages?: string[];
    }>;
  }>;
  coverageSummary?: JestCoverageSummary; // Added for coverage table
  snapshot?: SnapshotSummary; // Added for "Snapshots: X total"
  perfStats?: PerfStats; // Added for "Time: X.XXX s"
}

/**
 * Generates the Jest test results section.
 * @param core - The GitHub Actions core helper.
 * @returns Markdown string for the Jest test results section.
 */
export default async function getJestResultsSection(
  core: ScriptParams["core"]
): Promise<string> {
  let section = `### 🧪 Jest Test Results\n\n`;
  const jestSummaryPath = path.join(
    process.env.GITHUB_WORKSPACE ?? ".",
    "sites/arolariu.ro/jest-summary.json"
  );
  const workspaceRoot = process.env.GITHUB_WORKSPACE ?? "";

  try {
    const jestSummaryRaw = await fs.readFile(jestSummaryPath, "utf8");
    const jestSummary: JestSummary = JSON.parse(jestSummaryRaw);

    // Coverage Table Header
    section += `| File                    | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s |\n`;
    section += `|-------------------------|---------|----------|---------|---------|-------------------|\n`;

    // Function to format a coverage row
    const formatCoverageRow = (
      filePathOrKey: string,
      coverageData: CoverageFileSummary | undefined,
      isTotal: boolean = false
    ): string => {
      let fileNameDisplay: string;
      if (isTotal) {
        fileNameDisplay = "**All files**";
      } else {
        // Make path relative to workspaceRoot for display
        const relativePath =
          path.relative(workspaceRoot, filePathOrKey) ||
          path.basename(filePathOrKey);
        fileNameDisplay = `\`${relativePath}\``;
      }

      if (!coverageData) {
        return `| ${fileNameDisplay.padEnd(
          23
        )} | N/A     | N/A      | N/A     | N/A     | N/A               |\n`;
      }

      const stmts = coverageData.statements.pct.toFixed(2);
      const branch = coverageData.branches.pct.toFixed(2);
      const funcs = coverageData.functions.pct.toFixed(2);
      const lines = coverageData.lines.pct.toFixed(2);
      const uncoveredLines = "N/A"; // Placeholder, as this is not standard in json-summary

      return `| ${fileNameDisplay.padEnd(23)} | ${stmts.padStart(
        7
      )} | ${branch.padStart(8)} | ${funcs.padStart(7)} | ${lines.padStart(
        7
      )} | ${uncoveredLines.padEnd(17)} |\n`;
    };

    if (jestSummary.coverageSummary) {
      // "All files" row from coverageSummary.total
      section += formatCoverageRow(
        "total",
        jestSummary.coverageSummary.total,
        true
      );

      // Individual file rows from coverageSummary
      const filePaths = Object.keys(jestSummary.coverageSummary).filter(
        (k) => k !== "total" && jestSummary.coverageSummary?.[k]
      );
      filePaths.sort(); // Sort for consistent output

      for (const filePath of filePaths) {
        section += formatCoverageRow(
          filePath,
          jestSummary.coverageSummary[filePath]
        );
      }
    } else {
      section += `| No coverage data found in Jest summary. |         |          |         |         |                   |\n`;
    }

    section += `|-------------------------|---------|----------|---------|---------|-------------------|\n\n`;

    // Summary Stats
    const {
      numTotalTestSuites,
      numPassedTestSuites,
      numFailedTestSuites,
      numPendingTestSuites,
      numTotalTests,
      numPassedTests,
      numFailedTests,
      numPendingTests,
    } = jestSummary;

    section += `**Test Suites:** ${numPassedTestSuites} passed${
      numFailedTestSuites > 0 ? `, ${numFailedTestSuites} failed` : ""
    }${
      (numPendingTestSuites ?? 0) > 0 ? `, ${numPendingTestSuites} pending` : ""
    }, ${numTotalTestSuites} total\n`;
    section += `**Tests:**       ${numPassedTests} passed${
      numFailedTests > 0 ? `, ${numFailedTests} failed` : ""
    }${
      (numPendingTests ?? 0) > 0 ? `, ${numPendingTests} pending` : ""
    }, ${numTotalTests} total\n`;

    const snapshotTotal = jestSummary.snapshot?.total ?? 0;
    section += `**Snapshots:**   ${snapshotTotal} total\n`;

    let timeTaken = "N/A";
    if (
      jestSummary.perfStats &&
      typeof jestSummary.perfStats.runtime === "number"
    ) {
      timeTaken = `${(jestSummary.perfStats.runtime / 1000).toFixed(3)} s`;
    }
    section += `**Time:**        ${timeTaken}\n\n`;

    if (jestSummary.success) {
      section += `Ran all test suites.\n`;
    } else if (numFailedTests > 0 || numFailedTestSuites > 0) {
      section += `Some tests failed.\n`;
    } else {
      section += `Test run completed.\n`; // Fallback for unusual states
    }

    // Failed Tests Details (if any)
    if (
      (numFailedTests > 0 || numFailedTestSuites > 0) &&
      jestSummary.testResults
    ) {
      let failedTestsDetails = "\n**Failed Tests Details:**\n";
      let foundFailedAssertions = false;
      for (const testResult of jestSummary.testResults) {
        if (testResult.status === "failed" && testResult.assertionResults) {
          const suitePath = testResult.name.replace(
            workspaceRoot + path.sep,
            ""
          );
          let suiteHasFailure = false;
          let assertionDetails = "";
          for (const assertion of testResult.assertionResults) {
            if (assertion.status === "failed") {
              foundFailedAssertions = true;
              suiteHasFailure = true;
              assertionDetails += `      *   Test: \`${assertion.title}\`\n`;
              if (
                assertion.failureMessages &&
                assertion.failureMessages.length > 0
              ) {
                assertionDetails += `          <details><summary>Show Error</summary>\n\n`;
                assertionDetails += `\`\`\`\n${assertion.failureMessages
                  .join("\n\n")
                  .substring(0, 1000)}\n\`\`\`\n`;
                assertionDetails += `          </details>\n`;
              }
            }
          }
          if (suiteHasFailure) {
            failedTestsDetails += `  *   Suite: \`${suitePath}\`\n${assertionDetails}`;
          }
        }
      }
      if (foundFailedAssertions) {
        section += failedTestsDetails + `\n`;
      } else if (numFailedTestSuites > 0) {
        // Handle cases where a suite might fail without specific assertion failures (e.g. setup error)
        failedTestsDetails += `_Some test suites failed to run or reported errors. Check logs for details._\n`;
        section += failedTestsDetails + `\n`;
      }
    }
  } catch (error) {
    const err = error as Error;
    core.warning(
      `Could not read or parse Jest summary from ${jestSummaryPath}: ${err.message}`
    );
    section += `_Could not retrieve Jest test results (Error: ${err.message})._\n\n`;
  }
  section += `----\n`;
  return section;
}
