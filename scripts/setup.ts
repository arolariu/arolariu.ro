/**
 * @fileoverview Dependency-aware onboarding orchestrator command for the monorepo.
 * @module scripts/setup
 *
 * @remarks
 * Setup prepares a fresh checkout end to end: it validates workspace prerequisites, restores root
 * and `.github/scripts` dependencies, generates checkout artifacts, and prepares the .NET, React,
 * Svelte, Python, and local infrastructure toolchains through independent, dependency-aware
 * phases.
 *
 * The command owns no ambient capability. Repository paths, manifest requirements, the single
 * shared inspection session, the phase-scoped process runner, prompts, and the composed generation
 * command all arrive through the injected {@link CommandRuntime} of one invocation. Phases run
 * sequentially so prompts, package managers, and local configuration writes cannot race;
 * dependency handling, not concurrency, isolates failures. An ordinary phase exception becomes one
 * failed phase result and setup continues with independent phases, while an interruption escapes
 * phase degradation and cancels the whole invocation.
 *
 * @example
 * ```bash
 * npm run setup
 * npm run setup -- --dry-run
 * npm run setup -- --engine podman
 * ```
 */

import {
  CommandInputError,
  MonorepoCommand,
  type CommandContext,
  type CommandExecution,
  type CommandInvoker,
  type CommandRuntimeFactory,
} from "./common/commander.ts";
import type {MonorepositoryLogger} from "./common/logger.ts";
import type {PromptProvider} from "./common/prompts.ts";
import {loadRepositoryRequirements} from "./common/requirements.ts";
import {resolveRepositoryPaths} from "./common/repository-paths.ts";
import {CommandCancellation, commandCancellationFromSignal, type RepositoryInspectionRequest} from "./common/runtime.ts";
import type {ContainerEngine} from "./container-runtime/types.ts";
import {generateCommand, type GenerateInput, type GenerateResult} from "./generate.ts";
import {dotnetSetupPhase} from "./setup.dotnet.ts";
import {infrastructureSetupPhase} from "./setup.infrastructure.ts";
import {pythonSetupPhase} from "./setup.python.ts";
import {reactSetupPhase} from "./setup.react.ts";
import {svelteSetupPhase} from "./setup.svelte.ts";
import {
  toDeprecatedSetupCommandRunner,
  type SetupActionExecutor,
  type SetupContext,
  type SetupInput,
  type SetupPhaseDefinition,
  type SetupPhaseResult,
  type SetupPhaseRuntime,
} from "./setup.types.ts";
import {workspaceSetupPhases} from "./setup.workspace.ts";

export type {SetupInput} from "./setup.types.ts";

/** Bounded default timeout applied to every phase command that does not request its own. */
const PHASE_COMMAND_TIMEOUT_MS = 120_000;

/** Every container engine `--engine` accepts. */
const SUPPORTED_ENGINES: readonly ContainerEngine[] = ["rancher", "podman"];

/** Typed business result produced by one setup invocation. */
export interface SetupResult {
  /** Every phase result, in the exact order the phases were considered. */
  readonly phases: readonly SetupPhaseResult[];
}

/** Construction seams {@link createSetupCommand} accepts. */
export interface SetupCommandDependencies {
  /** Runtime factory used for every scope; tests inject a fake instead of the Node adapter. */
  readonly runtimeFactory?: CommandRuntimeFactory;
  /** Ordered phases to execute; defaults to {@link setupPhases}. */
  readonly phases?: readonly SetupPhaseDefinition[];
  /** Composed generation command migrated phases invoke; defaults to the production singleton. */
  readonly generate?: CommandInvoker<GenerateInput, GenerateResult>;
}

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
  infrastructureSetupPhase,
];

/**
 * Creates the consent and dry-run controller for setup mutations.
 *
 * @param dependencies - Typed input plus injected prompting and logging.
 * @returns An action executor that preserves action failures and interruption.
 */
