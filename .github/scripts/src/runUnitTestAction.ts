/**
 * @fileoverview Unified test results action script for GitHub Actions workflows.
 * @module github/scripts/src/runUnitTestAction
 *
 * @remarks
 * This module generates professional PR comments with comprehensive test results:
 * - **Vitest Unit Tests**: Coverage metrics with visual indicators
 * - **Playwright E2E Tests**: Test statistics, failures, and flaky test details
 * - **Branch Comparison**: Commit statistics vs main branch
 *
 * The comment is designed for enterprise-grade reporting with clear visual hierarchy
 * and actionable information for developers reviewing PRs.
 *
 * @example
 * ```typescript
 * // Called from GitHub Actions workflow
 * const { default: runUnitTestAction } = await import('./runUnitTestAction.ts');
 * await runUnitTestAction();
 * ```
 */

import * as core from "@actions/core";
import {STATUS_EMOJI_UNIT_TESTS, createGitHubHelper, env, fs, git, playwright, vitest} from "../helpers/index.ts";
import type {WorkflowInfo} from "../types/index.ts";

/** Path to Vitest coverage summary JSON file */
const VITEST_COVERAGE_PATH = "sites/arolariu.ro/code-cov/vitest/coverage-summary.json";

/** Path to Playwright test results JSON file */
const PLAYWRIGHT_RESULTS_PATH = "sites/arolariu.ro/code-cov/playwright-report/results.json";

/**
 * Workflow context extracted from environment variables
 */
interface WorkflowContext {
  commitSha: string;
  runId: string;
  branchName: string;
  jobStatus: string;
}

/**
 * Extracts workflow context from environment variables
 * @param core - GitHub Actions core utilities
 * @returns Workflow context or null if required vars are missing
 */
function extractWorkflowContext(core: typeof import("@actions/core")): WorkflowContext | null {
  const commitSha = env.get("COMMIT_SHA") ?? env.get("GITHUB_SHA");
  const runId = env.get("RUN_ID") ?? env.get("GITHUB_RUN_ID");
  const branchName = env.get("BRANCH_NAME") ?? env.get("GITHUB_REF_NAME");
  const jobStatus = env.get("JOB_STATUS", "unknown") ?? "unknown";

  if (!commitSha || !runId || !branchName) {
    core.error("Missing required environment variables: COMMIT_SHA, RUN_ID, or BRANCH_NAME");
    return null;
  }

  return {commitSha, runId, branchName, jobStatus};
}

/**
 * Generates workflow information section header for PR comment
 * @param workflowInfo - Workflow and PR metadata
 * @returns Markdown formatted workflow info section
 */
function generateWorkflowInfoSection(workflowInfo: WorkflowInfo): string {
  const statusEmoji =
    STATUS_EMOJI_UNIT_TESTS[workflowInfo.jobStatus as keyof typeof STATUS_EMOJI_UNIT_TESTS] ?? STATUS_EMOJI_UNIT_TESTS.unknown;
  const statusText = workflowInfo.jobStatus.charAt(0).toUpperCase() + workflowInfo.jobStatus.slice(1);

  let section = `## ${statusEmoji} Test Results: ${statusText}\n\n`;
  section += `| Property | Value |\n`;
  section += `|----------|-------|\n`;
  section += `| **Commit** | [\`${workflowInfo.shortCurrentCommitSha}\`](${workflowInfo.commitUrl}) |\n`;
  section += `| **Branch** | \`${workflowInfo.branchName}\` |\n`;
  section += `| **Workflow** | [Run #${workflowInfo.runId}](${workflowInfo.workflowRunUrl}) |\n`;

  if (workflowInfo.prNumber > 0) {
    section += `| **Pull Request** | [#${workflowInfo.prNumber}](${workflowInfo.prUrl}) |\n`;
  }

  section += `\n----\n`;
  return section;
}

/**
 * Generates branch/commit comparison section
 * @param currentCommitSha - Full commit SHA
 * @param shortCurrentCommitSha - Short commit SHA (7 chars)
 * @returns Markdown formatted comparison section
 */
