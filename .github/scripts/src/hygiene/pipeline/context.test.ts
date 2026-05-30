import {describe, it, expect} from "vitest";
import {buildContextFromEnv} from "./context.ts";

describe("buildContextFromEnv", () => {
  it("reads HEAD_REF/BASE_REF and falls back", () => {
    const ctx = buildContextFromEnv({
      GITHUB_WORKSPACE: "/tmp/work",
      GITHUB_SHA: "deadbeef",
      GITHUB_RUN_ID: "777",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "owner/repo",
    });
    expect(ctx.workspaceRoot).toBe("/tmp/work");
    expect(ctx.headRef).toBe("deadbeef");
    expect(ctx.baseRef).toBe("origin/main");
    expect(ctx.workflowRunId).toBe("777");
    expect(ctx.workflowRunUrl).toBe("https://github.com/owner/repo/actions/runs/777");
    expect(ctx.prNumber).toBeNull();
  });

  it("prefers HEAD_REF / BASE_REF over GITHUB_SHA", () => {
    const ctx = buildContextFromEnv({
      GITHUB_WORKSPACE: "/w",
      GITHUB_SHA: "deadbeef",
      HEAD_REF: "abc123",
      BASE_REF: "origin/preview",
      GITHUB_RUN_ID: "1",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "x/y",
    });
    expect(ctx.headRef).toBe("abc123");
    expect(ctx.baseRef).toBe("origin/preview");
  });

  it("parses PR_NUMBER as integer", () => {
    const ctx = buildContextFromEnv({
      GITHUB_WORKSPACE: "/w",
      GITHUB_SHA: "x",
      PR_NUMBER: "42",
      GITHUB_RUN_ID: "1",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "x/y",
    });
    expect(ctx.prNumber).toBe(42);
  });

  it("ignores invalid PR_NUMBER", () => {
    const ctx = buildContextFromEnv({
      GITHUB_WORKSPACE: "/w",
      GITHUB_SHA: "x",
      PR_NUMBER: "not-a-number",
      GITHUB_RUN_ID: "1",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "x/y",
    });
    expect(ctx.prNumber).toBeNull();
  });

  it("defaults workspaceRoot to cwd when unset", () => {
    const ctx = buildContextFromEnv({
      GITHUB_SHA: "x",
      GITHUB_RUN_ID: "1",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "x/y",
    });
    expect(ctx.workspaceRoot).toBe(process.cwd());
  });
});
