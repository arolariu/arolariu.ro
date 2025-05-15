import path from "node:path";
import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
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
  perfStats?: PerfStats; // Added for "Time: X.XXS s"
}

/**
 * Represents a file in the coverage report with uncovered line information
 */
interface EnhancedCoverageFile {
  path: string;
  coverage: CoverageFileSummary;
  uncoveredLines: number[];
}

/**
 * Parse LCOV format coverage data to extract uncovered lines information
 * @param lcovContent - The content of the LCOV file as a string
 * @param workspaceRoot - The root directory of the workspace
 * @returns A map of file paths to uncovered line numbers
 */
async function parseLcovContent(
  lcovContent: string,
  workspaceRoot: string
): Promise<Record<string, number[]>> {
  const uncoveredLinesMap: Record<string, number[]> = {};
  let currentFilePath: string | null = null;

  const lines = lcovContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("SF:")) {
      // SF:<absolute path to file>
      const absPath = line.substring(3);
      // Normalize and make relative for consistency with coverage summary keys
      currentFilePath = path
        .relative(workspaceRoot, absPath)
        .replace(/\\/g, "/");
      if (!uncoveredLinesMap[currentFilePath]) {
        uncoveredLinesMap[currentFilePath] = [];
      }
    } else if (line.startsWith("DA:") && currentFilePath) {
      // DA:<line number>,<execution count>
      const parts = line.substring(3).split(",");
      if (parts.length === 2) {
        const lineNumber = parseInt(parts[0], 10);
        const executionCount = parseInt(parts[1], 10);
        if (executionCount === 0 && !isNaN(lineNumber)) {
          uncoveredLinesMap[currentFilePath].push(lineNumber);
        }
      }
    } else if (line === "end_of_record") {
      if (currentFilePath && uncoveredLinesMap[currentFilePath]) {
        uncoveredLinesMap[currentFilePath].sort((a, b) => a - b);
      }
      currentFilePath = null;
    }
  }
  return uncoveredLinesMap;
}

/**
 * Format a list of uncovered lines in a more readable format, grouping consecutive line numbers
 * @param lines - Array of line numbers
 * @returns A formatted string representing line ranges
 */
function formatUncoveredLines(lines: number[]): string {
  if (!lines || lines.length === 0) return "N/A";

  // Sort the lines numerically
  lines.sort((a, b) => a - b);

  // Group consecutive lines into ranges
  const ranges: string[] = [];
  let start = lines[0];
  let end = lines[0];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === end + 1) {
      end = lines[i];
    } else {
      // Add the previous range
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = lines[i];
      end = lines[i];
    }
  }

  // Add the last range
  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  return ranges.join(", ");
}

/**
 * Attempts to find and parse a JSON coverage summary file
 * @param workspaceRoot - The root directory of the workspace
 * @returns The coverage summary object if found, or null
 */
async function findAndParseCoverageSummary(
  workspaceRoot: string,
  core: ScriptParams["core"]
): Promise<JestCoverageSummary | null> {
  // Common locations where coverage summary might be stored
  const possiblePaths = [
    path.join(
      workspaceRoot,
      "sites/arolariu.ro/jest-report/coverage-summary.json"
    ),
    path.join(
      workspaceRoot,
      "sites/arolariu.ro/code-cov/jest-report/coverage-summary.json"
    ),
    path.join(
      workspaceRoot,
      "sites/arolariu.ro/coverage/coverage-summary.json"
    ),
    path.join(workspaceRoot, "jest-report/coverage-summary.json"),
    path.join(workspaceRoot, "coverage/coverage-summary.json"),
  ];

  for (const summaryPath of possiblePaths) {
    try {
      if (fsSync.existsSync(summaryPath)) {
        const data = await fs.readFile(summaryPath, "utf8");
        return JSON.parse(data) as JestCoverageSummary;
      }
    } catch (error) {
      const err = error as Error;
      core.debug(
        `Failed to read coverage summary from ${summaryPath}: ${err.message}`
      );
    }
  }

  return null;
}

/**
 * Attempts to find and parse the LCOV file to extract uncovered lines
 * @param workspaceRoot - The root directory of the workspace
 * @returns A map of file paths to uncovered line numbers
 */