export function createSetupActionExecutor(
  dependencies: Readonly<{
    options: SetupInput;
    prompts: PromptProvider;
    logger: MonorepositoryLogger;
  }>,
): SetupActionExecutor {
  const {options, prompts, logger} = dependencies;

  return {
    run: async (action) => {
      const metadata = `'${action.id}' (${action.scope}): ${action.summary}`;

      if (options.dryRun) {
        logger.info(`Planned setup action ${metadata}`);
        return "planned";
      }

      if (action.scope === "system" && !options.yes) {
        const confirmed = await prompts.confirm(`Allow system setup action ${metadata}?`, false);
        if (!confirmed) {
          logger.warn(`Declined setup action ${metadata}`);
          return "declined";
        }
      }

      await action.execute();
      logger.success(`Executed setup action ${metadata}`);
      return "executed";
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Reports whether a thrown value is an interruption rather than an ordinary phase failure.
 *
 * @remarks
 * Both a platform `AbortError` (raised by an interrupted prompt or an aborted probe) and a typed
 * {@link CommandCancellation} (raised by a cancelled nested invocation) must escape phase
 * degradation so the command lifecycle maps them to the caller's `130`/`143` exit contract.
 *
 * @param error - Value thrown by a phase.
 * @returns Whether the value represents invocation cancellation.
 */
function isInterruption(error: unknown): boolean {
  return error instanceof CommandCancellation || (error instanceof Error && error.name === "AbortError");
}

function formatDuration(durationMs: number): string {
  return `${Math.max(0, Math.round(durationMs))}ms`;
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
 * orchestrator did not itself skip may also be a `skipped` result whose mutations were merely
 * planned; that remains traversable so downstream phases still plan their own actions.
 *
 * @param dependencyResult - The dependency's recorded result, if any.
 * @param dryRun - Whether setup is planning mutations instead of applying them.
 * @param blockerSkipIds - Identifiers of orchestrator-synthesized skips.
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
 * Determines whether a required phase's result blocks overall readiness.
 *
 * @param result - The phase's recorded result.
 * @param dryRun - Whether setup is planning mutations instead of applying them.
 * @param blockerSkipIds - Identifiers of orchestrator-synthesized skips.
 * @returns Whether the result blocks setup readiness.
 */
function blocksReadiness(result: SetupPhaseResult, dryRun: boolean, blockerSkipIds: ReadonlySet<string>): boolean {
  if (result.status === "failed") {
    return true;
  }
  if (result.status !== "skipped") {
    return false;
  }
  return blockerSkipIds.has(result.id) || !dryRun;
}

/**
 * Renders one phase's status, duration, summary, and evidence.
 *
 * @param logger - Logger scoped to the completed phase.
 * @param result - The phase's recorded result.
 */
function renderPhaseResult(logger: MonorepositoryLogger, result: SetupPhaseResult): void {
  const message = `${result.summary} (${formatDuration(result.durationMs)})`;
  switch (result.status) {
    case "succeeded":
      logger.success(message);
      break;
    case "degraded":
    case "skipped":
      logger.warn(message);
      break;
    case "failed":
      logger.error(message);
      break;
  }
  for (const evidenceLine of result.evidence) {
    logger.line(`  - ${evidenceLine}`);
  }
}

/** Overall readiness of one completed setup run, resolved from the executed phase definitions. */
type SetupOutcome = "ready" | "degraded" | "failed";

/**
 * Readiness of each completed run, resolved while the phase definitions are still in scope.
 *
 * @remarks
 * Module-private on purpose: it lets the deferred completion render and exit with the readiness
 * the run actually observed, without widening the published {@link SetupResult} contract with
 * presentation state or re-deriving `required` from phases the completion never received.
 */
const setupOutcomes = new WeakMap<SetupResult, SetupOutcome>();

/**
 * Builds the phase-scoped capability bundle every migrated phase reads.
 *
 * @param context - The invocation context owning every capability this run may use.
 * @param input - Typed setup input.
 * @param phaseLogger - Child logger scoped to the running phase.
 * @param root - Canonical repository root every phase command runs from.
 * @param generate - Composed generation command.
 * @returns The capability bundle placed on the phase's {@link SetupContext}.
 */
function createPhaseRuntime(
  context: Readonly<CommandContext>,
  input: Readonly<SetupInput>,
  phaseLogger: MonorepositoryLogger,
  root: string,
  generate: CommandInvoker<GenerateInput, GenerateResult>,
): SetupPhaseRuntime {
  const {runtime} = context;
  const phaseRunner = runtime.runner.scope({
    cwd: root,
    logger: phaseLogger,
    signal: runtime.signal,
    timeoutMs: PHASE_COMMAND_TIMEOUT_MS,
    logCommands: input.verbose,
  });

  return {
    command: context,
    runner: phaseRunner,
    files: runtime.files,
    http: runtime.http,
    clock: runtime.clock,
    tasks: runtime.tasks,
    environment: runtime.environment,
    invokeGenerate: (generateInput: Readonly<GenerateInput>): Promise<CommandExecution<GenerateResult>> =>
      generate.invoke(generateInput, {parent: context, presentation: "silent"}),
  };
}

/** Optional seams the shared setup business function accepts. */
interface SetupExecutionSeams {
  /** Ordered phases to execute; defaults to {@link setupPhases}. */
  readonly phases?: readonly SetupPhaseDefinition[];
  /** Composed generation command; defaults to {@link generateCommand}. */
  readonly generate?: CommandInvoker<GenerateInput, GenerateResult>;
}

/**
 * Runs every dependency-aware setup phase in sequence and records its result.
 *
 * @remarks
 * Before each phase, every declared dependency must have `succeeded`, `degraded`, or (during
 * `--dry-run`) been planned rather than blocked; otherwise the phase is skipped, naming the exact
 * blocking dependency. Each phase receives a runner scoped to the repository root, the invocation
 * signal, its own child logger, and the bounded default timeout, so no phase can outlive the
 * invocation or echo a command it was not asked to echo.
 *
 * @param context - The invocation context owning every capability this run may use.
 * @param input - Typed setup input.
 * @param seams - Optional phase and generation replacements.
 * @returns Every phase result, in the order the phases were considered.
 * @throws When repository requirements are invalid, or when a phase is interrupted.
 */
async function executeSetup(
  context: Readonly<CommandContext>,
  input: Readonly<SetupInput>,
  seams: Readonly<SetupExecutionSeams> = {},
): Promise<SetupResult> {
  const {runtime} = context;
  const {logger} = runtime;
  const phases = seams.phases ?? setupPhases;
  const generate = seams.generate ?? generateCommand;

  logger.banner([
    "arolariu.ro repository setup",
    input.dryRun
      ? "Dry run: planning every phase without mutating the repository."
      : "Preparing every required workspace, toolchain, and local dependency.",
  ]);

  const paths = await resolveRepositoryPaths(import.meta.url, runtime.files);
  const requirementLoad = await loadRepositoryRequirements(paths, {files: runtime.files, tasks: runtime.tasks});
  if (requirementLoad.status === "invalid") {
    throw new Error(`Repository requirements are invalid:\n${requirementLoad.errors.join("\n")}`);
  }

  // Requested exactly once, after paths and requirements are valid, and shared by reference across
  // every phase's SetupContext below.
  const request: RepositoryInspectionRequest = {
    profile: "full",
    paths,
    ...(input.engine === undefined ? {} : {requestedEngine: input.engine}),
  };
  const inspection = runtime.inspection.getRepositorySession(request);
  const actions = createSetupActionExecutor({options: input, prompts: runtime.prompts, logger});

  const results: SetupPhaseResult[] = [];
  const resultById = new Map<string, SetupPhaseResult>();
  const blockerSkipIds = new Set<string>();

  for (const phase of phases) {
    // Structured phase boundary: the invocation may have been cancelled by the previous phase's
    // work, a prompt, or the caller's signal, and a phase that degraded its own cancellation into
    // an ordinary result must never let setup start another phase.
    if (runtime.signal.aborted) {
      throw commandCancellationFromSignal(runtime.signal);
    }

    const phaseLogger = logger.child(phase.id);
    phaseLogger.section(phase.title);

    const unmetDependency = phase.dependsOn.find(
      (dependencyId) => !isDependencySatisfied(resultById.get(dependencyId), input.dryRun, blockerSkipIds),
    );

    let result: SetupPhaseResult;
    if (unmetDependency !== undefined) {
      const dependencyResult = resultById.get(unmetDependency);
      const startedAt = runtime.clock.monotonicNow();
      phaseLogger.debug(`Dependency check for '${phase.title}': ${unmetDependencyEvidence(unmetDependency, dependencyResult)}`);
      result = {
        id: phase.id,
        status: "skipped",
        summary: `Skipped '${phase.title}' because dependency '${unmetDependency}' did not succeed.`,
        evidence: [unmetDependencyEvidence(unmetDependency, dependencyResult)],
        nextActions: [`Resolve '${unmetDependency}', then rerun setup.`],
        durationMs: Math.max(0, runtime.clock.monotonicNow() - startedAt),
      };
      blockerSkipIds.add(phase.id);
    } else {
      const startedAt = runtime.clock.monotonicNow();
      const phaseRuntime = createPhaseRuntime(context, input, phaseLogger, paths.root, generate);
      const phaseContext: SetupContext = {
        options: input,
        paths,
        requirements: requirementLoad.requirements,
        inspection,
        runner: toDeprecatedSetupCommandRunner(phaseRuntime.runner),
        now: runtime.clock.monotonicNow,
        runtime: phaseRuntime,
        prompts: runtime.prompts,
        actions,
        logger,
      };

      try {
        // Intentionally sequential: prompts, package managers, and local configuration writes
        // must never race, and a downstream phase must observe every upstream phase's result.
        result = await phase.run(phaseContext);
      } catch (error: unknown) {
        if (isInterruption(error)) {
          throw error;
        }
        result = {
          id: phase.id,
          status: "failed",
          summary: `'${phase.title}' failed with an unexpected exception.`,
          evidence: [errorMessage(error)],
          nextActions: [`Resolve the reported '${phase.title}' failure, then rerun setup.`],
          durationMs: Math.max(0, runtime.clock.monotonicNow() - startedAt),
        };
      }
    }

    // Structured phase boundary: an aborted invocation outranks whatever the phase returned, so a
    // typed cancellation the phase swallowed still cancels the command instead of being recorded,
    // rendered, and completed as an ordinary failure.
    if (runtime.signal.aborted) {
      throw commandCancellationFromSignal(runtime.signal);
    }

    results.push(result);
    resultById.set(phase.id, result);
    renderPhaseResult(phaseLogger, result);
  }

  const phaseById = new Map(phases.map((phase) => [phase.id, phase]));
  const blocked = results.some((result) => {
    const definition = phaseById.get(result.id);
    return definition !== undefined && definition.required && blocksReadiness(result, input.dryRun, blockerSkipIds);
  });
  const degraded = results.some((result) => result.status === "degraded");

  const setupResult: SetupResult = {phases: results};
  setupOutcomes.set(setupResult, blocked ? "failed" : degraded ? "degraded" : "ready");
  return setupResult;
}

/**
 * Renders the setup summary table, degraded capabilities, next actions, and readiness banner.
 *
 * @param logger - Invocation logger.
 * @param result - Completed setup result.
 * @param outcome - Overall readiness resolved during execution.
 */
function renderSetupSummary(logger: MonorepositoryLogger, result: Readonly<SetupResult>, outcome: SetupOutcome): void {
  logger.section("Setup summary");
  logger.table({
    headers: ["Phase", "Status", "Duration", "Summary"],
    rows: result.phases.map((phase) => [phase.id, phase.status, formatDuration(phase.durationMs), phase.summary]),
  });

  const degradedResults = result.phases.filter((phase) => phase.status === "degraded");
  if (degradedResults.length > 0) {
    logger.section("Degraded capabilities");
    for (const degradedResult of degradedResults) {
      logger.warn(degradedResult.summary);
    }
  }

  const nextActions = result.phases.flatMap((phase) => phase.nextActions);
  if (nextActions.length > 0) {
    logger.section("Next actions");
    nextActions.forEach((nextAction, index) => logger.line(`${index + 1}. ${nextAction}`));
  }

  logger.banner(
    [
      outcome === "failed"
        ? "Setup failed. Resolve the reported failures, then rerun setup."
        : outcome === "degraded"
          ? "Setup is ready with degraded capabilities."
          : "Setup is ready.",
    ],
    outcome === "failed" ? "red" : outcome === "degraded" ? "yellow" : "green",
  );
}

/**
 * Decodes the optional `--engine` value into a supported container engine.
 *
 * @param value - Raw Commander option value.
 * @returns The selected engine, or `undefined` when the option was omitted.
 * @throws {CommandInputError} When the value is not a supported container engine.
 */
function decodeEngine(value: string | undefined): ContainerEngine | undefined {
  if (value === undefined) {
    return undefined;
  }

  const engine = SUPPORTED_ENGINES.find((candidate) => candidate === value);
  if (engine === undefined) {
    throw new CommandInputError(`--engine must be one of ${SUPPORTED_ENGINES.join(", ")}, got: "${value}"`);
  }

  return engine;
}

/**
 * Creates the setup command.
 *
 * @param dependencies - Optional runtime factory, phase list, and composed generation command;
 * tests inject deterministic fakes instead of replacing command business code.
 * @returns The typed `setup` command object.
 */
export function createSetupCommand(dependencies: Readonly<SetupCommandDependencies> = {}): MonorepoCommand<SetupInput, SetupResult> {
  const {phases, generate} = dependencies;

  return new MonorepoCommand<SetupInput, SetupResult>(
    {
      metadata: {
        name: "setup",
        description:
          "Prepares a fresh checkout end to end: workspace dependencies, generated artifacts, and the .NET, React, Svelte, Python, and local infrastructure toolchains.",
        examples: ["npm run setup", "npm run setup -- --dry-run", "npm run setup -- --engine podman"],
      },
      configure: (program) => {
        program
          .option("--verbose", "Show diagnostic detail for each phase.", false)
          .option("--dry-run", "Plan every phase mutation without executing it.", false)
          .option("--yes", "Approve system-scoped mutations without prompting.", false)
          .option("--engine <engine>", "Select rancher or podman for infrastructure phases.");
      },
      decode: (program) => {
        const options = program.opts<{verbose?: boolean; dryRun?: boolean; yes?: boolean; engine?: string}>();
        const engine = decodeEngine(options.engine);
        return {
          verbose: options.verbose === true,
          dryRun: options.dryRun === true,
          yes: options.yes === true,
          ...(engine === undefined ? {} : {engine}),
        };
      },
      execute: (context, input) =>
        executeSetup(context, input, {
          ...(phases === undefined ? {} : {phases}),
          ...(generate === undefined ? {} : {generate}),
        }),
      completion: (result) => {
        const outcome = setupOutcomes.get(result) ?? "ready";
        return {
          exitCode: outcome === "failed" ? 1 : 0,
          human: (logger) => {
            renderSetupSummary(logger, result, outcome);
          },
        };
      },
    },
    dependencies.runtimeFactory,
  );
}

/** Production singleton used by `npm run setup` and this module's direct entrypoint. */
export const setupCommand: MonorepoCommand<SetupInput, SetupResult> = createSetupCommand();

await setupCommand.runIfMain(import.meta.url);
