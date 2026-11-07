/**
 * @fileoverview PR comment projection -- single upserted comment per PR.
 * @module github/scripts/src/hygiene/projections/prComment
 */

import {buildStepSummary} from "./stepSummary.ts";
import type {HygieneReport} from "../domain/types.ts";
import {GITHUB_CONSTANTS} from "../../../lib/workflow-constants.ts";

/** Compatibility export of the active, unchanged lib-owned marker. */
export const HYGIENE_V3_COMMENT_ID = GITHUB_CONSTANTS.HYGIENE_COMMENT_ID;

/**
 * Minimal GitHub helper interface needed by this projection (avoids hard dep on full helper).
 */
export interface GitHubCommentUpserter {
  upsertComment(prNumber: number, body: string, identifier: string): Promise<unknown>;
}

export function buildPrCommentMarkdown(report: HygieneReport): string {
  return [HYGIENE_V3_COMMENT_ID, "", buildStepSummary(report)].join("\n");
}

export async function postPrComment(report: HygieneReport, helper: GitHubCommentUpserter): Promise<void> {
  if (report.prNumber === null) return;
  const body = buildPrCommentMarkdown(report);
  await helper.upsertComment(report.prNumber, body, HYGIENE_V3_COMMENT_ID);
}