async function getBranchCommitComparisonSection(currentCommitSha: string, shortCurrentCommitSha: string): Promise<string> {
  let section = `### 📊 Branch Comparison\n\n`;
  section += `| Branch          | SHA         | Commits vs. Main |\n`;
  section += `|-----------------|-------------|------------------|\n`;

  let mainBranchShaShort = "N/A";
  let commitsAhead = "N/A";

  try {
    await git.fetchBranch("main", "origin", 50);
    const mainCommit = await git.getCommit("refs/remotes/origin/main");
    mainBranchShaShort = mainCommit.shortSha;

    // Count commits ahead of main
    const {stdout} = await (
      await import("@actions/exec")
    ).getExecOutput(`git rev-list --count refs/remotes/origin/main..${currentCommitSha}`);
    commitsAhead = stdout.trim();
  } catch (error) {
    const err = error as Error;
    core.warning(`Failed to retrieve main branch information: ${err.message}`);
    mainBranchShaShort = "Error";
    commitsAhead = "Error";
  }

  section += `| **Main**        | \`${mainBranchShaShort}\`   | -                |\n`;
  section += `| **Current**     | \`${shortCurrentCommitSha}\`   | +${commitsAhead}           |\n\n`;
  section += `----\n`;
  return section;
}

/**
 * Generates Vitest test results section with coverage metrics
 *
 * This function parses the Vitest coverage-summary.json file and generates
 * a professional markdown section with:
 * - Coverage percentages for statements, branches, functions, and lines
 * - Visual emoji indicators (🟢 >= 90%, 🟡 >= 75%, 🔴 < 75%)
 * - Graceful fallback when coverage data is unavailable
 *
 * @returns Markdown formatted Vitest results section
 */
async function getVitestResultsSection(): Promise<string> {
  try {
    const exists = await fs.exists(VITEST_COVERAGE_PATH);

    if (!exists) {
      core.debug(`Vitest coverage file not found at ${VITEST_COVERAGE_PATH}`);
      let section = `### 🧪 Vitest Unit Tests\n\n`;
      section += `> ⚠️ Coverage data not available\n\n`;
      section += `----\n`;
      return section;
    }

    // Parse coverage using vitest helper
    core.debug(`Parsing Vitest coverage from ${VITEST_COVERAGE_PATH}`);
    const coverageData = await vitest.parseCoverage(VITEST_COVERAGE_PATH, fs);

    // Log coverage summary
    core.info(
      `📊 Vitest coverage: ${coverageData.total.statements.pct.toFixed(1)}% statements, ` +
        `${coverageData.total.branches.pct.toFixed(1)}% branches, ` +
        `${coverageData.total.functions.pct.toFixed(1)}% functions, ` +
        `${coverageData.total.lines.pct.toFixed(1)}% lines`,
    );

    // Generate enhanced markdown section with emoji indicators
    return vitest.generateMarkdownSection(coverageData, {
      useEmoji: true,
      title: "🧪 Vitest Unit Tests",
    });
  } catch (error) {
    const err = error as Error;
    core.warning(`Failed to read Vitest coverage: ${err.message}`);

    let section = `### 🧪 Vitest Unit Tests\n\n`;
    section += `> ⚠️ Could not read coverage data: ${err.message}\n\n`;
    section += `----\n`;
    return section;
  }
}

/**
 * Generates Playwright test results section with rich statistics and failure details
 *
 * This function attempts to parse the actual Playwright JSON results file to generate
 * a comprehensive test report including:
 * - Test statistics (passed, failed, skipped, flaky counts)
 * - Failure details with error messages
 * - Flaky test information with retry counts
 * - Duration statistics
 *
 * If the results file is not available or cannot be parsed, it falls back to a simple
 * status-based message for backward compatibility.
 *
 * @param jobStatus - Job execution status (success, failure, etc.)
 * @param workflowRunUrl - URL to workflow run for artifact links
 * @returns Markdown formatted Playwright results section
 */
