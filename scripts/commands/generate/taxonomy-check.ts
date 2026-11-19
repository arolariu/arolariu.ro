import {Clock, Effect, FileSystem, Result} from "effect";

import {inspectTaxonomySnapshots, type TaxonomyFreshness} from "../../common/taxonomy-snapshots.ts";
import {Environment} from "../../platform/Environment.ts";
import {ReportedFailure} from "../../platform/exit.ts";
import {ReadOnlyFiles} from "../../platform/Files.ts";
import {Presenter, toJsonValue} from "../../platform/Output.ts";

const ageLabels = {
  fresh: {label: "Fresh", marker: "🟢", color: ""},
  "review-due": {label: "Review due", marker: "🟡", color: "\u001b[33m"},
  overdue: {label: "Refresh overdue", marker: "🔴", color: "\u001b[31m"},
  "unknown-age": {label: "Unknown age", marker: "⚪", color: ""},
} as const satisfies Record<TaxonomyFreshness, {label: string; marker: string; color: string}>;

/** Reports pinned snapshot integrity and age; only integrity can fail the check. */
export const checkTaxonomies: (
  json: boolean,
) => Effect.Effect<void, ReportedFailure, Environment | FileSystem.FileSystem | ReadOnlyFiles | Presenter> = Effect.fn(
  "generate.checkTaxonomies",
)(function* (json: boolean) {
  const environment = yield* Environment;
  const presenter = yield* Presenter;
  const now = new Date(yield* Clock.currentTimeMillis);
  const {snapshots, issues} = yield* inspectTaxonomySnapshots(environment.cwd, now);
  const inActions = environment.variables["GITHUB_ACTIONS"] === "true";
  const actions = !json && inActions;
  const reportedIssues = inActions
    ? issues.map((issue) => ({
        ...issue,
        message: `Pinned taxonomy snapshot '${issue.fileName}' failed integrity validation (${issue.kind}).`,
      }))
    : issues;
  const rows = ["### Pinned taxonomy snapshots", "", "| Taxonomy | Captured (UTC) | Status |", "| --- | --- | --- |"];
  for (const snapshot of snapshots) {
    const {label, marker, color} = ageLabels[snapshot.freshness];
    const taxonomy = `${snapshot.system} ${snapshot.version}`;
    const statement = `${label}: ${taxonomy}, captured ${snapshot.generatedAt}`;
    yield* presenter.line("stdout", color && (actions || environment.stdoutIsTTY) ? `${color}${statement}\u001b[0m` : statement);
    rows.push(`| ${taxonomy} | ${snapshot.generatedAt} | ${marker} ${label} |`);
    if (actions && snapshot.freshness !== "fresh") {
      // All fields in the annotation are pinned constants or a validated ISO date.
      yield* presenter.line("stdout", `::warning::${statement}`);
    }
  }
  for (const issue of reportedIssues) {
    yield* presenter.fatal(issue.message.replace(/[\r\n]/gu, " "));
    rows.push(`| ${issue.fileName} | — | Invalid snapshot |`);
  }
  const summaryPath = actions ? environment.variables["GITHUB_STEP_SUMMARY"] : undefined;
  if (summaryPath) {
    const fs = yield* FileSystem.FileSystem;
    const written = yield* Effect.result(fs.writeFileString(summaryPath, `${rows.join("\n")}\n\n`, {flag: "a"}));
    if (Result.isFailure(written)) yield* Effect.logWarning("Could not write the GitHub Actions taxonomy summary.");
  }
  yield* Effect.orDie(presenter.json(toJsonValue({snapshots, issues: reportedIssues})));
  if (issues.length > 0) {
    return yield* new ReportedFailure({exitCode: 1, message: "Recover both approved taxonomy copies from version control."});
  }
});
