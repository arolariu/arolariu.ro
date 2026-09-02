/**
 * @fileoverview Generation CLI orchestrator for monorepo build artifacts.
 * @module scripts/generate
 *
 * @remarks
 * This module wires together multiple generators (env, i18n, gql, artifacts) under
 * a single CLI command, keeping output consistent across tools.
 */

import type {Command} from "commander";

import {commanderExitCode, createToolProgram} from "./common/cli.ts";
import type {CommandInvoker} from "./common/commander.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";
import {generateEnvironmentCommand} from "./generate.env.ts";
import {generateGraphqlCommand} from "./generate.gql.ts";
import {generateI18nCommand} from "./generate.i18n.ts";

/**
 * Invokes one migrated `generate` leaf command programmatically and returns its exit code.
 *
 * @remarks
 * This bridges the legacy aggregate orchestrator to the declarative command runtime until
 * Task 8 migrates the aggregate entrypoint itself. Each leaf command creates its own runtime
 * scope (its own logger, environment snapshot, and cancellation) rather than nesting under the
 * aggregate's shared logger.
 *
 * @param command - The migrated leaf command to invoke.
 * @param verbose - Enables verbose diagnostic output for this leaf invocation.
 * @returns The leaf command's exit code.
 */
async function invokeLeaf<TOutput>(
  command: CommandInvoker<Readonly<{verbose: boolean}>, TOutput>,
  verbose: boolean,
): Promise<number> {
  const execution = await command.invoke({verbose}, {presentation: "human"});
  return execution.exitCode;
}

/**
 * Selects the generators and verbosity used by the generation orchestrator.
 */
export type CommandLineOptions = {
  /**
   * Enables verbose logging during the generation process.
   */
  verbose: boolean;

  /**
   * Indicates whether to generate GraphQL types.
   */
  generateGql: boolean;

  /**
   * Indicates whether to generate internationalization (i18n) assets.
   */
  generateI18n: boolean;

  /**
   * Indicates whether to generate environment configuration files.
   */
  generateEnv: boolean;

  /**
   * Indicates whether to generate official taxonomy artifacts (GPC and EU standards).
   */
  generateArtifacts: boolean;
};

/**
 * Runs the selected monorepository generators with one shared logging context.
 *
 * @param options - Selected generators and verbose-output preference.
 * @param logger - Optional caller-owned logger whose child contexts are passed to each selected generator.
 * @returns Zero after every selected generator succeeds, or the first nonzero generator result.
 */
export async function main(options: Readonly<CommandLineOptions>, logger?: MonorepositoryLogger): Promise<number> {
  const {verbose, generateGql, generateI18n, generateEnv, generateArtifacts} = options;
  const output = logger ?? new MonorepositoryConsoleLogger("generate", {verbose});

  output.banner(
    [
      "",
      "╔══════════════════════════════════════════════════════════════════╗",
      "║          ||arolariu.ro|| Generation Orchestrator                 ║",
      "╚══════════════════════════════════════════════════════════════════╝",
      "",
    ],
    "magenta",
  );

  output.line([{text: "🔧 Configuration:", styles: ["cyan"]}]);
  output.line();
  output.line([
    {text: "   Verbose: ", styles: ["gray"]},
    {text: verbose ? "✅ Enabled" : "❌ Disabled", styles: [verbose ? "green" : "red"]},
  ]);
  output.line([
    {text: "   Working Directory: ", styles: ["gray"]},
    {text: process.cwd(), styles: ["dim"]},
  ]);
  output.line([{text: "   Selected Tasks:", styles: ["gray"]}]);
  for (const [name, selected] of [
    ["Env", generateEnv],
    ["i18n", generateI18n],
    ["GraphQL", generateGql],
    ["Artifacts", generateArtifacts],
  ] as const) {
    output.line([
      {text: `     • ${name} (`, styles: ["gray"]},
      {text: selected ? "✓" : "✗", styles: [selected ? "green" : "red"]},
      {text: ")", styles: ["gray"]},
    ]);
  }
  output.line();

  if (!(generateEnv || generateI18n || generateGql || generateArtifacts)) {
    output.warn("No generation tasks selected. Nothing to do.");
    output.line([{text: "   Tip: Use one or more flags (e.g. /env /i18n /gql /artifacts).", styles: ["gray"]}]);
    return 0;
  }

  let tasksExecuted = 0;

  if (generateEnv) {
    output.info("Running environment configuration generator...");
    const result = await invokeLeaf(generateEnvironmentCommand, verbose);
    if (result !== 0) {
      return result;
    }
    tasksExecuted++;
  }

  if (generateI18n) {
    output.info("Running internationalization (i18n) generator...");
    const result = await invokeLeaf(generateI18nCommand, verbose);
    if (result !== 0) {
      return result;
    }
    tasksExecuted++;
  }

  if (generateGql) {
    output.info("Running GraphQL types generator...");
    const result = await invokeLeaf(generateGraphqlCommand, verbose);
    if (result !== 0) {
      return result;
    }
    tasksExecuted++;
  }

  if (generateArtifacts) {
    output.info("Running taxonomy and license artifact generator...");
    const result = await import("./generate.artifacts.ts").then((module) => module.main({}, output.child("artifacts")));
    if (result !== 0) {
      return result;
    }
    tasksExecuted++;
  }

  output.line();
  output.success("All requested generation tasks completed.");
  output.line([
    {text: "   Executed ", styles: ["gray"]},
    {text: String(tasksExecuted), styles: ["green"]},
    {text: " task(s).", styles: ["gray"]},
  ]);
  return 0;
}

/**
 * Builds a configured Commander program for the generation orchestrator CLI.
 *
 * @param logger - Logger used to route Commander help and error output.
 * @returns Configured Commander program with all generation flag options and slash aliases.
 */
export function createGenerateProgram(logger: MonorepositoryLogger): Command {
  const program = createToolProgram({
    name: "generate",
    description: "Generation orchestrator for monorepo build artifacts.",
    examples: ["npm run generate /env /artifacts", "npm run generate --env --i18n --artifacts --verbose", "npm run generate -e -g -a -v"],
    logger,
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
  });
  program
    .option("-v, --verbose", "Enable verbose logging. 🔊")
    .option("-e, --env", "Generate environment configuration file (.env). ☁️")
    .option("-i, --i18n", "Synchronize translation keys (messages). 🌍")
    .option("-g, --gql", "Generate GraphQL type artifacts. 🧬")
    .option("-a, --artifacts", "Generate taxonomy and license artifacts. 🏷️");
  return program;
}

if (import.meta.main) {
  const cliLogger = new MonorepositoryConsoleLogger("generate");
  const program = createGenerateProgram(cliLogger);

  try {
    program.parse();
  } catch (error: unknown) {
    const code = commanderExitCode(error);
    process.exit(code ?? 1);
  }

  const opts = program.opts<{verbose?: boolean; env?: boolean; i18n?: boolean; gql?: boolean; artifacts?: boolean}>();
  const {verbose = false} = opts;
  const logger = new MonorepositoryConsoleLogger("generate", {verbose});

  try {
    const code = await main(
      {
        verbose,
        generateEnv: opts.env ?? false,
        generateI18n: opts.i18n ?? false,
        generateGql: opts.gql ?? false,
        generateArtifacts: opts.artifacts ?? false,
      },
      logger,
    );
    process.exit(code);
  } catch (error: unknown) {
    logger.error(`Unexpected error in generation orchestrator: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
