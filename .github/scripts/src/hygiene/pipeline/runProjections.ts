/**
 * @fileoverview Final pipeline gate: load outcomes, run projections, set exit code.
 * @module github/scripts/src/hygiene/pipeline/runProjections
 *
 * @remarks
 * This is the only script in the pipeline that can fail the workflow.
 * Projections are run via Promise.allSettled so a single projection failure
 * (e.g., transient GitHub API hiccup) does not starve other projections.
 *
 * CLI usage:
 *   node --experimental-strip-types runProjections.ts
 */

import * as core from "@actions/core";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {buildReport} from "../domain/buildReport.ts";
import type {HygieneReport, ProviderOutcome} from "../domain/types.ts";
import {buildContextFromEnv} from "./context.ts";
import {writeJsonArtifact} from "../projections/jsonArtifact.ts";
import {writeStepSummary} from "../projections/stepSummary.ts";
import {postPrComment} from "../projections/prComment.ts";
import {postStatusChecks} from "../projections/statusChecks.ts";

export interface Projection {
  readonly name: string;
  run(report: HygieneReport): Promise<void>;
}

export async function loadOutcomes(workspaceRoot: string): Promise<ProviderOutcome<unknown>[]> {
  const dir = path.join(workspaceRoot, "artifacts", "hygiene");
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const outcomes: ProviderOutcome<unknown>[] = [];
  for (const entry of entries) {
    if (!entry.startsWith("outcome-") || !entry.endsWith(".json")) continue;
    const content = await fs.readFile(path.join(dir, entry), "utf-8");
    outcomes.push(JSON.parse(content) as ProviderOutcome<unknown>);
  }
  return outcomes;
}

export async function runProjectionsCore(report: HygieneReport, projections: readonly Projection[]): Promise<number> {
  const results = await Promise.allSettled(projections.map((p) => p.run(report)));
  results.forEach((r, i) => {
    const proj = projections[i];
    if (!proj) return;
    if (r.status === "rejected") {
      core.warning(`Projection '${proj.name}' failed: ${(r.reason as Error)?.message ?? r.reason}`);
    } else {
      core.info(`Projection '${proj.name}' succeeded`);
    }
  });
  if (report.overallResult === "failed" || report.overallResult === "errored") {
    core.setFailed(`Hygiene check overall result: ${report.overallResult}`);
    return 1;
  }
  return 0;
}

export async function main(): Promise<void> {
  const ctx = buildContextFromEnv(process.env as Record<string, string | undefined>);
  const outcomes = await loadOutcomes(ctx.workspaceRoot);
  if (outcomes.length === 0) {
    core.warning("No outcome files found; nothing to project. This usually means all provider steps were skipped.");
  }
  const report = buildReport({
    outcomes,
    commitSha: ctx.headRef,
    prNumber: ctx.prNumber,
    workflowRunId: ctx.workflowRunId,
    workflowRunUrl: ctx.workflowRunUrl,
  });

  // Build projections list. The PR-comment / status-checks projections need a GitHub helper;
  // we lazily build it only if a token is present.
  const token = process.env["GITHUB_TOKEN"];
  const projections: Projection[] = [
    {name: "jsonArtifact", run: async (r) => { await writeJsonArtifact(r, ctx.workspaceRoot); }},
    {name: "stepSummary", run: async (r) => { await writeStepSummary(r); }},
  ];

  if (token) {
    const {createGitHubHelper} = await import("../../../helpers/github/index.ts");
    const gh = createGitHubHelper(token);
    projections.push({name: "prComment", run: async (r) => { await postPrComment(r, gh); }});
    // statusChecks: import @actions/github lazily
    const {getOctokit} = await import("@actions/github");
    const octokit = getOctokit(token);
    projections.push({
      name: "statusChecks",
      run: async (r) => {
        await postStatusChecks(r, {
          owner: ctx.repoOwner, repo: ctx.repoName,
          create: (args) => octokit.rest.checks.create(args as Parameters<typeof octokit.rest.checks.create>[0]),
        });
      },
    });
    // checksAnnotations: would need a checkRunId. Deferred -- annotations only ship in v3.1.
  }

  const code = await runProjectionsCore(report, projections);
  process.exit(code);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("runProjections.ts");
if (invokedDirectly) {
  void main();
}
