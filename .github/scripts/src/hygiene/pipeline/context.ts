/**
 * @fileoverview Shared pipeline execution context.
 * @module github/scripts/src/hygiene/pipeline/context
 *
 * @remarks
 * Pure function: env vars in, immutable context out. No I/O, no logging.
 */

export interface PipelineContext {
  readonly workspaceRoot: string;
  readonly baseRef: string;
  readonly headRef: string;
  readonly prNumber: number | null;
  readonly workflowRunId: string;
  readonly workflowRunUrl: string;
  readonly repoOwner: string;
  readonly repoName: string;
  readonly env: NodeJS.ProcessEnv;
}

/**
 * Builds a PipelineContext from environment variables.
 * @param env -- a record of env vars (usually `process.env`)
 */
export function buildContextFromEnv(env: Record<string, string | undefined>): PipelineContext {
  const workspaceRoot = env["GITHUB_WORKSPACE"] ?? process.cwd();
  const headRef = env["HEAD_REF"] ?? env["GITHUB_SHA"] ?? "HEAD";
  const baseRef = env["BASE_REF"] ?? "origin/main";
  const workflowRunId = env["GITHUB_RUN_ID"] ?? "0";
  const serverUrl = env["GITHUB_SERVER_URL"] ?? "https://github.com";
  const repository = env["GITHUB_REPOSITORY"] ?? "owner/repo";
  const [repoOwner, repoName] = repository.split("/", 2);

  let prNumber: number | null = null;
  if (env["PR_NUMBER"]) {
    const n = parseInt(env["PR_NUMBER"], 10);
    if (Number.isFinite(n)) prNumber = n;
  }

  return {
    workspaceRoot,
    baseRef,
    headRef,
    prNumber,
    workflowRunId,
    workflowRunUrl: `${serverUrl}/${repository}/actions/runs/${workflowRunId}`,
    repoOwner: repoOwner ?? "owner",
    repoName: repoName ?? "repo",
    env: env as NodeJS.ProcessEnv,
  };
}