async function getPlaywrightResultsSection(jobStatus: string, workflowRunUrl: string): Promise<string> {
  try {
    const exists = await fs.exists(PLAYWRIGHT_RESULTS_PATH);

    if (!exists) {
      core.debug(`Playwright results file not found at ${PLAYWRIGHT_RESULTS_PATH}, using simple section`);
      // Fall back to simple section when no results file
      return playwright.generateSimpleSection(jobStatus, workflowRunUrl);
    }

    // Parse actual results and generate rich markdown
    core.debug(`Parsing Playwright results from ${PLAYWRIGHT_RESULTS_PATH}`);
    const results = await playwright.parseResults(PLAYWRIGHT_RESULTS_PATH, fs);

    core.info(
      `📊 Playwright results: ${results.statistics.passed} passed, ${results.statistics.failed} failed, ` +
        `${results.statistics.skipped} skipped, ${results.statistics.flaky} flaky`,
    );

    return playwright.generateMarkdownSection(results, {
      workflowRunUrl,
      includeFailureDetails: true,
      includeFlakyTests: true,
      maxFailuresToShow: 10,
      showDuration: true,
    });
  } catch (error) {
    const err = error as Error;
    core.warning(`Failed to read Playwright results: ${err.message}`);
    // Fall back to simple section on error
    return playwright.generateSimpleSection(jobStatus, workflowRunUrl);
  }
}

/**
 * Builds the complete test summary PR comment body by aggregating multiple analysis sections
 *
 * This function orchestrates the generation of all comment sections in a specific order:
 * 1. Workflow header (commit, branch, run status, PR links)
 * 2. Branch/commit comparison statistics
 * 3. Vitest unit test coverage results
 * 4. Playwright E2E test results
 *
 * @param workflowInfo - Workflow and PR metadata including URLs and identifiers
 * @param currentCommitSha - Full SHA hash of the commit being analyzed
 * @returns Promise resolving to complete markdown-formatted comment body
 *
 * @remarks
 * - Each section is generated independently with its own error handling
 * - Failed sections show warning messages rather than failing the entire comment
 * - The comment is designed for enterprise-grade CI/CD reporting
 */
async function buildUnitTestSummaryCommentBody(workflowInfo: WorkflowInfo, currentCommitSha: string): Promise<string> {
  let commentBody = "";

  core.debug("Building workflow info section...");
  commentBody += generateWorkflowInfoSection(workflowInfo);

  core.debug("Building branch/commit comparison section...");
  commentBody += await getBranchCommitComparisonSection(currentCommitSha, workflowInfo.shortCurrentCommitSha);

  core.debug("Building Vitest test results section...");
  commentBody += await getVitestResultsSection();

  core.debug("Building Playwright test results section...");
  commentBody += await getPlaywrightResultsSection(workflowInfo.jobStatus, workflowInfo.workflowRunUrl);

  // Add footer with generated timestamp
  commentBody += `\n<sub>🤖 Generated by CI at ${new Date().toISOString()}</sub>\n`;

  core.debug(`Comment body assembled: ${commentBody.split("\n").length} lines`);
  return commentBody;
}

/**
 * Creates a comment on a pull request with the provided markdown content
 *
 * This function supports both `pull_request` and `push` event triggers:
 * - For `pull_request` events: Uses the PR context from the workflow payload
 * - For `push` events: Searches for an open PR with the current branch as head
 *
 * @param commentBody - Pre-formatted markdown content to post as the PR comment
 * @param branchName - The current branch name (used for fallback PR discovery)
 * @returns Promise that resolves when the comment is posted successfully or skipped gracefully
 *
 * @example
 * ```typescript
 * await createPRComment('## ✅ Build Successful\n\nAll checks passed!', 'preview');
 * ```
 */
