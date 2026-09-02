/**
 * @fileoverview Dependency-aware onboarding orchestrator for the monorepo.
 * @module scripts/setup
 *
 * @remarks
 * This script prepares a fresh checkout end to end: it validates workspace
 * prerequisites, restores root and `.github/scripts` dependencies, generates
 * checkout artifacts, and prepares the .NET, React, Svelte, Python, and local
 * infrastructure toolchains through independent, dependency-aware phases.
 *
 * @example
 * ```bash
 * npm run setup
 * ```
 */

import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {Option, type Command} from "commander";

import {commanderExitCode, createToolProgram} from "./common/cli.ts";
import {defaultCommandRunner, formatCommand, type CommandRunner, type CommandRunOptions} from "./common/process.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";
import {createTerminalPromptProvider, type PromptProvider} from "./common/prompts.ts";
import {loadRepositoryRequirements, type RequirementLoadResult} from "./common/requirements.ts";
import {resolveRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import {nodeFileSystem, nodeTaskScheduler} from "./common/runtime.node.ts";
import {createRepositoryInspectionSession} from "./inspection/repository.ts";
import {dotnetSetupPhase} from "./setup.dotnet.ts";
import {infrastructureSetupPhase} from "./setup.infrastructure.ts";
import {pythonSetupPhase} from "./setup.python.ts";
import {reactSetupPhase} from "./setup.react.ts";
import {svelteSetupPhase} from "./setup.svelte.ts";
import type {SetupActionExecutor, SetupContext, SetupOptions, SetupPhaseDefinition, SetupPhaseResult} from "./setup.types.ts";
import {workspaceSetupPhases} from "./setup.workspace.ts";

/** Example invocations rendered in setup CLI help. */
const SETUP_EXAMPLES: readonly string[] = ["npm run setup", "npm run setup -- --dry-run", "npm run setup -- --engine podman"];

/**
 * Builds the Commander program that owns setup CLI parsing, `--help`, `-h`, `/h`, and parse-error
 * rendering.
 *
 * @remarks
 * `--engine` values are restricted to `rancher`/`podman` through Commander's own choice
 * validation, so an invalid engine is rejected with a Commander-native, logger-rendered error
 * before any repository work begins.
 *
 * @param logger - Logger that receives Commander's rendered help and error output.
 * @returns A configured, not-yet-parsed Commander program.
 */
function buildSetupProgram(logger: MonorepositoryLogger): Command {
  const program = createToolProgram({
    name: "setup",
    description:
      "Prepares a fresh checkout end to end: workspace dependencies, generated artifacts, and the .NET, React, Svelte, Python, and local infrastructure toolchains.",
    usage: "[options]",
    examples: SETUP_EXAMPLES,
    logger,
  });

  program
    .option("--verbose", "Show diagnostic detail for each phase.")
    .option("--dry-run", "Plan every phase mutation without executing it.")
    .option("--yes", "Approve system-scoped mutations without prompting.")
    .addOption(new Option("--engine <engine>", "Select rancher or podman for infrastructure phases.").choices(["rancher", "podman"]));

  return program;
}

/**
 * Extracts strict {@link SetupOptions} from a Commander program that has already parsed
 * successfully.
 *
 * @param program - Setup Commander program after a successful `parse`.
 * @returns Setup options consumed by the orchestrator.
 */
function optionsFromProgram(program: Command): SetupOptions {
  const parsed = program.opts<{verbose?: boolean; dryRun?: boolean; yes?: boolean; engine?: string}>();
  return {
    verbose: parsed.verbose ?? false,
    dryRun: parsed.dryRun ?? false,
    yes: parsed.yes ?? false,
    // Commander's `.choices([...])` already restricts this value to "rancher" or "podman"
    // before it is ever treated as a real ContainerEngine. Cast away `undefined` (not just
    // `SetupOptions["engine"]`, which still includes it) so this branch stays assignable under
    // `exactOptionalPropertyTypes`.
    ...(parsed.engine === undefined ? {} : {engine: parsed.engine as Exclude<SetupOptions["engine"], undefined>}),
  };
}

/**
 * Creates the consent and dry-run controller for setup mutations.
 *
 * @param dependencies - Parsed options plus injected prompting and logging.
 * @returns An action executor that preserves action failures and interruption.
 */
export function createSetupActionExecutor(
  dependencies: Readonly<{
    options: SetupOptions;
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

/**
 * Every dependency-aware setup phase in the exact order `runSetup` executes
 * them.
 *
 * @remarks
 * Workspace phases run first because every other phase depends on a restored
 * root dependency tree or generated checkout artifact. `dotnet`, `python`,
 * and `infrastructure` declare no dependency, so an independent failure in
 * one of them never blocks the others.
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
 * Boundary values {@link runSetup} needs to resolve repository context and
 * execute every phase.
 *
 * @remarks
 * Exported so tests can inject fake phases and deterministic boundaries
 * without replacing the repository modules that own path discovery, manifest
 * loading, command execution, prompting, or logging.
 */
export interface SetupDependencies {
  /** Ordered phases to execute; defaults to {@link setupPhases}. */
  readonly phases: readonly SetupPhaseDefinition[];
  /** Resolves canonical repository paths; may be synchronous or asynchronous. */
  readonly resolveRepositoryPaths: () => RepositoryPaths | Promise<RepositoryPaths>;
  /** Loads manifest-derived repository requirements. */
  readonly loadRepositoryRequirements: (paths: RepositoryPaths) => Promise<RequirementLoadResult>;
  /** Composes the one full repository inspection session shared by every phase. */
  readonly createInspectionSession: typeof createRepositoryInspectionSession;
  /** Executes phase commands. */
  readonly runner: CommandRunner;
  /** Resolves interactive phase prompts. */
  readonly prompts: PromptProvider;
  /** Receives setup presentation and semantic output. */
  readonly logger: MonorepositoryLogger;
  /** Monotonic time source used for phase and orchestrator durations. */
  readonly now: () => number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isInterrupted(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function formatDuration(durationMs: number): string {
  return `${Math.max(0, Math.round(durationMs))}ms`;
}

/** Default timeout for capture/probe commands without an explicit timeout. */
const DEFAULT_PROBE_TIMEOUT_MS = 120_000;

/** Default timeout for `tee`/`inherit` mutation and installation commands without an explicit timeout. */
const DEFAULT_MUTATION_TIMEOUT_MS = 1_200_000;

/**
 * Resolves the default command timeout for an output mode.
 *
 * @param output - Requested command output mode.
 * @returns {@link DEFAULT_MUTATION_TIMEOUT_MS} for `tee`/`inherit`; otherwise {@link DEFAULT_PROBE_TIMEOUT_MS}.
 */
function defaultCommandTimeoutMs(output: CommandRunOptions["output"]): number {
  return output === "tee" || output === "inherit" ? DEFAULT_MUTATION_TIMEOUT_MS : DEFAULT_PROBE_TIMEOUT_MS;
}

/**
 * Wraps a command runner with phase-scoped verbose command evidence and a bounded default timeout.
 *
 * @remarks
 * Command evidence is rendered through {@link MonorepositoryLogger.command}
 * only in verbose mode, and only ever includes the executable and its
 * argument array — never stdin or environment values. An explicit caller
 * timeout is always preserved; otherwise capture/probe commands receive
 * {@link DEFAULT_PROBE_TIMEOUT_MS} and `tee`/`inherit` mutation or
 * installation commands receive {@link DEFAULT_MUTATION_TIMEOUT_MS}.
 *
 * @param runner - Underlying command runner to delegate to.
 * @param logger - Phase-scoped child logger that receives verbose command evidence.
 * @param verbose - Whether command evidence is rendered.
 * @returns A command runner bounded by the default timeout policy.
 */
function createPhaseCommandRunner(runner: CommandRunner, logger: MonorepositoryLogger, verbose: boolean): CommandRunner {
  return {
    run: (command, options = {}) => {
      if (verbose) {
        logger.command(formatCommand(command));
      }
      return runner.run(command, {
        ...options,
        timeoutMs: options.timeoutMs ?? defaultCommandTimeoutMs(options.output),
      });
    },
  };
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
 * A `succeeded` or `degraded` dependency always satisfies. During a dry run,
 * a dependency the orchestrator did not itself skip may also be a `skipped`
 * result whose mutations were merely planned; that remains traversable so
 * downstream phases still plan their own actions.
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

/**
 * Runs every dependency-aware setup phase in sequence and reports readiness.
 *
 * @remarks
 * Phases run sequentially so prompts, package managers, and local
 * configuration writes cannot race; dependency handling, not concurrency,
 * isolates failures. Before each phase, every declared dependency must have
 * `succeeded`, `degraded`, or (during `--dry-run`) been planned rather than
 * blocked; otherwise the phase is skipped, naming the exact blocking
 * dependency. An ordinary phase exception becomes one failed result and
 * setup continues with independent phases; an `AbortError` is rethrown
 * unchanged so the caller can distinguish interruption from failure.
 *
 * @param options - Parsed setup options.
 * @param dependencies - Optional boundary replacements; unset values default
 * to the real repository-owned functions and executors.
 * @returns The overall exit code and every phase's recorded result.
 * @throws When repository paths or requirements cannot be resolved, or when
 * a phase rejects with an `AbortError`.
 */
export async function runSetup(
  options: Readonly<SetupOptions>,
  dependencies: Readonly<Partial<SetupDependencies>> = {},
): Promise<
  Readonly<{
    exitCode: number;
    results: readonly SetupPhaseResult[];
  }>
> {
  const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("setup", {verbose: options.verbose});
  const prompts = dependencies.prompts ?? createTerminalPromptProvider();
  const runner = dependencies.runner ?? defaultCommandRunner;
  const now = dependencies.now ?? ((): number => performance.now());
  const resolvePaths =
    dependencies.resolveRepositoryPaths ?? ((): Promise<RepositoryPaths> => resolveRepositoryPaths(import.meta.url, nodeFileSystem));
  const loadRequirements =
    dependencies.loadRepositoryRequirements
    ?? ((paths: RepositoryPaths): Promise<RequirementLoadResult> =>
      loadRepositoryRequirements(paths, {files: nodeFileSystem, tasks: nodeTaskScheduler}));
  const createInspectionSession = dependencies.createInspectionSession ?? createRepositoryInspectionSession;
  const phases = dependencies.phases ?? setupPhases;

  logger.banner([
    "arolariu.ro repository setup",
    options.dryRun
      ? "Dry run: planning every phase without mutating the repository."
      : "Preparing every required workspace, toolchain, and local dependency.",
  ]);

  const paths = await resolvePaths();
  const requirementLoad = await loadRequirements(paths);
  if (requirementLoad.status === "invalid") {
    throw new Error(`Repository requirements are invalid:\n${requirementLoad.errors.join("\n")}`);
  }

  // Constructed exactly once, after paths and requirements are valid, and shared by reference
  // across every phase's SetupContext below.
  const inspection = createInspectionSession({
    profile: "full",
    paths,
    runner,
    ...(options.engine === undefined ? {} : {requestedEngine: options.engine}),
    env: process.env,
    platform: process.platform,
    now,
  });

  const actions = createSetupActionExecutor({options, prompts, logger});
  const context: SetupContext = {
    options,
    paths,
    requirements: requirementLoad.requirements,
    inspection,
    runner,
    prompts,
    actions,
    logger,
    now,
  };

  const results: SetupPhaseResult[] = [];
  const resultById = new Map<string, SetupPhaseResult>();
  const blockerSkipIds = new Set<string>();

  for (const phase of phases) {
    const phaseLogger = logger.child(phase.id);
    phaseLogger.section(phase.title);

    const unmetDependency = phase.dependsOn.find(
      (dependencyId) => !isDependencySatisfied(resultById.get(dependencyId), options.dryRun, blockerSkipIds),
    );

    let result: SetupPhaseResult;
    if (unmetDependency !== undefined) {
      const dependencyResult = resultById.get(unmetDependency);
      const startedAt = now();
      phaseLogger.debug(`Dependency check for '${phase.title}': ${unmetDependencyEvidence(unmetDependency, dependencyResult)}`);
      result = {
        id: phase.id,
        status: "skipped",
        summary: `Skipped '${phase.title}' because dependency '${unmetDependency}' did not succeed.`,
        evidence: [unmetDependencyEvidence(unmetDependency, dependencyResult)],
        nextActions: [`Resolve '${unmetDependency}', then rerun setup.`],
        durationMs: Math.max(0, now() - startedAt),
      };
      blockerSkipIds.add(phase.id);
    } else {
      const startedAt = now();
      const phaseRunner = createPhaseCommandRunner(runner, phaseLogger, options.verbose);
      const phaseContext: SetupContext = {...context, runner: phaseRunner};
      try {
        result = await phase.run(phaseContext);
      } catch (error: unknown) {
        if (isInterrupted(error)) {
          throw error;
        }
        result = {
          id: phase.id,
          status: "failed",
          summary: `'${phase.title}' failed with an unexpected exception.`,
          evidence: [errorMessage(error)],
          nextActions: [`Resolve the reported '${phase.title}' failure, then rerun setup.`],
          durationMs: Math.max(0, now() - startedAt),
        };
      }
    }

    results.push(result);
    resultById.set(phase.id, result);
    renderPhaseResult(phaseLogger, result);
  }

  logger.section("Setup summary");
  logger.table({
    headers: ["Phase", "Status", "Duration", "Summary"],
    rows: results.map((result) => [result.id, result.status, formatDuration(result.durationMs), result.summary]),
  });

  const degradedResults = results.filter((result) => result.status === "degraded");
  if (degradedResults.length > 0) {
    logger.section("Degraded capabilities");
    for (const degradedResult of degradedResults) {
      logger.warn(degradedResult.summary);
    }
  }

  const nextActions = results.flatMap((result) => result.nextActions);
  if (nextActions.length > 0) {
    logger.section("Next actions");
    nextActions.forEach((nextAction, index) => logger.line(`${index + 1}. ${nextAction}`));
  }

  const phaseById = new Map(phases.map((phase) => [phase.id, phase]));
  const blocked = results.some((result) => {
    const definition = phaseById.get(result.id);
    return definition !== undefined && definition.required && blocksReadiness(result, options.dryRun, blockerSkipIds);
  });
  const outcome: "ready" | "degraded" | "failed" = blocked ? "failed" : degradedResults.length > 0 ? "degraded" : "ready";

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

  return {exitCode: blocked ? 1 : 0, results};
}

/**
 * Runs the setup CLI entrypoint.
 *
 * @remarks
 * Commander owns `--help`/`-h`/`/h` and every option-parse error: help is
 * rendered and returns `0`; a parse error (unknown option, missing/invalid
 * `--engine` value, or an unexpected positional argument) is rendered
 * through the logger and returns `1`. Neither path resolves repository
 * paths, loads requirements, or runs a phase. Once options parse
 * successfully, every other failure is classified before this function
 * returns: a path/requirements error renders and returns `1`; an
 * `AbortError` renders an interruption notice and returns `130`.
 * {@link runSetup} itself still rethrows an `AbortError` unchanged so direct
 * callers can distinguish interruption from failure.
 *
 * @param argv - Arguments following the setup entrypoint.
 * @param dependencies - Optional boundary replacements, primarily for tests
 * that must inject a deterministic logger, phases, or repository seam
 * without reading the live checkout.
 * @returns Process exit code.
 */
export async function main(
  argv: readonly string[] = process.argv.slice(2),
  dependencies: Readonly<Partial<SetupDependencies>> = {},
): Promise<number> {
  const parseLogger = dependencies.logger ?? new MonorepositoryConsoleLogger("setup", {verbose: false});
  const program = buildSetupProgram(parseLogger);

  try {
    program.parse(argv, {from: "user"});
  } catch (error: unknown) {
    return commanderExitCode(error) ?? 1;
  }

  const options = optionsFromProgram(program);
  const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("setup", {verbose: options.verbose});
  try {
    const {exitCode} = await runSetup(options, {...dependencies, logger});
    return exitCode;
  } catch (error: unknown) {
    if (isInterrupted(error)) {
      logger.warn(`Setup was interrupted: ${errorMessage(error)}`);
      return 130;
    }
    logger.error(errorMessage(error));
    return 1;
  }
}

const setupEntrypointPath = process.argv[1];
if (setupEntrypointPath !== undefined && fileURLToPath(import.meta.url) === resolve(setupEntrypointPath)) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      new MonorepositoryConsoleLogger("setup", {verbose: false}).error(errorMessage(error));
      process.exitCode = isInterrupted(error) ? 130 : 1;
    });
}
