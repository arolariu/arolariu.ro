/**
 * @fileoverview Rich PR comment builder for hygiene check reports
 * @module hygiene/commentBuilder
 *
 * Consumes a `HygieneReport` and generates a comprehensive, well-formatted
 * PR comment with:
 * - Table of Contents
 * - Status cards with icons
 * - Expandable details sections
 * - Bundle size tables
 * - Workflow run link for debugging
 *
 * @example
 * ```typescript
 * import { buildHygieneComment } from './commentBuilder.ts';
 * const markdown = buildHygieneComment(report);
 * await github.createComment(prNumber, markdown);
 * ```
 */

import prettyBytes from "pretty-bytes";
import {
  type BundleFolderComparison,
  type CoverageSummary,
  type FileIssue,
  type HygieneCheckResult,
  type HygieneReport,
  type TestResult,
} from "./types.ts";

/**
 * Hidden HTML comment identifier for finding existing comments
 */
export const HYGIENE_COMMENT_IDENTIFIER = "<!-- arolariu-hygiene-check-v2 -->";

/**
 * Status emoji mapping
 */
const STATUS_EMOJI: Record<string, string> = {
  success: "✅",
  failure: "❌",
  skipped: "⏭️",
  error: "💥",
};

/**
 * Check type icons
 */
const CHECK_ICONS: Record<string, string> = {
  format: "🎨",
  lint: "🔍",
  test: "🧪",
  stats: "📊",
};

/**
 * Builds the complete hygiene report comment
 *
 * @param report - Aggregated hygiene report from all checks
 * @returns Markdown string for the PR comment
 */
export function buildHygieneComment(report: HygieneReport): string {
  const lines: string[] = [];

  // Header
  lines.push(buildHeader(report));
  lines.push("");

  // Table of Contents
  lines.push(buildTableOfContents(report));
  lines.push("");

  // Summary Table
  lines.push(buildSummaryTable(report));
  lines.push("");

  // Individual check sections
  if (report.checks.stats) {
    lines.push(buildStatsSection(report.checks.stats));
    lines.push("");
  }

  if (report.checks.format) {
    lines.push(buildFormatSection(report.checks.format));
    lines.push("");
  }

  if (report.checks.lint) {
    lines.push(buildLintSection(report.checks.lint));
    lines.push("");
  }

  if (report.checks.test) {
    lines.push(buildTestSection(report.checks.test));
    lines.push("");
  }

  // Footer
  lines.push(buildFooter(report));
  lines.push("");

  // Hidden identifier
  lines.push(HYGIENE_COMMENT_IDENTIFIER);

  return lines.join("\n");
}

/**
 * Builds the header section
 */
function buildHeader(report: HygieneReport): string {
  const emoji = STATUS_EMOJI[report.overallStatus] ?? "❓";
  const statusText =
    report.overallStatus === "success"
      ? "All Checks Passed"
      : report.overallStatus === "failure"
        ? "Issues Found"
        : report.overallStatus === "error"
          ? "Check Error"
          : "Checks Skipped";

  const shortSha = report.commitSha.substring(0, 7);

  return `# ${emoji} Code Hygiene Report: ${statusText}

**Commit:** \`${shortSha}\`${report.prNumber ? ` | **PR:** #${report.prNumber}` : ""}`;
}

/**
 * Builds the table of contents
 */
function buildTableOfContents(report: HygieneReport): string {
  const sections: string[] = ["## 📑 Table of Contents", ""];

  sections.push("| Section | Status |");
  sections.push("|---------|--------|");

  if (report.checks.stats) {
    sections.push(`| [📊 Code Statistics](#-code-statistics) | ${STATUS_EMOJI[report.checks.stats.status]} |`);
  }
  if (report.checks.format) {
    sections.push(`| [🎨 Formatting](#-formatting) | ${STATUS_EMOJI[report.checks.format.status]} |`);
  }
  if (report.checks.lint) {
    sections.push(`| [🔍 Linting](#-linting) | ${STATUS_EMOJI[report.checks.lint.status]} |`);
  }
  if (report.checks.test) {
    sections.push(`| [🧪 Unit Tests](#-unit-tests) | ${STATUS_EMOJI[report.checks.test.status]} |`);
  }

  return sections.join("\n");
}

/**
 * Builds the summary table
 */
