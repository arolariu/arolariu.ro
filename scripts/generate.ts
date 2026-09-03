/**
 * @fileoverview Generation orchestrator command for monorepository build artifacts.
 * @module scripts/generate
 *
 * @remarks
 * The orchestrator composes the four generator command objects (`env`, `i18n`, `gql`, and
 * `artifacts`) through typed nested {@link CommandInvoker.invoke} calls inside its own runtime
 * scope. It never spawns a sibling script, never parses another command's argv, and never writes
 * a process exit code itself: every child runs as a nested invocation of this command's context,
 * so one cancellation, one logger, and one cleanup lifecycle cover the whole run.
 */

import {CommandCancellation} from "./common/runtime.ts";
import type {CommandExecution, CommandExecutionContext, CommandInvoker} from "./core/command/command-execution.ts";
import {defineCommand, type LazyMonorepoCommand} from "./core/command/lazy-monorepo-command.ts";
import type {CommandConstructionOptions, CommandHost} from "./core/command/command-specification.ts";
import {generateArtifactsCommand, type ArtifactGenerationResult, type GenerateArtifactsInput} from "./generate.artifacts.ts";
import {generateEnvironmentCommand, type GenerateLeafInput, type GenerateLeafResult} from "./generate.env.ts";
import {generateGraphqlCommand} from "./generate.gql.ts";
import {generateI18nCommand} from "./generate.i18n.ts";

/** Every generator the orchestrator can select, in fixed execution order. */
export type GenerateTaskName = "env" | "i18n" | "gql" | "artifacts";

/** Typed input accepted by the generation orchestrator. */
export interface GenerateInput {
  /** Enables verbose logging for the orchestrator and every selected generator. */
  readonly verbose: boolean;
  /** Selects the environment configuration generator. */
  readonly env: boolean;
  /** Selects the internationalization generator. */
  readonly i18n: boolean;
  /** Selects the GraphQL type generator. */
  readonly gql: boolean;
  /** Selects the taxonomy and license artifact generator. */
  readonly artifacts: boolean;
}

/** Typed business result produced by the generation orchestrator. */
export interface GenerateResult {
  /** Selected generators, in fixed execution order. */
  readonly selected: readonly GenerateTaskName[];
  /** Generators that completed successfully before the run ended. */
  readonly completed: readonly GenerateTaskName[];
  /** The first generator that failed or completed with a nonzero exit code, when one did. */
  readonly failed?: GenerateTaskName;
}

/** Child generator commands the orchestrator composes. */
export interface GenerateCommandDependencies {
  /** Environment configuration generator. */
  readonly env: CommandInvoker<GenerateLeafInput, GenerateLeafResult>;
  /** Internationalization generator. */
  readonly i18n: CommandInvoker<GenerateLeafInput, GenerateLeafResult>;
  /** GraphQL type generator. */
  readonly gql: CommandInvoker<GenerateLeafInput, GenerateLeafResult>;
  /** Taxonomy and license artifact generator. */
  readonly artifacts: CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult>;
}

/**
 * The narrowest child contract the orchestrator depends on: one `{verbose}` input and one
 * summarized business result, satisfied by every generator command object.
 */
type GenerateChildInvoker = CommandInvoker<GenerateArtifactsInput, Readonly<{summary: string}>>;

/** One selectable generator: its input key, its child command, and its human label. */
interface GenerateTask {
  /** Input key and result identity of this generator. */
  readonly name: GenerateTaskName;
  /** Child command invoked when this generator is selected. */
  readonly invoker: GenerateChildInvoker;
  /** Label rendered in orchestrator progress output. */
  readonly label: string;
}

/**
 * Builds the fixed `env -> i18n -> gql -> artifacts` execution plan.
 *
 * @param dependencies - Child generator commands.
 * @returns Every selectable generator in fixed execution order.
 */
function createGenerateTasks(dependencies: Readonly<GenerateCommandDependencies>): readonly GenerateTask[] {
  return [
    {name: "env", invoker: dependencies.env, label: "environment configuration generator"},
    {name: "i18n", invoker: dependencies.i18n, label: "internationalization (i18n) generator"},
    {name: "gql", invoker: dependencies.gql, label: "GraphQL types generator"},
    {name: "artifacts", invoker: dependencies.artifacts, label: "taxonomy and license artifact generator"},
  ];
}