async function findAndParseLcovFile(
  workspaceRoot: string,
  core: ScriptParams["core"]
): Promise<Record<string, number[]>> {
  // Common locations where lcov.info might be stored
  const possiblePaths = [
    path.join(workspaceRoot, "sites/arolariu.ro/jest-report/lcov.info"),
    path.join(
      workspaceRoot,
      "sites/arolariu.ro/code-cov/jest-report/lcov.info"
    ),
    path.join(workspaceRoot, "sites/arolariu.ro/coverage/lcov.info"),
    path.join(workspaceRoot, "jest-report/lcov.info"),
    path.join(workspaceRoot, "coverage/lcov.info"),
  ];

  for (const lcovPath of possiblePaths) {
    try {
      if (fsSync.existsSync(lcovPath)) {
        const data = await fs.readFile(lcovPath, "utf8");
        return await parseLcovContent(data, workspaceRoot);
      }
    } catch (error) {
      const err = error as Error;
      core.debug(`Failed to read LCOV from ${lcovPath}: ${err.message}`);
    }
  }

  return {};
}

/**
 * Merges coverage data from both summary and LCOV sources
 * @param coverageSummary - Coverage summary object from JSON
 * @param uncoveredLinesMap - Map of file paths to uncovered line numbers from LCOV
 * @returns An array of enhanced coverage file objects
 */
function mergeAndEnhanceCoverageData(
  coverageSummary: JestCoverageSummary | null,
  uncoveredLinesMap: Record<string, number[]>
): EnhancedCoverageFile[] {
  if (!coverageSummary) {
    return Object.entries(uncoveredLinesMap).map(([path, uncoveredLines]) => ({
      path,
      coverage: {
        lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
        statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
        functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
        branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
      },
      uncoveredLines,
    }));
  }

  const enhancedCoverage: EnhancedCoverageFile[] = [];

  // Process all files in the coverage summary (excluding total)
  Object.entries(coverageSummary)
    .filter(([key]) => key !== "total")
    .forEach(([path, coverage]) => {
      enhancedCoverage.push({
        path,
        coverage,
        uncoveredLines: uncoveredLinesMap[path] || [],
      });
    });

  // Add the total entry separately
  if (coverageSummary.total) {
    enhancedCoverage.push({
      path: "total",
      coverage: coverageSummary.total,
      uncoveredLines: [],
    });
  }

  return enhancedCoverage;
}

/**
 * Finds and parses the Jest summary file
 * @param workspaceRoot - The root directory of the workspace
 * @param core - GitHub Actions core helper
 * @returns The Jest summary object if found, or null
 */
async function findAndParseJestSummary(
  workspaceRoot: string,
  core: ScriptParams["core"]
): Promise<JestSummary | null> {
  // Common locations where jest summary might be stored
  const possiblePaths = [
    path.join(workspaceRoot, "sites/arolariu.ro/jest-report/jest-summary.json"),
    path.join(
      workspaceRoot,
      "sites/arolariu.ro/code-cov/jest-report/jest-summary.json"
    ),
    path.join(workspaceRoot, "sites/arolariu.ro/jest-report/test-summary.json"),
    path.join(workspaceRoot, "jest-report/jest-summary.json"),
    path.join(workspaceRoot, "jest-report/test-summary.json"),
  ];

  for (const summaryPath of possiblePaths) {
    try {
      if (fsSync.existsSync(summaryPath)) {
        const data = await fs.readFile(summaryPath, "utf8");
        return JSON.parse(data) as JestSummary;
      }
    } catch (error) {
      const err = error as Error;
      core.debug(
        `Failed to read Jest summary from ${summaryPath}: ${err.message}`
      );
    }
  }

  return null;
}

/**
 * Attempts to find any test detail files
 * @param workspaceRoot - The root directory of the workspace
 * @returns An array of paths to found test detail files
 */
async function findTestDetailFiles(workspaceRoot: string): Promise<string[]> {
  // Common locations to search for test result files
  const searchPaths = [
    path.join(workspaceRoot, "sites/arolariu.ro/jest-report"),
    path.join(workspaceRoot, "sites/arolariu.ro/code-cov/jest-report"),
    path.join(workspaceRoot, "sites/arolariu.ro/coverage"),
    path.join(workspaceRoot, "jest-report"),
    path.join(workspaceRoot, "coverage"),
  ];

  const foundFiles: string[] = [];

  for (const dir of searchPaths) {
    try {
      if (fsSync.existsSync(dir)) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          if (
            stats.isFile() &&
            (file.endsWith(".json") ||
              file.endsWith(".html") ||
              file.endsWith(".info"))
          ) {
            foundFiles.push(filePath);
          }
        }
      }
    } catch (error) {
      // Silently skip directories that don't exist
    }
  }

  return foundFiles;
}

/**
 * Generates color code for a coverage percentage
 * @param pct - The coverage percentage
 * @returns A string representation with color indication
 */
