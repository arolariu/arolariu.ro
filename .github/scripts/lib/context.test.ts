import {existsSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {beforeAll, describe, expect, it} from "vitest";
import type {Clock, WorkflowContext} from "./context.ts";

let contextModule: typeof import("./context.ts") | undefined;
const clock: Clock = {now: () => new Date("2026-10-25T12:00:00.000Z"), monotonicMs: () => 100};
const options = {mode: "actions", workspaceRoot: resolve("workspace"), commitSha: "a".repeat(40), clock} as const;
const variables = {
  GITHUB_REPOSITORY: "owner/repository",
  GITHUB_RUN_ID: "123",
  GITHUB_RUN_ATTEMPT: "2",
  GITHUB_RUN_NUMBER: "7",
  GITHUB_WORKFLOW: "Hygiene",
  GITHUB_EVENT_NAME: "pull_request",
  GITHUB_REF_NAME: "feature",
  PR_NUMBER: "42",
  GITHUB_TOKEN: "never-serialize-this-sentinel",
};

function build(input: Readonly<Record<string, string | undefined>>, local = false): WorkflowContext {
  expect(contextModule?.buildWorkflowContext).toBeTypeOf("function");
  if (!contextModule) throw new Error("Workflow context API is unavailable");
  return contextModule.buildWorkflowContext(input, {...options, mode: local ? "local" : "actions"});
}

beforeAll(async () => {
  const url = new URL("./context.ts", import.meta.url);
  if (existsSync(fileURLToPath(url))) contextModule = await import(url.href);
});

describe("workflow context", () => {
  it("captures real Actions identity and an injected timestamp without environment secrets", () => {
    const context = build(variables);
    expect(context.workflowRunId).toBe("123");
    expect(context.workflowRunAttempt).toBe(2);
    expect(context.prNumber).toBe(42);
    expect(context.workflowRunUrl).toBe("https://github.com/owner/repository/actions/runs/123");
    expect(context.generatedAt).toBe("2026-10-25T12:00:00.000Z");
    expect(context.commitSha).toBe("a".repeat(40));
    expect(JSON.stringify(context)).not.toContain("never-serialize-this-sentinel");
    expect(JSON.stringify(context)).not.toContain("GITHUB_TOKEN");
    expect(Object.isFrozen(context)).toBe(true);
  });

  it("honors the existing workflow variable aliases", () => {
    const context = build({...variables, RUN_ID: "456", WORKFLOW: "Live tests", SERVER_URL: "https://github.example/"});
    expect(context.workflowRunId).toBe("456");
    expect(context.workflowName).toBe("Live tests");
    expect(context.workflowRunUrl).toBe("https://github.example/owner/repository/actions/runs/456");
  });

  it("rejects missing Actions run identity instead of manufacturing a valid run", () => {
    expect(() => build({...variables, GITHUB_RUN_ID: undefined})).toThrow(/RUN_ID/);
  });

  it.each(["0", "2x", "1.5", "9007199254740992"])("rejects invalid run attempt %s", (attempt) => {
    expect(() => build({...variables, GITHUB_RUN_ATTEMPT: attempt})).toThrow(/ATTEMPT|attempt/);
  });

  it("rejects malformed repository identity", () => {
    expect(() => build({...variables, GITHUB_REPOSITORY: "owner/repository/extra"})).toThrow(/repository|GITHUB_REPOSITORY/);
  });

  it("keeps local execution explicit and does not manufacture a remote run URL", () => {
    const context = build({}, true);
    expect(context.mode).toBe("local");
    expect(context.workflowRunId).toBe("local");
    expect(context.workflowRunUrl).toBe("");
    expect(context.prNumber).toBeNull();
  });
});
