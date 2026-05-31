import {describe, it, expect, vi} from "vitest";
import {buildPrCommentMarkdown, postPrComment, HYGIENE_V3_COMMENT_ID, type GitHubCommentUpserter} from "./prComment.ts";
import type {HygieneReport} from "../domain/types.ts";

const report: HygieneReport = {
  schemaVersion: "3", commitSha: "abc", prNumber: 42,
  workflowRunId: "1", workflowRunUrl: "https://x/1",
  generatedAt: "2026-05-30T00:00:00.000Z",
  overallResult: "passed",
  outcomes: [],
};

function makeHelper(upsert: ReturnType<typeof vi.fn>): GitHubCommentUpserter {
  return {upsertComment: upsert as unknown as GitHubCommentUpserter["upsertComment"]};
}

describe("buildPrCommentMarkdown", () => {
  it("includes the v3 identifier token", () => {
    const md = buildPrCommentMarkdown(report);
    expect(md).toContain(HYGIENE_V3_COMMENT_ID);
  });

  it("includes overall result", () => {
    const md = buildPrCommentMarkdown(report);
    expect(md).toMatch(/Hygiene/);
  });
});

describe("postPrComment", () => {
  it("skips when prNumber is null", async () => {
    const upsert = vi.fn();
    await postPrComment({...report, prNumber: null}, makeHelper(upsert));
    expect(upsert).not.toHaveBeenCalled();
  });

  it("calls upsertComment with prNumber, body, identifier", async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    await postPrComment(report, makeHelper(upsert));
    expect(upsert).toHaveBeenCalledTimes(1);
    const call = upsert.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error("no call recorded");
    const [pr, body, id] = call as [number, string, string];
    expect(pr).toBe(42);
    expect(body).toContain(HYGIENE_V3_COMMENT_ID);
    expect(id).toBe(HYGIENE_V3_COMMENT_ID);
  });
});
