/**
 * @fileoverview Per-provider check-runs projection.
 * @module github/scripts/src/hygiene/projections/statusChecks
 *
 * @remarks
 * One check-run per provider so branch protection can enforce individual gates
 * (e.g., require hygiene/format but not hygiene/stats).
 */

import type {GateResult, HygieneReport, ProviderOutcome} from "../domain/types.ts";

export type Conclusion = "success" | "failure" | "neutral" | "skipped";

export interface CheckRunPayload {
  readonly name: string;
  readonly head_sha: string;
  readonly status: "completed";
  readonly conclusion: Conclusion;
  readonly output: {
    readonly title: string;
    readonly summary: string;
  };
}

function gateResultToConclusion(r: GateResult): Conclusion {
  switch (r) {
    case "passed": return "success";
    case "advisory": return "neutral";
    case "failed": return "failure";
    case "errored": return "failure";
  }
}

export function outcomeToCheckRun(o: ProviderOutcome<unknown>, headSha: string): CheckRunPayload {
  const errs = o.findings.filter((f) => f.severity === "error" || f.severity === "critical").length;
  const warns = o.findings.filter((f) => f.severity === "warning").length;
  return {
    name: `hygiene/${o.providerId}`,
    head_sha: headSha,
    status: "completed",
    conclusion: gateResultToConclusion(o.gateResult),
    output: {
      title: `${o.providerIcon} ${o.providerName}: ${o.gateResult}`,
      summary: `${o.findings.length} total finding(s) (${errs} err / ${warns} warn) in ${o.durationMs}ms`,
    },
  };
}

export interface StatusChecksDeps {
  readonly owner: string;
  readonly repo: string;
  create(args: CheckRunPayload & {owner: string; repo: string}): Promise<unknown>;
}

export async function postStatusChecks(report: HygieneReport, deps: StatusChecksDeps): Promise<void> {
  for (const outcome of report.outcomes) {
    const payload = outcomeToCheckRun(outcome, report.commitSha);
    await deps.create({...payload, owner: deps.owner, repo: deps.repo});
  }
}
