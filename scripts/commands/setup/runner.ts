/**
 * @fileoverview Dependency-aware sequential setup phase runner.
 * @module scripts/commands/setup/runner
 *
 * @remarks
 * Ports the legacy setup phase loop. Phases run one at a time in declaration order, so prompts,
 * package managers, and local configuration writes never race and every phase observes the result
 * of every earlier phase. A phase whose dependency did not satisfy it is skipped with evidence that
 * names the blocking dependency; a phase defect becomes one `failed` result and setup continues
 * with the independent phases; an interruption cancels the whole run. Each phase renders its
 * section heading, result line, and evidence under the `[arolariu::setup::<phase id>]` context.
 */

import {Clock, Effect} from "effect";

import {Presenter, withLogContext} from "../../platform/Output.ts";
import type {SetupContext, SetupPhaseDefinition, SetupPhaseResult, SetupRequirements} from "./types.ts";

/** Overall readiness of one completed setup run. */
export type SetupOutcome = "ready" | "degraded" | "failed";

/**
 * Formats a phase duration as whole milliseconds.
 *
 * @param durationMs - The elapsed duration.
 * @returns `<n>ms`, never negative.
 */
export function formatSetupDuration(durationMs: number): string {
  return `${Math.max(0, Math.round(durationMs))}ms`;
}

/**
 * Reads the message of a phase defect.
 *
 * @param defect - The defect value.
 * @returns `defect.message` for an `Error`, otherwise `String(defect)`.
 */
function defectMessage(defect: unknown): string {
  return defect instanceof Error ? defect.message : String(defect);
}

/**
 * Describes why a dependency did not satisfy a downstream phase.
 *
 * @param dependencyId - Identifier of the unmet dependency.
 * @param dependencyResult - The dependency's recorded result, if any.
 * @returns Evidence naming the exact blocking dependency and its state.
 */
function unmetDependencyEvidence(dependencyId: string, dependencyResult: SetupPhaseResult | undefined): string {
  if (dependencyResult === undefined) {
    return `Dependency '${dependencyId}' was not defined or had not run before this phase.`;
  }
  return `Dependency '${dependencyId}' has status '${dependencyResult.status}', not 'succeeded' or 'degraded'.`;
}

/**
 * Determines whether a completed dependency satisfies a downstream phase.
 *
 * @remarks
 * A `succeeded` or `degraded` dependency always satisfies. During a dry run, a dependency the
 * runner did not itself skip may also be a `skipped` result whose mutations were merely planned;
 * that remains traversable so downstream phases still plan their own actions.
 *
 * @param dependencyResult - The dependency's recorded result, if any.
 * @param dryRun - Whether setup is planning mutations instead of applying them.
 * @param blockerSkipIds - Identifiers of runner-synthesized skips.
 * @returns Whether the dependency is satisfied.
 */
function isDependencySatisfied(
  dependencyResult: SetupPhaseResult | undefined,
  dryRun: boolean,
  blockerSkipIds: ReadonlySet<string>,
): boolean {
  if (dependencyResult === undefined) {
    return false;
  }
  if (dependencyResult.status === "succeeded" || dependencyResult.status === "degraded") {
    return true;
  }
  return dependencyResult.status === "skipped" && dryRun && !blockerSkipIds.has(dependencyResult.id);
}

/**
 * Finds the first declared dependency that does not satisfy a phase.
 *
 * @param phase - The phase about to run.
 * @param resultById - Every earlier result by phase id.
 * @param dryRun - Whether setup is planning mutations instead of applying them.
 * @param blockerSkipIds - Identifiers of runner-synthesized skips.
 * @returns The unmet dependency id, or `undefined` when every dependency is satisfied.
 */
function findUnmetDependency(
  phase: Readonly<SetupPhaseDefinition>,
  resultById: ReadonlyMap<string, SetupPhaseResult>,
  dryRun: boolean,
  blockerSkipIds: ReadonlySet<string>,
): string | undefined {
  return phase.dependsOn.find((dependencyId) => !isDependencySatisfied(resultById.get(dependencyId), dryRun, blockerSkipIds));
}

/**
 * Renders one phase's status, duration, summary, and evidence.
 *
 * @remarks
 * `succeeded` is a success line (stdout), `degraded` and `skipped` are warnings and `failed` is an
 * error (stderr); each evidence line follows as `  - <line>` on stdout.
 *
 * @param result - The phase's recorded result.
 * @returns The rendering effect.
 */
function renderPhaseResult(result: SetupPhaseResult): Effect.Effect<void, never, Presenter> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    const message = `${result.summary} (${formatSetupDuration(result.durationMs)})`;
    switch (result.status) {
      case "succeeded": {
        yield* presenter.success(message);
        break;
      }
      case "degraded":
      case "skipped": {
        yield* Effect.logWarning(message);
        break;
      }
      case "failed": {
        yield* Effect.logError(message);
        break;
      }
    }
    for (const evidenceLine of result.evidence) {
      yield* presenter.line("stdout", `  - ${evidenceLine}`);
    }
  });
}