/**
 * Renders the orchestrator banner, configuration, and selected-task summary.
 *
 * @param context - Command context whose runtime owns logging and the environment snapshot.
 * @param input - Typed command input.
 * @param tasks - Fixed execution plan.
 */
function renderConfiguration(
  context: Readonly<CommandExecutionContext>,
  input: Readonly<GenerateInput>,
  tasks: readonly GenerateTask[],
): void {
  const {logger, environment} = context.runtime;

  logger.banner(
    [
      "",
      "╔══════════════════════════════════════════════════════════════════╗",
      "║          ||arolariu.ro|| Generation Orchestrator                 ║",
      "╚══════════════════════════════════════════════════════════════════╝",
      "",
    ],
    "magenta",
  );

  logger.line([{text: "🔧 Configuration:", styles: ["cyan"]}]);
  logger.line();
  logger.line([
    {text: "   Verbose: ", styles: ["gray"]},
    {text: input.verbose ? "✅ Enabled" : "❌ Disabled", styles: [input.verbose ? "green" : "red"]},
  ]);
  logger.line([
    {text: "   Working Directory: ", styles: ["gray"]},
    {text: environment.cwd, styles: ["dim"]},
  ]);
  logger.line([{text: "   Selected Tasks:", styles: ["gray"]}]);
  for (const task of tasks) {
    const selected = input[task.name];
    logger.line([
      {text: `     • ${displayName(task.name)} (`, styles: ["gray"]},
      {text: selected ? "✓" : "✗", styles: [selected ? "green" : "red"]},
      {text: ")", styles: ["gray"]},
    ]);
  }
  logger.line();
}

/**
 * Returns the short display name used in the selected-task summary.
 *
 * @param name - Generator identity.
 * @returns Human-readable generator name.
 */
function displayName(name: GenerateTaskName): string {
  switch (name) {
    case "env": {
      return "Env";
    }
    case "i18n": {
      return "i18n";
    }
    case "gql": {
      return "GraphQL";
    }
    case "artifacts": {
      return "Artifacts";
    }
  }
}

/**
 * Converts one cancelled child execution back into a typed cancellation the command lifecycle
 * maps to the caller's `130`/`143` exit contract.
 *
 * @param execution - Cancelled child execution.
 * @returns The cancellation to rethrow.
 */
function toCancellation(execution: Extract<CommandExecution<unknown>, {status: "cancelled"}>): CommandCancellation {
  const {cause} = execution.failure;
  return cause instanceof CommandCancellation ? cause : new CommandCancellation(execution.failure.message, execution.exitCode);
}

/**
 * Runs every selected generator sequentially inside this orchestrator's runtime scope.
 *
 * @remarks
 * Each child is invoked with `{parent: context, presentation: "silent"}`, so it inherits this
 * invocation's cancellation, redactions, and cleanup ownership while the orchestrator stays the
 * only renderer of progress. A child that completes with a nonzero exit code or fails stops the
 * run and is reported as {@link GenerateResult.failed}; a cancelled child cancels the whole
 * orchestrator instead of being downgraded to a business failure.
 *
 * @param dependencies - Child generator commands.
 * @param context - Command context whose runtime owns every ambient capability.
 * @param input - Typed command input.
 * @returns Selected generators, completed generators, and the first failing generator.
 * @throws {CommandCancellation} When a child invocation was cancelled.
 */
