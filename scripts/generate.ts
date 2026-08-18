/**
 * @fileoverview Generation CLI orchestrator for monorepo build artifacts.
 * @module scripts/generate
 *
 * @remarks
 * This module wires together multiple generators (env, i18n, gql, artifacts) under
 * a single CLI command, keeping output consistent across tools.
 */

import {styleText} from "node:util";

/**
 * Master generation orchestrator for monorepo assets (env, i18n, gql, artifacts).
 * Provides a unified CLI with colored, emoji-rich output consistent with `generate.env.ts`.
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

export async function main(options: Readonly<CommandLineOptions>): Promise<number> {
  const {verbose, generateGql, generateI18n, generateEnv, generateArtifacts} = options;

  console.log(styleText("magenta", "\n╔══════════════════════════════════════════════════════════════════╗"));
  console.log(styleText("magenta", "║          ||arolariu.ro|| Generation Orchestrator                 ║"));
  console.log(styleText("magenta", "╚══════════════════════════════════════════════════════════════════╝\n"));

  console.log(styleText("cyan", "🔧 Configuration:\n"));
  console.log(styleText("gray", `   Verbose: ${verbose ? styleText("green", "✅ Enabled") : styleText("red", "❌ Disabled")}`));
  console.log(styleText("gray", `   Working Directory: ${styleText("dim", process.cwd())}`));
  console.log(styleText("gray", `   Selected Tasks:`));
  console.log(styleText("gray", `     • Env (${generateEnv ? styleText("green", "✓") : styleText("red", "✗")})`));
  console.log(styleText("gray", `     • i18n (${generateI18n ? styleText("green", "✓") : styleText("red", "✗")})`));
  console.log(styleText("gray", `     • GraphQL (${generateGql ? styleText("green", "✓") : styleText("red", "✗")})`));
  console.log(styleText("gray", `     • Artifacts (${generateArtifacts ? styleText("green", "✓") : styleText("red", "✗")})`));
  console.log();

  if (!(generateEnv || generateI18n || generateGql || generateArtifacts)) {
    console.log(styleText("yellow", "⚠ No generation tasks selected. Nothing to do."));
    console.log(styleText("gray", "   Tip: Use one or more flags (e.g. /env /i18n /gql /artifacts)."));
    return 0;
  }

  let tasksExecuted = 0;

  if (generateEnv) {
    console.log(styleText("cyan", "🚀 Running environment configuration generator..."));
    await import("./generate.env.ts").then((module) => module.main(verbose));
    tasksExecuted++;
  }

  if (generateI18n) {
    console.log(styleText("cyan", "🌍 Running internationalization (i18n) generator..."));
    await import("./generate.i18n.ts").then((module) => module.main(verbose));
    tasksExecuted++;
  }

  if (generateGql) {
    console.log(styleText("cyan", "🧬 Running GraphQL types generator..."));
    await import("./generate.gql.ts").then((module) => module.main(verbose));
    tasksExecuted++;
  }

  if (generateArtifacts) {
    console.log(styleText("cyan", "🏷️ Running taxonomy and license artifact generator..."));
    await import("./generate.artifacts.ts").then((module) => module.main());
    tasksExecuted++;
  }

  console.log(styleText("green", "\n✨ All requested generation tasks completed."));
  console.log(styleText("gray", `   Executed ${styleText("green", String(tasksExecuted))} task(s).`));
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

  if (wantsHelp || argv.length === 0) {
    console.log(styleText("magenta", "\n╔══════════════════════════════════════════════════════════════════╗"));
    console.log(styleText("magenta", "║                 ||arolariu.ro|| Generation CLI Help              ║"));
    console.log(styleText("magenta", "╚══════════════════════════════════════════════════════════════════╝\n"));
    console.log(styleText("cyan", "Usage:"), styleText("gray", "npm run generate [flags]\n"));
    console.log(styleText("cyan", "Flags:"));
    console.log(`  ${styleText("green", "/env     /e   --env   -e")}   Generate environment configuration file (.env) ☁️`);
    console.log(`  ${styleText("green", "/i18n    /i   --i18n  -i")}   Synchronize translation keys (messages) 🌍`);
    console.log(`  ${styleText("green", "/gql     /g   --gql   -g")}   Generate GraphQL type artifacts 🧬`);
    console.log(`  ${styleText("green", "/artifacts /a   --artifacts -a")} Generate taxonomy and license artifacts 🏷️`);
    console.log(`  ${styleText("green", "/verbose /v   --verbose -v")} Enable verbose logging 🔊`);
    console.log(`  ${styleText("green", "/help    /h   --help  -h")}   Show this help menu ❓`);
    console.log("\nExamples:");
    console.log(styleText("gray", "  npm run generate /env /artifacts"));
    console.log(styleText("gray", "  npm run generate --env --i18n --artifacts --verbose"));
    console.log(styleText("gray", "  npm run generate -e -g -a -v"));
    if (wantsHelp) process.exit(0);
  }

  try {
    const code = await main(options);
    process.exit(code);
  } catch (err) {
    console.error(styleText("red", "Unexpected error in generation orchestrator:"));
    console.error(err);
    process.exit(1);
  }
}
