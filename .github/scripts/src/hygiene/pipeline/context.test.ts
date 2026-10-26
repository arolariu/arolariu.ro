import {describe, expect, it} from "vitest";
import {buildContextFromEnv} from "./context.ts";

describe("canonical context compatibility", () => {
  const options = {
    mode: "actions" as const,
    workspaceRoot: "/workspace",
    commitSha: "a".repeat(40),
    clock: {now: () => new Date("2026-01-01T00:00:00Z"), monotonicMs: () => 0},
  };
  const variables = {
    GITHUB_REPOSITORY: "owner/repo",
    GITHUB_RUN_ID: "123",
    GITHUB_RUN_NUMBER: "9",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_WORKFLOW: "Hygiene",
    GITHUB_EVENT_NAME: "pull_request",
  };
  it("uses actual supplied checkout identity and validates PR metadata", () => {
    expect(buildContextFromEnv({...variables, GITHUB_SHA: "wrong event sha", PR_NUMBER: "42"}, options)).toMatchObject({
      commitSha: options.commitSha,
      prNumber: 42,
      workflowRunUrl: "https://github.com/owner/repo/actions/runs/123",
    });
    expect(() => buildContextFromEnv({...variables, PR_NUMBER: "not-an-integer"}, options)).toThrow();
  });
  it("requires explicit Actions identity and never fabricates a local remote URL", () => {
    expect(() => buildContextFromEnv({}, options)).toThrow();
    expect(buildContextFromEnv({}, {...options, mode: "local"}).workflowRunUrl).toBe("");
  });
});
