/**
 * @fileoverview Generation CLI orchestrator for monorepo build artifacts.
 * @module scripts/generate
 *
 * @remarks
 * This module wires together multiple generators (env, i18n, gql, artifacts) under
 * a single CLI command, keeping output consistent across tools.
 */

import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";

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
    const result = await import("./generate.env.ts").then((module) => module.main(verbose, output.child("env")));
    if (result !== 0) {
      return result;
    }
    tasksExecuted++;
  }

  if (generateI18n) {
    output.info("Running internationalization (i18n) generator...");
    const result = await import("./generate.i18n.ts").then((module) => module.main(verbose, output.child("i18n")));
    if (result !== 0) {
      return result;
    }
    tasksExecuted++;
  }

  if (generateGql) {
    output.info("Running GraphQL types generator...");
    const result = await import("./generate.gql.ts").then((module) => module.main(verbose, output.child("gql")));
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

/** Parses generation CLI aliases into a stable options object. */
export function parseCommandLineOptions(argv: readonly string[]): CommandLineOptions {
  return {
    verbose: argv.some((argument) => ["/verbose", "/v", "--verbose", "-v"].includes(argument)),
    generateGql: argv.some((argument) => ["/gql", "/g", "--gql", "-g"].includes(argument)),
    generateI18n: argv.some((argument) => ["/i18n", "/i", "--i18n", "-i"].includes(argument)),
    generateEnv: argv.some((argument) => ["/env", "/e", "--env", "-e"].includes(argument)),
    generateArtifacts: argv.some((argument) => ["/artifacts", "/a", "--artifacts", "-a"].includes(argument)),
  };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const options = parseCommandLineOptions(argv);
  const wantsHelp = argv.some((a) => ["/help", "/h", "--help", "-h"].includes(a));
  const logger = new MonorepositoryConsoleLogger("generate", {verbose: options.verbose});

  if (wantsHelp || argv.length === 0) {
    logger.banner(
      [
        "",
        "╔══════════════════════════════════════════════════════════════════╗",
        "║                 ||arolariu.ro|| Generation CLI Help              ║",
        "╚══════════════════════════════════════════════════════════════════╝",
        "",
      ],
      "magenta",
    );
    logger.line([
      {text: "Usage: ", styles: ["cyan"]},
      {text: "npm run generate [flags]", styles: ["gray"]},
    ]);
    logger.line();
    logger.line([{text: "Flags:", styles: ["cyan"]}]);
    logger.line([{text: "  /env     /e   --env   -e", styles: ["green"]}, {text: "   Generate environment configuration file (.env) ☁️"}]);
    logger.line([{text: "  /i18n    /i   --i18n  -i", styles: ["green"]}, {text: "   Synchronize translation keys (messages) 🌍"}]);
    logger.line([{text: "  /gql     /g   --gql   -g", styles: ["green"]}, {text: "   Generate GraphQL type artifacts 🧬"}]);
    logger.line([{text: "  /artifacts /a   --artifacts -a", styles: ["green"]}, {text: " Generate taxonomy and license artifacts 🏷️"}]);
    logger.line([{text: "  /verbose /v   --verbose -v", styles: ["green"]}, {text: " Enable verbose logging 🔊"}]);
    logger.line([{text: "  /help    /h   --help  -h", styles: ["green"]}, {text: "   Show this help menu ❓"}]);
    logger.line();
    logger.line("Examples:");
    logger.line([{text: "  npm run generate /env /artifacts", styles: ["gray"]}]);
    logger.line([{text: "  npm run generate --env --i18n --artifacts --verbose", styles: ["gray"]}]);
    logger.line([{text: "  npm run generate -e -g -a -v", styles: ["gray"]}]);
    if (wantsHelp) process.exit(0);
  }

  try {
    const code = await main(options, logger);
    process.exit(code);
  } catch (error: unknown) {
    logger.error(`Unexpected error in generation orchestrator: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