function getCoverageColor(pct: number): string {
  if (pct >= 80) return `**${pct.toFixed(2)}**`; // Bold for good coverage
  if (pct >= 60) return pct.toFixed(2); // Normal for medium coverage
  return `*${pct.toFixed(2)}*`; // Italic for poor coverage
}

/**
 * Formats a test file path for display
 * @param filePath - The full file path
 * @param workspaceRoot - The root workspace directory
 * @returns A formatted path for display in the report
 */
function formatFilePath(filePath: string, workspaceRoot: string): string {
  // For total row, format specially
  if (filePath === "total") {
    return "**All files**";
  }

  // Remove workspace root from path to make it relative
  const relativePath = path
    .relative(workspaceRoot, filePath)
    .replace(/\\/g, "/");

  // If it starts with sites/arolariu.ro, simplify it
  const simplifiedPath = relativePath.startsWith("sites/arolariu.ro/")
    ? relativePath.substring("sites/arolariu.ro/".length)
    : relativePath;

  return `\`${simplifiedPath}\``;
}

/**
 * Generates suggestions for improving Jest setup based on found files
 * @param foundFiles - Array of test and coverage files found in the workspace
 * @returns A string with suggestions
 */
function generateJestSuggestions(foundFiles: string[]): string {
  const hasCoverageSummary = foundFiles.some(
    (f) =>
      f.includes("coverage-summary.json") || f.includes("coverage-final.json")
  );
  const hasLcov = foundFiles.some((f) => f.includes("lcov.info"));
  const hasJestSummary = foundFiles.some(
    (f) => f.includes("jest-summary.json") || f.includes("test-summary.json")
  );

  const suggestions: string[] = [];

  if (!hasCoverageSummary) {
    suggestions.push(
      '- Add `"json-summary"` to the `coverageReporters` array in your Jest configuration to generate a coverage summary file.'
    );
  }

  if (!hasLcov) {
    suggestions.push(
      '- Add `"lcov"` to the `coverageReporters` array to get detailed line coverage information.'
    );
  }

  if (!hasJestSummary) {
    suggestions.push(
      "- Configure Jest to output detailed test results by setting `--json --outputFile=jest-report/jest-summary.json` when running tests."
    );
  }

  if (suggestions.length === 0) {
    return "";
  }

  return `
<details>
<summary>📝 Suggestions for Improving Jest Coverage Reporting</summary>

${suggestions.join("\n")}

Example Jest configuration:
\`\`\`javascript
module.exports = {
  // ...other config
  collectCoverage: true,
  coverageDirectory: "jest-report",
  coverageReporters: ["html", "text", "json-summary", "lcov"],
  // ...other config
}
\`\`\`

Example test script in package.json:
\`\`\`json
"scripts": {
  "test:jest": "jest --coverage --json --outputFile=jest-report/jest-summary.json"
}
\`\`\`

</details>
`;
}

/**
 * Generates the Jest test results section.
 * @param core - The GitHub Actions core helper.
 * @returns Markdown string for the Jest test results section.
 */