/**
 * Runs every setup phase in declaration order and records its result.
 *
 * @remarks
 * Before each phase, every declared dependency must have `succeeded`, `degraded`, or (during
 * `--dry-run`) been planned rather than blocked; otherwise the phase is skipped with the summary
 * `Skipped '<title>' because dependency '<id>' did not succeed.`, evidence naming the dependency's
 * state, and the next action `Resolve '<id>', then rerun setup.`. A phase defect becomes a `failed`
 * result with the summary `'<title>' failed with an unexpected exception.` and the defect message
 * as evidence. Durations come from `Clock`.
 *
 * @param phases - The phases, in execution order.
 * @param context - The invocation state shared by every phase.
 * @returns Every phase result, in the order the phases were considered.
 */
export function runSetupPhases(
  phases: readonly SetupPhaseDefinition[],
  context: SetupContext,
): Effect.Effect<readonly SetupPhaseResult[], never, SetupRequirements> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    const dryRun = context.options.dryRun;
    const results: SetupPhaseResult[] = [];
    const resultById = new Map<string, SetupPhaseResult>();
    const blockerSkipIds = new Set<string>();

    for (const phase of phases) {
      const phaseContext = withLogContext(`setup::${phase.id}`);
      yield* presenter.section(phase.title);

      const startedAt = yield* Clock.currentTimeMillis;
      const unmetDependency = findUnmetDependency(phase, resultById, dryRun, blockerSkipIds);
      let result: SetupPhaseResult;
      if (unmetDependency === undefined) {
        // Intentionally sequential: a downstream phase must observe every upstream phase's result.
        result = yield* phaseContext(phase.run(context)).pipe(
          Effect.catchDefect((defect) =>
            Effect.map(Clock.currentTimeMillis, (now): SetupPhaseResult => ({
              id: phase.id,
              status: "failed",
              summary: `'${phase.title}' failed with an unexpected exception.`,
              evidence: [defectMessage(defect)],
              nextActions: [`Resolve the reported '${phase.title}' failure, then rerun setup.`],
              durationMs: Math.max(0, now - startedAt),
            })),
          ),
        );
      } else {
        const evidence = unmetDependencyEvidence(unmetDependency, resultById.get(unmetDependency));
        yield* phaseContext(Effect.logDebug(`Dependency check for '${phase.title}': ${evidence}`));
        const now = yield* Clock.currentTimeMillis;
        result = {
          id: phase.id,
          status: "skipped",
          summary: `Skipped '${phase.title}' because dependency '${unmetDependency}' did not succeed.`,
          evidence: [evidence],
          nextActions: [`Resolve '${unmetDependency}', then rerun setup.`],
          durationMs: Math.max(0, now - startedAt),
        };
        blockerSkipIds.add(phase.id);
      }

      results.push(result);
      resultById.set(phase.id, result);
      yield* phaseContext(renderPhaseResult(result));
    }

    return results;
  });
}

/**
 * Resolves the readiness of a completed run from its phase definitions and results.
 *
 * @remarks
 * Replays the runner's dependency decisions over `results` (they depend only on earlier results),
 * so it knows which skips the runner synthesized. A required phase blocks readiness when it
 * `failed`, or when it was `skipped` by the runner or outside a dry run; otherwise any `degraded`
 * result makes the run `degraded`.
 *
 * @param phases - The phases the run executed, in order.
 * @param results - The run's results, in the same order.
 * @param dryRun - Whether the run planned mutations instead of applying them.
 * @returns The overall readiness.
 */
export function resolveSetupOutcome(
  phases: readonly SetupPhaseDefinition[],
  results: readonly SetupPhaseResult[],
  dryRun: boolean,
): SetupOutcome {
  const resultById = new Map<string, SetupPhaseResult>();
  const blockerSkipIds = new Set<string>();
  for (const phase of phases) {
    const result = results.find(({id}) => id === phase.id);
    if (result === undefined) {
      continue;
    }
    if (findUnmetDependency(phase, resultById, dryRun, blockerSkipIds) !== undefined) {
      blockerSkipIds.add(phase.id);
    }
    resultById.set(phase.id, result);
  }

  const phaseById = new Map(phases.map((phase) => [phase.id, phase]));
  const blocked = results.some((result) => {
    if (phaseById.get(result.id)?.required !== true) {
      return false;
    }
    if (result.status === "failed") {
      return true;
    }
    return result.status === "skipped" && (blockerSkipIds.has(result.id) || !dryRun);
  });
  if (blocked) {
    return "failed";
  }
  return results.some((result) => result.status === "degraded") ? "degraded" : "ready";
}
