/**
 * @fileoverview Unit/coverage/browser report composition over explicit broker capabilities.
 * @module github/scripts/lib/unit-tests/report
 */
import {resolve} from "node:path";
import {STATUS_EMOJI_UNIT_TESTS} from "../../helpers/constants.ts";
import {MarkdownUtils} from "../../helpers/comments/index.ts";
import type {IGitHelper} from "../../helpers/git/index.ts";
import type {IFileSystemHelper} from "../../helpers/filesystem/index.ts";
import type {IVitestHelper} from "../../helpers/vitest/index.ts";
import type {IPlaywrightHelper} from "../../helpers/playwright/index.ts";
import type {IGitHubHelper} from "../../helpers/github/index.ts";
import type {WorkflowContext} from "../context.ts";
import {publishAll, type PublicationResult} from "../reporting/projections.ts";

/** Compatible workflow/header metadata shared with existing type imports. */
export interface WorkflowInfo {
  readonly prNumber: number;
  readonly prUrl: string;
  readonly runId: string;
  readonly workflowRunUrl: string;
  readonly shortCurrentCommitSha: string;
  readonly commitUrl: string;
  readonly branchName: string;
  readonly jobStatus: string;
}

/** Explicit resource/parser/publisher capabilities; no raw SDK or environment records. */
export interface UnitReportDependencies {
  readonly git: IGitHelper;
  readonly files: IFileSystemHelper;
  readonly vitest: IVitestHelper;
  readonly playwright: IPlaywrightHelper;
  readonly github: IGitHubHelper | null;
  readonly jobStatus: "success" | "failure" | "cancelled" | "skipped" | "unknown";
  readonly paths: Readonly<{coverage: string; playwright: string}>;
}

function diagnostic(error: unknown): string {
  return error instanceof SyntaxError ? "Invalid JSON report" : error instanceof Error ? error.message : "Unknown report error";
}

function header(context: WorkflowContext, dependencies: UnitReportDependencies, prNumber: number, prUrl: string): string {
  const status = dependencies.jobStatus;
  let section = `## ${STATUS_EMOJI_UNIT_TESTS[status]} Test Results: ${status.charAt(0).toUpperCase() + status.slice(1)}\n\n`;
  section += "| Property | Value |\n|----------|-------|\n";
  section += `| **Commit** | [\`${context.commitSha.slice(0, 7)}\`](${context.serverUrl}/${context.repoOwner}/${context.repoName}/commit/${context.commitSha}) |\n`;
  section += `| **Branch** | \`${MarkdownUtils.tableCell(context.branchName)}\` |\n`;
  section += `| **Workflow** | [Run #${context.workflowRunId}](${context.workflowRunUrl}) |\n`;
  if (prNumber > 0) section += `| **Pull Request** | [#${prNumber}](${prUrl}) |\n`;
  return `${section}\n----\n`;
}

async function branchComparison(context: WorkflowContext, git: IGitHelper): Promise<string> {
  let main = "Error";
  let count = "Error";
  try {
    await git.fetchBranch("main", "origin", 50);
    main = (await git.getCommit("refs/remotes/origin/main")).shortSha;
    count = String(await git.getCommitCount("refs/remotes/origin/main", context.commitSha));
  } catch (error) {
    return `### 📊 Branch Comparison\n\n> ⚠️ Failed to retrieve main branch information: ${diagnostic(error)}\n\n----\n`;
  }
  return `### 📊 Branch Comparison\n\n| Branch          | SHA         | Commits vs. Main |\n|-----------------|-------------|------------------|\n| **Main**        | \`${main}\`   | -                |\n| **Current**     | \`${context.commitSha.slice(0, 7)}\`   | +${count}           |\n\n----\n`;
}

async function coverageSection(context: WorkflowContext, dependencies: UnitReportDependencies): Promise<string> {
  const path = resolve(context.workspaceRoot, dependencies.paths.coverage);
  try {
    if (!(await dependencies.files.exists(path))) return "### 🧪 Vitest Unit Tests\n\n> ⚠️ Coverage data not available\n\n----\n";
    const coverage = await dependencies.vitest.parseCoverage(path, dependencies.files);
    return dependencies.vitest.generateMarkdownSection(coverage, {useEmoji: true, title: "🧪 Vitest Unit Tests"});
  } catch (error) {
    return `### 🧪 Vitest Unit Tests\n\n> ⚠️ Could not read coverage data: ${diagnostic(error)}\n\n----\n`;
  }
}

async function browserSection(context: WorkflowContext, dependencies: UnitReportDependencies): Promise<string> {
  const path = resolve(context.workspaceRoot, dependencies.paths.playwright);
  try {
    if (!(await dependencies.files.exists(path)))
      return `### 🎭 Playwright Tests\n\n> ⚠️ Playwright results report not available. No browser assertions were parsed.\n\nJob status (inferred): \`${dependencies.jobStatus}\`.\n\n[View workflow artifacts](${context.workflowRunUrl}#artifacts)\n\n----\n`;
    const report = await dependencies.playwright.parseResults(path, dependencies.files);
    return dependencies.playwright.generateMarkdownSection(report, {
      workflowRunUrl: context.workflowRunUrl,
      includeFailureDetails: true,
      includeFlakyTests: true,
      maxFailuresToShow: 10,
      showDuration: true,
    });
  } catch (error) {
    return `### 🎭 Playwright Tests\n\n> ⚠️ Could not read Playwright results: ${diagnostic(error)}\n\n${dependencies.playwright.generateSimpleSection("unknown", context.workflowRunUrl)}`;
  }
}

/**
 * Preserves the existing comment sections and PR discovery without ambient inputs.
 * @param context - Immutable checked-out/run identity and deterministic timestamp.
 * @param dependencies - Configured brokers, parsers, status, and report locations.
 * @returns Explicit optional publication results; missing and malformed data remain distinct.
 * @remarks This action posts a new comment as before; it does not acquire a new
 * marker/ownership policy or change the website workflow. Optional API failures
 * are retained rather than disguised as "no PR".
 */
export async function runUnitTestReport(
  context: WorkflowContext,
  dependencies: UnitReportDependencies,
): Promise<readonly PublicationResult[]> {
  return publishAll(context, [
    {
      name: "unit-test-comment",
      required: false,
      async run() {
        const github = dependencies.github;
        if (context.mode === "local" || !github) return {status: "skipped", reason: "Remote comment publication is not configured"};
        const pr = github.getPullRequest() ?? (await github.findPullRequestForBranch(context.branchName));
        if (!pr) return {status: "skipped", reason: "No open PR context found for this branch"};
        let body = header(context, dependencies, pr.number, pr.url);
        body += await branchComparison(context, dependencies.git);
        body += await coverageSection(context, dependencies);
        body += await browserSection(context, dependencies);
        body += `\n<sub>🤖 Generated by CI at ${context.generatedAt}</sub>\n`;
        await github.postPullRequestComment(pr.number, body);
        return {status: "published"};
      },
    },
  ]);
}