export default async function getJestResultsSection(
  core: ScriptParams["core"]
): Promise<string> {
  const workspaceRoot = process.env.GITHUB_WORKSPACE ?? ".";
  let section = `### 🧪 Jest Test Results\n\n`;

  try {
    // First collect all available test and coverage information
    const foundFiles = await findTestDetailFiles(workspaceRoot);
    const jestSummary = await findAndParseJestSummary(workspaceRoot, core);
    const coverageSummary = await findAndParseCoverageSummary(
      workspaceRoot,
      core
    );
    const uncoveredLinesMap = await findAndParseLcovFile(workspaceRoot, core);

    core.debug(`Found ${foundFiles.length} test related files`);
    core.debug(`Jest Summary found: ${Boolean(jestSummary)}`);
    core.debug(`Coverage Summary found: ${Boolean(coverageSummary)}`);
    core.debug(
      `LCOV data found for ${Object.keys(uncoveredLinesMap).length} files`
    );

    // Merge coverage data from different sources
    const enhancedCoverage = mergeAndEnhanceCoverageData(
      coverageSummary,
      uncoveredLinesMap
    );

    // Sort files: total first, then alphabetically by path
    enhancedCoverage.sort((a, b) => {
      if (a.path === "total") return -1;
      if (b.path === "total") return 1;
      return a.path.localeCompare(b.path);
    });

    // Coverage Table Header
    section += `| File | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s |\n`;
    section += `|------|---------|----------|---------|---------|-------------------|\n`;

    if (enhancedCoverage.length > 0) {
      // Generate table rows
      for (const item of enhancedCoverage) {
        const fileNameDisplay = formatFilePath(item.path, workspaceRoot);
        const stmts = getCoverageColor(item.coverage.statements.pct);
        const branch = getCoverageColor(item.coverage.branches.pct);
        const funcs = getCoverageColor(item.coverage.functions.pct);
        const lines = getCoverageColor(item.coverage.lines.pct);

        const uncoveredLinesDisplay =
          item.path === "total"
            ? "N/A"
            : formatUncoveredLines(item.uncoveredLines);

        section += `| ${fileNameDisplay} | ${stmts} | ${branch} | ${funcs} | ${lines} | ${uncoveredLinesDisplay} |\n`;
      }
    } else {
      section += `| No coverage data found | N/A | N/A | N/A | N/A | N/A |\n`;
    }

    // Summary Stats from Jest Summary if available
    if (jestSummary) {
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

      section += `\n**Test Suites:** ${numPassedTestSuites} passed${
        numFailedTestSuites > 0 ? `, ${numFailedTestSuites} failed` : ""
      }${
        (numPendingTestSuites ?? 0) > 0
          ? `, ${numPendingTestSuites} pending`
          : ""
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

      // Status summary
      if (jestSummary.success) {
        section += `✅ All test suites passed successfully.\n`;
      } else if (numFailedTests > 0 || numFailedTestSuites > 0) {
        section += `❌ Some tests failed. See details below.\n`;
      } else {
        section += `⚠️ Test run completed with warnings.\n`;
      }

      // Failed Tests Details (if any)
      if (
        (numFailedTests > 0 || numFailedTestSuites > 0) &&
        jestSummary.testResults
      ) {
        section += `\n<details>\n<summary>🔍 Failed Tests Details</summary>\n\n`;
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
                assertionDetails += `- Test: \`${assertion.title}\`\n`;

                if (
                  assertion.failureMessages &&
                  assertion.failureMessages.length > 0
                ) {
                  assertionDetails += `  <details><summary>Error Details</summary>\n\n`;
                  assertionDetails += `  \`\`\`\n${assertion.failureMessages
                    .join("\n\n")
                    .substring(0, 1000)}\n  \`\`\`\n`;
                  assertionDetails += `  </details>\n\n`;
                }
              }
            }

            if (suiteHasFailure) {
              section += `### Suite: \`${suitePath}\`\n${assertionDetails}`;
            }
          }
        }

        if (!foundFailedAssertions && numFailedTestSuites > 0) {
          section += `Some test suites failed to run or reported errors. Check logs for details.\n`;
        }

        section += `</details>\n\n`;
      }
    } else {
      // Basic summary if no Jest summary available
      if (enhancedCoverage.length > 0) {
        const totalCoverage = enhancedCoverage.find(
          (item) => item.path === "total"
        );
        if (totalCoverage) {
          section += `\n**Overall Line Coverage:** ${totalCoverage.coverage.lines.pct.toFixed(
            2
          )}%\n`;
          section += `**Overall Statement Coverage:** ${totalCoverage.coverage.statements.pct.toFixed(
            2
          )}%\n`;
          section += `**Overall Function Coverage:** ${totalCoverage.coverage.functions.pct.toFixed(
            2
          )}%\n`;
          section += `**Overall Branch Coverage:** ${totalCoverage.coverage.branches.pct.toFixed(
            2
          )}%\n\n`;
        }
      }
    }

    // Add suggestions for improving Jest setup if appropriate
    section += generateJestSuggestions(foundFiles);
  } catch (error) {
    const err = error as Error;
    core.warning(`Error generating Jest test results section: ${err.message}`);
    section += `_Error generating Jest test results: ${err.message}_\n\n`;

    // Provide fallback message with help
    section += `
<details>
<summary>📝 Help with Jest Test Results</summary>

No test results found. To display Jest test results, make sure:

1. Jest is configured to output test results and coverage reports:
\`\`\`javascript
// In jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: "jest-report",
  coverageReporters: ["json-summary", "lcov", "text", "html"],
  // other configs...
}
\`\`\`

2. Your test script saves the results:
\`\`\`json
// In package.json
"scripts": {
  "test:jest": "jest --coverage --json --outputFile=jest-report/jest-summary.json"
}
\`\`\`

3. Check the folder structure to ensure reports are saved in one of these locations:
   - \`sites/arolariu.ro/jest-report/\`
   - \`sites/arolariu.ro/code-cov/jest-report/\`
   - \`sites/arolariu.ro/coverage/\`
   - \`jest-report/\`
   - \`coverage/\`
</details>
`;
  }

  section += `----\n`;
  return section;
}
