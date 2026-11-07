/**
 * @fileoverview Existing date-based live-incident publication behind the GitHub broker.
 * @module github/scripts/lib/live-tests/publish
 */
import {AUTOMATED_TEST_FAILURE_LABELS} from "../../helpers/constants.ts";
import type {IGitHubHelper} from "../../helpers/github/index.ts";
import type {WorkflowContext} from "../context.ts";
import type {PublicationResult} from "../reporting/projections.ts";
import type {LiveReport} from "./results.ts";

/**
 * Preserves current UTC-date deduplication, labels, assignee, and required failure policy.
 * @param context - Explicit run/repository identity; local mode never publishes.
 * @param report - Reduced execution truth.
 * @param body - Already bounded, redacted issue Markdown.
 * @param githubHelper - Configured complete native-client-backed broker.
 * @returns Published/skipped/failed result; the entrypoint rethrows a required failure.
 */
export async function publishLiveFailure(
  context: WorkflowContext,
  report: LiveReport,
  body: string,
  githubHelper: IGitHubHelper,
): Promise<PublicationResult> {
  const common = {name: "live-failure-issue", required: true};
  if (context.mode === "local") return {...common, status: "skipped", reason: "Local mode does not publish incidents"};
  if (!report.hasFailures) return {...common, status: "skipped", reason: "No test failures detected"};
  const date = context.generatedAt.split("T")[0] ?? "";
  try {
    const result = await githubHelper.getClient().rest.search.issuesAndPullRequests({
      order: "desc",
      per_page: 10,
      q: `is:issue repo:${context.repoOwner}/${context.repoName} in:title "${date}" label:${AUTOMATED_TEST_FAILURE_LABELS[0]}`,
      sort: "created",
    });
    const existing = result.data.items.find((issue) => issue.state === "open");
    if (existing) return {...common, status: "skipped", reason: `Existing open issue found: #${existing.number}`};
    const issue = await githubHelper.createIssue(
      `[${date}] Hourly Live Test Failed 🚨`,
      body,
      [...AUTOMATED_TEST_FAILURE_LABELS],
      ["arolariu"],
    );
    return {...common, status: "published", url: issue.url};
  } catch (error) {
    return {...common, status: "failed", message: error instanceof Error ? error.message : "Live incident publication failed", error};
  }
}