async function createPRComment(commentBody: string, branchName: string): Promise<void> {
  core.info("🚀 Starting PR comment creation process...");

  // Get GitHub token
  const token = env.getRequired("GITHUB_TOKEN");
  const gh = createGitHubHelper(token);

  // Try to get PR context from workflow payload (works for pull_request events)
  let pr = gh.getPullRequest();

  // If no PR context from payload, try to find an open PR for this branch (works for push events)
  if (!pr) {
    core.info(`🔍 No PR context in payload, searching for open PRs with head branch: ${branchName}`);
    pr = await gh.findPullRequestForBranch(branchName);
  }

  if (!pr) {
    core.warning("⏭️ No PR context found - skipping comment creation");
    core.info("💡 Tip: Ensure there is an open PR with this branch as the head, or trigger the workflow from a pull_request event");
    return;
  }

  core.info(`📋 Target PR: #${pr.number} (${pr.url})`);

  try {
    // Post comment
    await gh.postPullRequestComment(pr.number, commentBody);
    core.info(`✓ Successfully commented on PR #${pr.number}`);
  } catch (error) {
    const err = error as Error;
    core.warning(`⚠️ Failed to post comment to PR #${pr.number}: ${err.message}`);
  }
}

/**
 * Creates a comprehensive PR comment with unit test results and build analysis
 *
 * This is the main entry point for generating unit test summary comments. It orchestrates
 * the entire process from environment validation to comment posting:
 *
 * 1. **Environment Validation**: Extracts and validates required workflow context
 * 2. **Metadata Construction**: Builds URLs and workflow information objects
 * 3. **Content Generation**: Aggregates Vitest coverage and Playwright test results
 * 4. **Comment Posting**: Uses the GitHub helper to post comments to PRs
 *
 * @returns Promise that resolves when the comment is successfully posted or skipped
 *
 * @remarks
 * - **Performance**: Content generation runs serially for predictable ordering
 * - **Error Handling**: Missing environment variables cause early return without throwing
 * - **Extensibility**: Easy to add new sections by modifying buildUnitTestSummaryCommentBody
 * - **Reusability**: Leverages shared utilities (extractWorkflowContext, createPRComment)
 *
 * @example
 * ```typescript
 * // Typical usage in GitHub Actions workflow
 * await runUnitTestAction();
 * ```
 */
export default async function runUnitTestAction(): Promise<void> {
  const context = (await import("@actions/github")).context;

  core.info("🧪 Starting unit test summary comment generation...");

  // Extract and validate workflow context from environment variables
  core.debug("Extracting workflow context from environment...");
  const workflowContext = extractWorkflowContext(core);
  if (workflowContext === null) {
    core.error("❌ Cannot proceed without valid workflow context");
    return;
  }

  const {commitSha, runId, branchName, jobStatus} = workflowContext;
  const repoOwner = context.repo.owner;
  const repoName = context.repo.repo;

  core.info(`🔧 Workflow context: ${repoOwner}/${repoName}, Branch: ${branchName}, Status: ${jobStatus}`);
  core.debug(`Commit SHA: ${commitSha.substring(0, 7)}..., Run ID: ${runId}`);

  const shortCommitSha = commitSha.substring(0, 7);
  const workflowRunUrl = `https://github.com/${repoOwner}/${repoName}/actions/runs/${runId}`;
  const commitUrl = `https://github.com/${repoOwner}/${repoName}/commit/${commitSha}`;
  const prUrl = context.payload.pull_request?.html_url || "";
  const prNumber = context.payload.pull_request?.number || 0;

  // Construct workflow information object for comment generation
  const workflowInfo: WorkflowInfo = {
    runId,
    workflowRunUrl,
    shortCurrentCommitSha: shortCommitSha,
    commitUrl,
    branchName,
    jobStatus,
    prNumber,
    prUrl,
  };

  // Generate the complete comment body with all test results and analysis
  core.info("📝 Building comprehensive comment body with test results and analysis...");
  const commentBody = await buildUnitTestSummaryCommentBody(workflowInfo, commitSha);
  core.debug(`✓ Comment body assembled: ${commentBody.length} characters, ${commentBody.split("\n").length} lines`);

  // Post the comment to the pull request using the core utility function
  await createPRComment(commentBody, branchName);
}
