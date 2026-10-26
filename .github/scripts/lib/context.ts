/**
 * @fileoverview Immutable, explicitly local or Actions workflow identity.
 * @module github/scripts/lib/context
 *
 * @remarks
 * The pure builder decodes supplied values once. The explicit capture adapter
 * acquires cwd/checked-out SHA through brokers; neither selects action status.
 * Environment/credentials are absent from the returned serializable context.
 */
import {DEFAULT_GITHUB_SERVER_URL} from "../helpers/constants.ts";
import {createEnvironmentHelper, getWorkingDirectory} from "../helpers/environment/index.ts";
import {createGitHelper} from "../helpers/git/index.ts";

/** Wall time for evidence and monotonic time for elapsed durations. */
export interface Clock {
  readonly now: () => Date;
  readonly monotonicMs: () => number;
}

/** Production clock; callers inject a fixed/scripted clock in deterministic tests. */
export const systemClock: Clock = Object.freeze({now: () => new Date(), monotonicMs: () => performance.now()});

/**
 * Captures actual checkout identity before invoking the pure context decoder.
 * @param variables - Explicit environment snapshot, never retained in the context.
 * @param options - Required execution mode and optional injected clock.
 * @returns Validated immutable metadata for the actual checked-out commit.
 * @throws Original Git errors or explicit metadata-validation errors.
 */
export async function captureWorkflowContext(
  variables: Readonly<Record<string, string | undefined>>,
  options: Readonly<{mode: "actions" | "local"; clock?: Clock}>,
): Promise<WorkflowContext> {
  const workspaceRoot = createEnvironmentHelper(variables).get("GITHUB_WORKSPACE") ?? getWorkingDirectory();
  const commit = await createGitHelper({cwd: workspaceRoot}).getCommit("HEAD");
  return buildWorkflowContext(variables, {mode: options.mode, workspaceRoot, commitSha: commit.sha, clock: options.clock ?? systemClock});
}

/** Validated reporting identity, never an environment/credential container. */
export interface WorkflowContext {
  readonly mode: "actions" | "local";
  readonly workspaceRoot: string;
  readonly commitSha: string;
  readonly baseRef: string;
  readonly headRef: string;
  readonly branchName: string;
  readonly repoOwner: string;
  readonly repoName: string;
  readonly prNumber: number | null;
  readonly workflowRunId: string;
  readonly workflowRunAttempt: number;
  readonly workflowRunNumber: string;
  readonly workflowName: string;
  readonly eventName: string;
  readonly serverUrl: string;
  readonly workflowRunUrl: string;
  readonly generatedAt: string;
}

/** A missing/invalid configuration field; its raw value is not included. */
export class WorkflowContextError extends Error {
  /**
   * Describes the violated field contract without echoing possible credentials.
   * @param field - Environment/configuration field name.
   * @param requirement - Expected shape or presence.
   */
  constructor(field: string, requirement: string) {
    super(`Workflow context field '${field}' ${requirement}`);
    this.name = "WorkflowContextError";
  }
}

/**
 * Builds validated workflow identity without global failure or publication effects.
 * @param variables - Supplied environment snapshot; only recognized metadata is retained.
 * @param options - Explicit mode, workspace, checked-out commit, and clock.
 * @returns A frozen context; local mode has no remote workflow-run URL.
 * @throws {WorkflowContextError} When required Actions identity or supplied metadata is invalid.
 */
export function buildWorkflowContext(
  variables: Readonly<Record<string, string | undefined>>,
  options: Readonly<{mode: "actions" | "local"; workspaceRoot: string; commitSha: string; clock: Clock}>,
): WorkflowContext {
  const source = createEnvironmentHelper(variables);
  const first = (keys: readonly string[]): string | undefined => {
    for (const key of keys) {
      const value = source.get(key);
      if (value !== undefined) return value.trim();
    }
    return undefined;
  };
  const identity = (keys: readonly string[], local: string): string => {
    const value = first(keys);
    if (value !== undefined) return value;
    if (options.mode === "local") return local;
    throw new WorkflowContextError(keys.join("/"), "is required in Actions mode");
  };
  const positiveInteger = (raw: string, field: string): number => {
    const value = Number(raw);
    if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(value)) {
      throw new WorkflowContextError(field, "must be a positive safe integer");
    }
    return value;
  };

  if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(options.commitSha)) {
    throw new WorkflowContextError("commitSha", "must identify the checked-out commit");
  }
  if (options.workspaceRoot.trim().length === 0) throw new WorkflowContextError("workspaceRoot", "is required");

  const repository = identity(["GITHUB_REPOSITORY"], "local/local");
  const [repoOwner, repoName, extra] = repository.split("/");
  if (!repoOwner || !repoName || extra !== undefined) {
    throw new WorkflowContextError("GITHUB_REPOSITORY", "must be owner/repository");
  }
  const workflowRunId = identity(["RUN_ID", "GITHUB_RUN_ID"], "local");
  const workflowRunNumber = identity(["RUN_NUMBER", "GITHUB_RUN_NUMBER"], "local");
  if (options.mode === "actions") {
    if (!/^[1-9]\d*$/.test(workflowRunId)) throw new WorkflowContextError("RUN_ID/GITHUB_RUN_ID", "must be positive digits");
    if (!/^[1-9]\d*$/.test(workflowRunNumber)) throw new WorkflowContextError("RUN_NUMBER/GITHUB_RUN_NUMBER", "must be positive digits");
  }
  const workflowRunAttempt = positiveInteger(identity(["RUN_ATTEMPT", "GITHUB_RUN_ATTEMPT"], "1"), "GITHUB_RUN_ATTEMPT");
  const workflowName = identity(["WORKFLOW", "GITHUB_WORKFLOW"], "Local script");
  const eventName = identity(["EVENT_NAME", "GITHUB_EVENT_NAME"], "local");
  const headRef = first(["HEAD_REF"]) ?? options.commitSha;
  const baseRef = first(["BASE_REF"]) ?? "origin/main";
  const branchName = first(["BRANCH_NAME", "GITHUB_REF_NAME"]) ?? headRef;
  const rawPrNumber = first(["PR_NUMBER"]);
  const prNumber = rawPrNumber === undefined ? null : positiveInteger(rawPrNumber, "PR_NUMBER");
  const rawServer = first(["SERVER_URL", "GITHUB_SERVER_URL"]) ?? DEFAULT_GITHUB_SERVER_URL;
  let server: URL;
  try {
    server = new URL(rawServer);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new WorkflowContextError("GITHUB_SERVER_URL", "must be an absolute HTTP(S) URL");
  }
  if (!["http:", "https:"].includes(server.protocol) || server.username || server.password || server.search || server.hash) {
    throw new WorkflowContextError("GITHUB_SERVER_URL", "must be an HTTP(S) server URL without credentials, query, or fragment");
  }
  const serverUrl = server.href.replace(/\/$/, "");
  const now = options.clock.now();
  if (!Number.isFinite(now.getTime())) throw new WorkflowContextError("clock", "must return a valid date");

  return Object.freeze({
    mode: options.mode,
    workspaceRoot: options.workspaceRoot,
    commitSha: options.commitSha,
    baseRef,
    headRef,
    branchName,
    repoOwner,
    repoName,
    prNumber,
    workflowRunId,
    workflowRunAttempt,
    workflowRunNumber,
    workflowName,
    eventName,
    serverUrl,
    workflowRunUrl: options.mode === "local" ? "" : `${serverUrl}/${repoOwner}/${repoName}/actions/runs/${workflowRunId}`,
    generatedAt: now.toISOString(),
  });
}