function buildSummaryTable(report: HygieneReport): string {
  const lines: string[] = ["## 📋 Check Summary", ""];
  lines.push("| Check | Status | Duration | Summary |");
  lines.push("|-------|--------|----------|---------|");

  const checks = [
    {type: "stats", result: report.checks.stats},
    {type: "format", result: report.checks.format},
    {type: "lint", result: report.checks.lint},
    {type: "test", result: report.checks.test},
  ];

  for (const {type, result} of checks) {
    if (result) {
      const icon = CHECK_ICONS[type];
      const emoji = STATUS_EMOJI[result.status];
      const duration = formatDuration(result.duration);
      lines.push(`| ${icon} ${capitalize(type)} | ${emoji} | ${duration} | ${result.summary} |`);
    }
  }

  return lines.join("\n");
}

/**
 * Builds the stats section
 */
function buildStatsSection(result: HygieneCheckResult): string {
  const lines: string[] = ["## 📊 Code Statistics", ""];

  if (!result.stats) {
    lines.push("_Statistics not available_");
    return lines.join("\n");
  }

  const stats = result.stats;

  // Main diff stats
  lines.push("### Changes vs Main Branch");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| 📁 Files Changed | ${stats.vsMain.filesChanged} |`);
  lines.push(`| ➕ Lines Added | +${stats.vsMain.linesAdded} |`);
  lines.push(`| ➖ Lines Deleted | -${stats.vsMain.linesDeleted} |`);
  lines.push(`| 🔄 Churn | ${stats.churn} |`);
  lines.push(`| 📈 Net Change | ${stats.netChange >= 0 ? "+" : ""}${stats.netChange} |`);
  lines.push("");

  // Previous commit comparison
  if (stats.vsPrevious && !stats.isFirstCommit) {
    lines.push("<details>");
    lines.push("<summary>🔄 Changes Since Previous Commit</summary>");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|-------|");
    lines.push(`| Files Changed | ${stats.vsPrevious.filesChanged} |`);
    lines.push(`| Lines Added | +${stats.vsPrevious.linesAdded} |`);
    lines.push(`| Lines Deleted | -${stats.vsPrevious.linesDeleted} |`);
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  // Top extensions
  if (stats.topExtensions.length > 0) {
    lines.push("<details>");
    lines.push("<summary>🧩 Top File Extensions</summary>");
    lines.push("");
    lines.push("| Extension | Files |");
    lines.push("|-----------|-------|");
    for (const ext of stats.topExtensions) {
      lines.push(`| \`.${ext.extension}\` | ${ext.count} |`);
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  // Top directories
  if (stats.topDirectories.length > 0) {
    lines.push("<details>");
    lines.push("<summary>📂 Top Directories</summary>");
    lines.push("");
    lines.push("| Directory | Files |");
    lines.push("|-----------|-------|");
    for (const dir of stats.topDirectories) {
      lines.push(`| \`${dir.directory}\` | ${dir.count} |`);
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  // Bundle sizes
  if (stats.bundleSizes.length > 0) {
    lines.push(buildBundleSizeSection(stats.bundleSizes));
  }

  return lines.join("\n");
}

/**
 * Builds the bundle size section
 */
function buildBundleSizeSection(bundles: readonly BundleFolderComparison[]): string {
  const lines: string[] = ["### 📦 Bundle Size Analysis (vs Main)", ""];

  for (const bundle of bundles) {
    const diffStr = formatBundleDiff(bundle.totalDiff);
    const hasChanges = bundle.filesChanged > 0;

    lines.push("<details>");
    lines.push(`<summary><strong>\`${bundle.folder}\`</strong> - ${diffStr} (${bundle.filesChanged} file(s) changed)</summary>`);
    lines.push("");

    if (hasChanges) {
      lines.push("| File | Main | Preview | Diff | Status |");
      lines.push("|------|------|---------|------|--------|");

      for (const file of bundle.files.slice(0, 20)) {
        const statusEmoji = file.status === "added" ? "🆕" : file.status === "removed" ? "🗑️" : "📝";
        lines.push(
          `| \`${file.path}\` | ${prettyBytes(file.mainSize)} | ${prettyBytes(file.previewSize)} | ${formatBundleDiff(file.diff)} | ${statusEmoji} |`,
        );
      }

      if (bundle.files.length > 20) {
        lines.push(`| ... | ... | ... | ... | _${bundle.files.length - 20} more files_ |`);
      }
    } else {
      lines.push("_No changes in this folder_");
    }

    lines.push("");
    lines.push(`**Total:** ${prettyBytes(bundle.mainTotal)} → ${prettyBytes(bundle.previewTotal)} (${diffStr})`);
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Builds the format section
 */
function buildFormatSection(result: HygieneCheckResult): string {
  const lines: string[] = ["## 🎨 Formatting", ""];

  if (result.status === "success") {
    lines.push("✅ All files are properly formatted!");
    return lines.join("\n");
  }

  const files = result.filesNeedingFormat ?? [];
  lines.push(`❌ **${files.length}** file(s) need formatting:`);
  lines.push("");

  if (files.length > 0) {
    lines.push("<details>");
    lines.push("<summary>View files requiring formatting</summary>");
    lines.push("");
    for (const file of files.slice(0, 50)) {
      lines.push(`- \`${file}\``);
    }
    if (files.length > 50) {
      lines.push(`- _...and ${files.length - 50} more files_`);
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  lines.push("### 🔧 How to Fix");
  lines.push("");
  lines.push("```bash");
  lines.push("npm run format");
  lines.push("```");

  return lines.join("\n");
}

/**
 * Builds the lint section
 */
function buildLintSection(result: HygieneCheckResult): string {
  const lines: string[] = ["## 🔍 Linting", ""];

  if (result.status === "success") {
    lines.push("✅ All lint checks passed!");
    return lines.join("\n");
  }

  const errors = result.errorCount ?? 0;
  const warnings = result.warningCount ?? 0;
  lines.push(`❌ ESLint found **${errors}** error(s) and **${warnings}** warning(s)`);
  lines.push("");

  const issues = result.lintIssues ?? [];
  if (issues.length > 0) {
    lines.push(buildLintIssuesSection(issues));
  } else if (result.rawOutput) {
    lines.push("<details>");
    lines.push("<summary>View raw output</summary>");
    lines.push("");
    lines.push("```");
    lines.push(result.rawOutput.substring(0, 10000));
    if (result.rawOutput.length > 10000) {
      lines.push("\n... (output truncated)");
    }
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  lines.push("### 🔧 How to Fix");
  lines.push("");
  lines.push("```bash");
  lines.push("npm run lint");
  lines.push("```");

  return lines.join("\n");
}

/**
 * Builds the lint issues section grouped by file
 */
function buildLintIssuesSection(issues: readonly FileIssue[]): string {
  const lines: string[] = [];

  // Group by file
  const byFile = new Map<string, FileIssue[]>();
  for (const issue of issues) {
    const existing = byFile.get(issue.path) ?? [];
    existing.push(issue);
    byFile.set(issue.path, existing);
  }

  lines.push("<details>");
  lines.push(`<summary>View ${issues.length} issue(s) in ${byFile.size} file(s)</summary>`);
  lines.push("");

  let fileCount = 0;
  for (const [filePath, fileIssues] of byFile) {
    if (fileCount >= 10) {
      lines.push(`_...and ${byFile.size - 10} more files_`);
      break;
    }

    lines.push(`#### \`${filePath}\``);
    lines.push("");

    for (const issue of fileIssues.slice(0, 5)) {
      const emoji = issue.severity === "error" ? "🔴" : "🟡";
      const location = issue.line ? `L${issue.line}${issue.column ? `:${issue.column}` : ""}` : "";
      const rule = issue.ruleId ? ` (\`${issue.ruleId}\`)` : "";
      lines.push(`- ${emoji} ${location}: ${issue.message}${rule}`);
    }

    if (fileIssues.length > 5) {
      lines.push(`- _...and ${fileIssues.length - 5} more issues_`);
    }
    lines.push("");

    fileCount++;
  }

  lines.push("</details>");

  return lines.join("\n");
}

/**
 * Builds the test section
 */
function buildTestSection(result: HygieneCheckResult): string {
  const lines: string[] = ["## 🧪 Unit Tests", ""];

  const summary = result.testSummary;

  if (result.status === "success") {
    if (summary) {
      lines.push(`✅ All **${summary.totalTests}** tests passed in ${formatDuration(summary.duration)}`);
    } else {
      lines.push("✅ All tests passed!");
    }
    lines.push("");

    // Add coverage if available
    if (result.coverage) {
      lines.push(buildCoverageSection(result.coverage));
    }

    return lines.join("\n");
  }

  // Failed tests
  if (summary) {
    lines.push(`❌ **${summary.failed}** of **${summary.totalTests}** tests failed`);
    lines.push("");
    lines.push("| Metric | Count |");
    lines.push("|--------|-------|");
    lines.push(`| ✅ Passed | ${summary.passed} |`);
    lines.push(`| ❌ Failed | ${summary.failed} |`);
    lines.push(`| ⏭️ Skipped | ${summary.skipped} |`);
    lines.push(`| 📝 Todo | ${summary.todo} |`);
    lines.push("");
  }

  // Failed test details
  const failedTests = result.failedTests ?? [];
  if (failedTests.length > 0) {
    lines.push(buildFailedTestsSection(failedTests));
  }

  // Coverage
  if (result.coverage) {
    lines.push(buildCoverageSection(result.coverage));
  }

  return lines.join("\n");
}

/**
 * Builds the failed tests section
 */
function buildFailedTestsSection(tests: readonly TestResult[]): string {
  const lines: string[] = [];

  lines.push("<details>");
  lines.push(`<summary>View ${tests.length} failed test(s)</summary>`);
  lines.push("");

  for (const test of tests.slice(0, 10)) {
    lines.push(`#### ❌ ${test.name}`);
    lines.push(`**File:** \`${test.file}\``);
    if (test.suite) {
      lines.push(`**Suite:** ${test.suite}`);
    }
    if (test.error) {
      lines.push("");
      lines.push("```");
      lines.push(test.error.substring(0, 500));
      if (test.error.length > 500) {
        lines.push("\n... (error truncated)");
      }
      lines.push("```");
    }
    lines.push("");
  }

  if (tests.length > 10) {
    lines.push(`_...and ${tests.length - 10} more failed tests_`);
  }

  lines.push("</details>");
  lines.push("");

  return lines.join("\n");
}

/**
 * Builds the coverage section
 */
function buildCoverageSection(coverage: CoverageSummary): string {
  const lines: string[] = [];

  lines.push("### 📊 Coverage");
  lines.push("");
  lines.push("| Metric | Covered | Total | Percentage |");
  lines.push("|--------|---------|-------|------------|");
  lines.push(`| Lines | ${coverage.lines.covered} | ${coverage.lines.total} | ${formatPercentage(coverage.lines.percentage)} |`);
  lines.push(
    `| Statements | ${coverage.statements.covered} | ${coverage.statements.total} | ${formatPercentage(coverage.statements.percentage)} |`,
  );
  lines.push(
    `| Functions | ${coverage.functions.covered} | ${coverage.functions.total} | ${formatPercentage(coverage.functions.percentage)} |`,
  );
  lines.push(
    `| Branches | ${coverage.branches.covered} | ${coverage.branches.total} | ${formatPercentage(coverage.branches.percentage)} |`,
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Builds the footer
 */
function buildFooter(report: HygieneReport): string {
  const lines: string[] = [];

  lines.push("---");
  lines.push("");
  lines.push(`🔗 [View Workflow Run](${report.workflowRunUrl}) | Generated at ${report.generatedAt}`);

  return lines.join("\n");
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Formats duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

/**
 * Formats a bundle size diff
 */
function formatBundleDiff(bytes: number): string {
  if (bytes === 0) {
    return "no change";
  }
  const sign = bytes > 0 ? "+" : "";
  return `${sign}${prettyBytes(bytes)}`;
}

/**
 * Formats a percentage with color indicator
 */
function formatPercentage(pct: number): string {
  const emoji = pct >= 80 ? "🟢" : pct >= 60 ? "🟡" : "🔴";
  return `${emoji} ${pct.toFixed(1)}%`;
}

/**
 * Capitalizes first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Creates a HygieneReport from individual check results
 */
export function createHygieneReport(options: {
  checks: {
    format?: HygieneCheckResult;
    lint?: HygieneCheckResult;
    test?: HygieneCheckResult;
    stats?: HygieneCheckResult;
  };
  commitSha: string;
  prNumber?: number;
  workflowRunId: string;
  workflowRunUrl: string;
}): HygieneReport {
  // Calculate overall status
  const results = Object.values(options.checks).filter(Boolean) as HygieneCheckResult[];
  let overallStatus: HygieneReport["overallStatus"] = "success";

  if (results.some((r) => r.status === "error")) {
    overallStatus = "error";
  } else if (results.some((r) => r.status === "failure")) {
    overallStatus = "failure";
  } else if (results.every((r) => r.status === "skipped")) {
    overallStatus = "skipped";
  }

  return {
    checks: options.checks,
    overallStatus,
    commitSha: options.commitSha,
    prNumber: options.prNumber,
    workflowRunId: options.workflowRunId,
    workflowRunUrl: options.workflowRunUrl,
    generatedAt: new Date().toISOString(),
  };
}
