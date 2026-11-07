/** Test-owned planning fixtures; never imported by production code. */
import type {GitChange, GitChangeSet} from "../../../helpers/git/index.ts";
import {buildWorkflowContext, type WorkflowContext} from "../../context.ts";
import type {WorkspaceInspection} from "../types.ts";

export const HEAD = "a".repeat(40);
export const BASE = "b".repeat(40);

export function context(overrides: Partial<WorkflowContext> = {}): WorkflowContext {
  return {
    ...buildWorkflowContext(
      {
        GITHUB_REPOSITORY: "owner/repo",
        GITHUB_RUN_ID: "123",
        GITHUB_RUN_ATTEMPT: "1",
        GITHUB_RUN_NUMBER: "9",
        GITHUB_WORKFLOW: "Hygiene",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_HEAD_REF: "feature",
      },
      {
        mode: "actions",
        workspaceRoot: process.cwd(),
        commitSha: HEAD,
        clock: {now: () => new Date("2026-01-01T00:00:00Z"), monotonicMs: () => 0},
      },
    ),
    ...overrides,
  };
}
export function changes(entries: readonly GitChange[] = []): GitChangeSet {
  return {scope: "known", baseSha: BASE, headSha: HEAD, entries};
}
export function workspace(): WorkspaceInspection {
  return {
    kind: "available",
    durationMs: 1,
    value: {
      projects: [
        {name: "canonical-ui", root: "packages/components", targets: ["test"]},
        {name: "canonical-site", root: "sites/arolariu.ro", targets: ["test"]},
        {name: "api", root: "sites/api.arolariu.ro", targets: ["test"]},
        {name: "python", root: "sites/exp.arolariu.ro", targets: ["test"]},
        {name: "cv", root: "sites/cv.arolariu.ro", targets: ["test"]},
        {name: "status", root: "sites/status.arolariu.ro", targets: ["test"]},
      ],
      dependencies: [{source: "canonical-site", target: "canonical-ui"}],
      cycles: [],
    },
  };
}