async function executeGenerate(
  dependencies: Readonly<GenerateCommandDependencies>,
  context: Readonly<CommandExecutionContext>,
  input: Readonly<GenerateInput>,
): Promise<GenerateResult> {
  const {logger} = context.runtime;
  const tasks = createGenerateTasks(dependencies);
  const selected = tasks.filter((task) => input[task.name]).map((task) => task.name);

  renderConfiguration(context, input, tasks);

  if (selected.length === 0) {
    logger.warn("No generation tasks selected. Nothing to do.");
    logger.line([{text: "   Tip: Use one or more flags (e.g. /env /i18n /gql /artifacts).", styles: ["gray"]}]);
    return {selected, completed: []};
  }

  const completed: GenerateTaskName[] = [];

  for (const task of tasks) {
    if (!input[task.name]) continue;

    logger.info(`Running ${task.label}...`);
    // Intentionally sequential: a later generator must observe every earlier generator's written
    // artifacts, and the first nonzero result must stop the run.
    // eslint-disable-next-line no-await-in-loop
    const execution = await task.invoker.invoke({verbose: input.verbose}, {parent: context, presentation: "silent"});

    if (execution.status === "cancelled") {
      throw toCancellation(execution);
    }

    if (execution.status === "failed") {
      logger.error(`The ${task.label} failed: ${execution.failure.message}`);
      for (const evidence of execution.failure.evidence) {
        logger.error(evidence);
      }
      return {selected, completed, failed: task.name};
    }

    if (execution.status !== "completed" || execution.exitCode !== 0) {
      // A "completed" child still carries its typed business summary even on a nonzero exit
      // (e.g. i18n explaining which keys were added); surface it before the generic stop
      // warning instead of discarding it, since the silent child never rendered it itself.
      if (execution.status === "completed") {
        logger.warn(execution.value.summary);
      }
      logger.warn(`The ${task.label} reported a nonzero result; later generators were skipped.`);
      return {selected, completed, failed: task.name};
    }

    logger.success(execution.value.summary);
    completed.push(task.name);
  }

  return {selected, completed};
}

/** Production command host. This literal dynamic import is the only edge from this entrypoint
 *  into the Node adapter; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("./adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost("generate"));

/**
 * Creates the generation orchestrator command.
 *
 * @param dependencies - Child generator commands composed by this orchestrator.
 * @param options - The injected command host or a literal loader; defaults to the production
 * Node adapter.
 * @returns The typed `generate` command object.
 */
export function createGenerateCommand(
  dependencies: Readonly<GenerateCommandDependencies>,
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<GenerateInput, GenerateResult, never> {
  return defineCommand<GenerateInput, GenerateResult>(
    {
      name: "generate",
      description: "Generation orchestrator for monorepo build artifacts.",
      examples: [
        "npm run generate /env /artifacts",
        "npm run generate --env --i18n --artifacts --verbose",
        "npm run generate -e -g -a -v",
      ],
      slashAliases: {
        "/v": "--verbose",
        "/verbose": "--verbose",
        "/e": "--env",
        "/env": "--env",
        "/i": "--i18n",
        "/i18n": "--i18n",
        "/g": "--gql",
        "/gql": "--gql",
        "/a": "--artifacts",
        "/artifacts": "--artifacts",
      },
      configure: (program) => {
        program
          .option("-v, --verbose", "Enable verbose logging. 🔊")
          .option("-e, --env", "Generate environment configuration file (.env). ☁️")
          .option("-i, --i18n", "Synchronize translation keys (messages). 🌍")
          .option("-g, --gql", "Generate GraphQL type artifacts. 🧬")
          .option("-a, --artifacts", "Generate taxonomy and license artifacts. 🏷️");
      },
      decode: (program) => {
        const options = program.opts<{verbose?: boolean; env?: boolean; i18n?: boolean; gql?: boolean; artifacts?: boolean}>();
        return {
          verbose: options.verbose === true,
          env: options.env === true,
          i18n: options.i18n === true,
          gql: options.gql === true,
          artifacts: options.artifacts === true,
        };
      },
      execute: (context, input) => executeGenerate(dependencies, context, input),
      complete: (result) => ({
        exitCode: result.failed === undefined ? 0 : 1,
        value: result,
        human: (logger) => {
          if (result.failed !== undefined) {
            logger.error(`Generation stopped at the ${displayName(result.failed)} task.`);
            return;
          }
          if (result.selected.length === 0) {
            return;
          }

          logger.line();
          logger.success("All requested generation tasks completed.");
          logger.line([
            {text: "   Executed ", styles: ["gray"]},
            {text: String(result.completed.length), styles: ["green"]},
            {text: " task(s).", styles: ["gray"]},
          ]);
        },
      }),
    },
    options,
  );
}

/** Production singleton used by `npm run generate` and this module's direct entrypoint. */
export const generateCommand: LazyMonorepoCommand<GenerateInput, GenerateResult, never> = createGenerateCommand({
  env: generateEnvironmentCommand,
  i18n: generateI18nCommand,
  gql: generateGraphqlCommand,
  artifacts: generateArtifactsCommand,
});

await generateCommand.runIfMain(import.meta.url);
