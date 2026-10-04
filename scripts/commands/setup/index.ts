/**
 * @fileoverview Dependency-aware onboarding orchestrator of the `setup` command.
 * @module scripts/commands/setup
 *
 * @remarks
 * Setup prepares a fresh checkout end to end: it validates workspace prerequisites, restores root
 * and `.github/scripts` dependencies, generates checkout artifacts, and prepares the .NET, React,
 * Svelte, Python, and local infrastructure toolchains through independent, dependency-aware
 * phases.
 *
 * {@link runSetup} resolves the repository paths and manifest requirements, obtains the single
 * full inspection session every phase shares, and runs the phases through `runSetupPhases` with the
 * consent-gated `SetupActions` of this invocation. The phases not yet converted to Effect are run
 * through the temporary `legacyPhase` adapter until Task 5.5. Phases run sequentially so prompts,
 * package managers, and local configuration writes cannot race; dependency handling, not
 * concurrency, isolates failures. A phase defect becomes one failed phase result and setup continues
 * with independent phases, while an interruption cancels the whole invocation.
 *
 * @example
 * ```bash
 * npm run setup
 * npm run setup -- --dry-run
 * npm run setup -- --engine podman
 * ```
 */

import {Effect} from "effect";

import {loadRepositoryRequirements} from "../../common/requirements.ts";
import {resolveRepositoryPaths} from "../../common/repository-paths.ts";
import {Inspection} from "../../inspection/Inspection.ts";
import {legacyReadOnlyFiles, legacyTaskScheduler} from "../../platform/bridge.ts";
import type {PlatformServices} from "../../platform/layers.ts";
import {Presenter} from "../../platform/Output.ts";
import type {Prompts} from "../../platform/Prompts.ts";
import {setupActionsLayer} from "./actions.ts";
import {legacyPhase} from "./legacy-phase.ts";
import {dotnetSetupPhase} from "./phases/dotnet.ts";
import {infrastructureSetupPhase} from "./phases/infrastructure.ts";
import {pythonSetupPhase} from "./phases/python.ts";
import {reactSetupPhase} from "./phases/react.ts";
import {svelteSetupPhase} from "./phases/svelte.ts";
import {workspaceSetupPhases} from "./phases/workspace.ts";
import {resolveSetupOutcome, runSetupPhases, type SetupOutcome} from "./runner.ts";
import type {SetupInput, SetupPhaseDefinition, SetupPhaseResult} from "./types.ts";

export type {SetupInput} from "./types.ts";
export type {SetupOutcome} from "./runner.ts";

/** Typed business result produced by one setup invocation. */
export interface SetupResult {
  /** Every phase result, in the exact order the phases were considered. */
  readonly phases: readonly SetupPhaseResult[];
}

/** Services one setup run requires; `runSetup` provides `SetupActions` itself. */
export type SetupRunRequirements = PlatformServices | Prompts | Inspection;

/**
 * Every dependency-aware setup phase in the exact order the command executes them.
 *
 * @remarks
 * Workspace phases run first because every other phase depends on a restored root dependency tree
 * or generated checkout artifact. `dotnet`, `python`, and `infrastructure` declare no dependency,
 * so an independent failure in one of them never blocks the others.
 */
export const setupPhases: readonly SetupPhaseDefinition[] = [
  ...workspaceSetupPhases,
  dotnetSetupPhase,
  reactSetupPhase,
  svelteSetupPhase,
  pythonSetupPhase,
  legacyPhase(infrastructureSetupPhase),
];

/**
 * Readiness of each completed run, resolved while the phase definitions are still in scope.
 *
 * @remarks
 * Module-private on purpose, as in the legacy command: it lets the CLI completion render and exit
 * with the readiness the run actually observed, without widening the published {@link SetupResult}
 * contract with presentation state or re-deriving `required` from phases the completion never sees.
 */
const setupOutcomes = new WeakMap<SetupResult, SetupOutcome>();

/**
 * Reads the readiness a {@link runSetup} run recorded for its result.
 *
 * @param result - A result returned by {@link runSetup} or {@link runSetupWith}.
 * @returns The recorded readiness, or `undefined` for a result no setup run produced.
 */
export function setupOutcome(result: SetupResult): SetupOutcome | undefined {
  return setupOutcomes.get(result);
}

/**
 * Builds the setup program over an explicit phase list.
 *
 * @remarks
 * Renders the setup banner, resolves canonical paths and manifest requirements through the bridge's
 * legacy views, then requests exactly one full inspection session (with `requestedEngine` only when
 * an engine was selected), shared by reference across every phase, and runs the phases with
 * `setupActionsLayer(input)`. Invalid repository requirements are a defect carrying every
 * requirement error, raised before any inspection session exists.
 *
 * @param phases - The phases to run, in order.
 * @returns The setup program for one input.
 */
export function runSetupWith(
  phases: readonly SetupPhaseDefinition[],
): (input: SetupInput) => Effect.Effect<SetupResult, never, SetupRunRequirements> {
  return Effect.fn("setup.run")(function* (input: SetupInput): Effect.fn.Return<SetupResult, never, SetupRunRequirements> {
    const presenter = yield* Presenter;
    yield* presenter.banner("arolariu.ro repository setup", [
      input.dryRun
        ? "Dry run: planning every phase without mutating the repository."
        : "Preparing every required workspace, toolchain, and local dependency.",
    ]);

    const files = yield* legacyReadOnlyFiles;
    const paths = yield* Effect.promise(() => resolveRepositoryPaths(import.meta.url, files));
    const requirementLoad = yield* Effect.promise(() => loadRepositoryRequirements(paths, {files, tasks: legacyTaskScheduler}));
    if (requirementLoad.status === "invalid") {
      return yield* Effect.die(new Error(`Repository requirements are invalid:\n${requirementLoad.errors.join("\n")}`));
    }

    const inspection = yield* (yield* Inspection).session({
      profile: "full",
      paths,
      ...(input.engine === undefined ? {} : {requestedEngine: input.engine}),
    });
    const results = yield* runSetupPhases(phases, {
      options: input,
      paths,
      requirements: requirementLoad.requirements,
      inspection,
    }).pipe(Effect.provide(setupActionsLayer(input)));

    const result: SetupResult = {phases: results};
    setupOutcomes.set(result, resolveSetupOutcome(phases, results, input.dryRun));
    return result;
  });
}

/** Runs every production setup phase ({@link setupPhases}) for one input. */
export const runSetup: (input: SetupInput) => Effect.Effect<SetupResult, never, SetupRunRequirements> = runSetupWith(setupPhases);
