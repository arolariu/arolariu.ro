/**
 * @fileoverview Generation CLI orchestrator for monorepo build artifacts.
 * @module scripts/generate
 *
 * @remarks
 * This module wires together multiple generators (env, acks, i18n, gql) under
 * a single CLI command, keeping output consistent across tools.
 */

import {styleText} from "node:util";

/**
 * Master generation orchestrator for monorepo assets (env, acks, i18n, gql).
 * Provides a unified CLI with colored, emoji-rich output consistent with `generate.env.ts`.
 */
type CommandLineOptions = {
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
   * Indicates whether to generate acknowledgements (akin to SBOM, but lightweight).
   */
  generateAcks: boolean;

  /**
   * Indicates whether to generate environment configuration files.
   */
  generateEnv: boolean;
};

export async function main(options: Readonly<CommandLineOptions>): Promise<number> {
  const {verbose, generateGql, generateI18n, generateAcks, generateEnv} = options;

  console.log(styleText("magenta", "\n╔══════════════════════════════════════════════════════════════════╗"));
  console.log(styleText("magenta", "║          ||arolariu.ro|| Generation Orchestrator                 ║"));
  console.log(styleText("magenta", "╚══════════════════════════════════════════════════════════════════╝\n"));

  console.log(styleText("cyan", "🔧 Configuration:\n"));
  console.log(styleText("gray", `   Verbose: ${verbose ? styleText("green", "✅ Enabled") : styleText("red", "❌ Disabled")}`));
  console.log(styleText("gray", `   Working Directory: ${styleText("dim", process.cwd())}`));
  console.log(styleText("gray", `   Selected Tasks:`));
  console.log(styleText("gray", `     • Env (${generateEnv ? styleText("green", "✓") : styleText("red", "✗")})`));
  console.log(styleText("gray", `     • Acks (${generateAcks ? styleText("green", "✓") : styleText("red", "✗")})`));
  console.log(styleText("gray", `     • i18n (${generateI18n ? styleText("green", "✓") : styleText("red", "✗")})`));
  console.log(styleText("gray", `     • GraphQL (${generateGql ? styleText("green", "✓") : styleText("red", "✗")})`));
  console.log();

  if (!(generateEnv || generateAcks || generateI18n || generateGql)) {
    console.log(styleText("yellow", "⚠ No generation tasks selected. Nothing to do."));
    console.log(styleText("gray", "   Tip: Use one or more flags (e.g. /env /acks /i18n /gql)."));
    return 0;
  }

  let tasksExecuted = 0;

  if (generateEnv) {
    console.log(styleText("cyan", "🚀 Running environment configuration generator..."));
    await import("./generate.env.ts").then((module) => module.main(verbose));
    tasksExecuted++;
  }

  if (generateAcks) {
    console.log(styleText("cyan", "📄 Running acknowledgements (licenses) generator..."));
    await import("./generate.acks.ts").then((module) => module.main(verbose));
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

  console.log(styleText("green", "\n✨ All requested generation tasks completed."));
  console.log(styleText("gray", `   Executed ${styleText("green", String(tasksExecuted))} task(s).`));
  return 0;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const verbose = argv.some((a) => ["/verbose", "/v", "--verbose", "-v"].includes(a));
  const generateGql = argv.some((a) => ["/gql", "/g", "--gql", "-g"].includes(a));
  const generateI18n = argv.some((a) => ["/i18n", "/i", "--i18n", "-i"].includes(a));
  const generateAcks = argv.some((a) => ["/acks", "/a", "--acks", "-a"].includes(a));
  const generateEnv = argv.some((a) => ["/env", "/e", "--env", "-e"].includes(a));
  const wantsHelp = argv.some((a) => ["/help", "/h", "--help", "-h"].includes(a));

  if (wantsHelp || argv.length === 0) {
    console.log(styleText("magenta", "\n╔══════════════════════════════════════════════════════════════════╗"));
    console.log(styleText("magenta", "║                 ||arolariu.ro|| Generation CLI Help              ║"));
    console.log(styleText("magenta", "╚══════════════════════════════════════════════════════════════════╝\n"));
    console.log(styleText("cyan", "Usage:"), styleText("gray", "npm run generate [flags]\n"));
    console.log(styleText("cyan", "Flags:"));
    console.log(`  ${styleText("green", "/env     /e   --env   -e")}   Generate environment configuration file (.env) ☁️`);
    console.log(`  ${styleText("green", "/acks    /a   --acks  -a")}   Generate acknowledgements (licenses.json) 📄`);
    console.log(`  ${styleText("green", "/i18n    /i   --i18n  -i")}   Synchronize translation keys (messages) 🌍`);
    console.log(`  ${styleText("green", "/gql     /g   --gql   -g")}   Generate GraphQL type artifacts 🧬`);
    console.log(`  ${styleText("green", "/verbose /v   --verbose -v")} Enable verbose logging 🔊`);
    console.log(`  ${styleText("green", "/help    /h   --help  -h")}   Show this help menu ❓`);
    console.log("\nExamples:");
    console.log(styleText("gray", "  npm run generate /env /acks"));
    console.log(styleText("gray", "  npm run generate --env --i18n --verbose"));
    console.log(styleText("gray", "  npm run generate -e -g -v"));
    if (wantsHelp) process.exit(0);
  }

  const options: CommandLineOptions = {verbose, generateGql, generateI18n, generateAcks, generateEnv};
  try {
    const code = await main(options);
    process.exit(code);
  } catch (err) {
    console.error(styleText("red", "Unexpected error in generation orchestrator:"));
    console.error(err);
    process.exit(1);
  }
}
