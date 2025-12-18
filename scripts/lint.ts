/**
 * @fileoverview Monorepo ESLint CLI that runs per-target configs in parallel.
 * @module scripts/lint
 *
 * @remarks
 * This module is the script entrypoint for `npm run lint`.
 *
 * It offloads actual lint execution to Piscina workers to keep the main thread
 * responsive and to reduce wall-clock time when linting multiple targets.
 */

import process from "node:process";
import pc from "picocolors";
import Piscina from "piscina";
import type {ESLintWorkerInput, ESLintWorkerResult} from "./types/lint.ts";

type LintTarget = "all" | "packages" | "website" | "cv";

/**
 * Maps lint targets to their ESLint config names.
 *
 * @remarks
 * The config names are used by the worker to select the correct configuration
 * and scope for the lint run.
 */
const configNameMap: Record<Exclude<LintTarget, "all">, string> = {
  packages: "[@arolariu/packages]",
  website: "[@arolariu/website]",
  cv: "[@arolariu/cv]",
};

/**
 * All lint targets in consistent order for parallel execution.
 *
 * @remarks
 * Ordering is preserved when printing results to keep output stable across runs.
 */
const allTargets: Exclude<LintTarget, "all">[] = ["packages", "website", "cv"];

/**
 * Prints the result from an ESLint worker with formatted output.
 *
 * @remarks
 * This is a presentation helper. The worker may return either:
 * - `error`: an unexpected worker-level failure, or
 * - counts and textual output for standard ESLint results.
 *
 * @param result - The ESLint worker result.
 * @returns Nothing.
 */
function printWorkerResult(result: ESLintWorkerResult): void {
  const workerInfo = pc.gray(`[Worker #${result.workerId}]`);
  const durationInfo = pc.gray(`[${result.durationMs}ms]`);
  console.log(pc.cyan(`\n🔍 ESLint config: ${pc.bold(result.configName)} ${workerInfo} ${durationInfo}`));

  if (result.error) {
    console.log(pc.red(`  ✗ Worker error: ${result.error}`));
    return;
  }

  if (result.resultText) {
    console.log(result.resultText);
  }

  if (result.errorCount > 0 || result.warningCount > 0) {
    if (result.errorCount > 0) {
      console.log(pc.red(`  ✗ ESLint found ${result.errorCount} error(s) and ${result.warningCount} warning(s)`));
    } else {
      console.log(pc.yellow(`  ⚠ ESLint found ${result.warningCount} warning(s)`));
    }
  } else {
    console.log(pc.green(`  ✓ No linting issues found for ${result.configName}`));
  }
}

/**
 * Runs ESLint for the specified target using Piscina worker threads.
 *
 * @remarks
 * When `lintTarget` is `all`, this dispatches one worker per target and
 * aggregates counts to compute a conventional process exit code.
 *
 * @param lintTarget - The target to lint.
 * @returns Exit code (0 for success, 1 for any error).
 */
async function startESLint(lintTarget: LintTarget): Promise<number> {
  console.log(pc.bold(pc.magenta(`\n🔎 Running ESLint for: ${lintTarget}`)));

  // Create Piscina worker pool
  const piscina = new Piscina({
    filename: new URL("./workers/eslint.worker.ts", import.meta.url).href,
    minThreads: 1,
    maxThreads: 3,
    idleTimeout: 500,
  });

  try {
    if (lintTarget === "all") {
      console.log(pc.yellow("⏱️  Running lint on all targets in parallel..."));
      console.log(pc.bold(pc.magenta("\n🧵 Dispatching workers for parallel linting...")));
      console.log(pc.gray(`   Main process PID: ${process.pid}`));
      console.log(pc.gray(`   Worker pool: min=${piscina.options.minThreads}, max=${piscina.options.maxThreads}\n`));

      // Dispatch all targets in parallel
      const promises = allTargets.map((target) => {
        const configName = configNameMap[target];
        const input: ESLintWorkerInput = {configName};
        return piscina.run(input) as Promise<ESLintWorkerResult>;
      });

      // Wait for all workers to complete
      const results = await Promise.all(promises);

      // Print results in consistent order (packages → website → cv)
      let totalErrors = 0;
      let totalWarnings = 0;

      for (const result of results) {
        console.log(pc.gray("\n─────────────────────────────────────────────────"));
        printWorkerResult(result);
        console.log(pc.gray("─────────────────────────────────────────────────"));

        if (result.error) {
          totalErrors++;
        } else {
          totalErrors += result.errorCount;
          totalWarnings += result.warningCount;
        }
      }

      console.log(pc.bold(pc.cyan(`\n📊 Summary: ${totalErrors} error(s), ${totalWarnings} warning(s)`)));
      return totalErrors > 0 ? 1 : 0;
    } else {
      // Single target - still use worker for consistency
      const configName = configNameMap[lintTarget];
      const input: ESLintWorkerInput = {configName};
      const result = (await piscina.run(input)) as ESLintWorkerResult;

      printWorkerResult(result);

      if (result.error) {
        return 1;
      }
      return result.errorCount > 0 ? 1 : 0;
    }
  } finally {
    // Always close the pool
    await piscina.close();
  }
}

/**
 * Runs the lint CLI.
 *
 * @remarks
 * This is the script entrypoint used by Nx/package scripts.
 *
 * @param arg - Target name (`all`, `packages`, `website`, `cv`).
 * @returns Process exit code (0 for success, non-zero for failure).
 */
export async function main(arg?: string): Promise<number> {
  console.log(pc.bold(pc.magenta("\n╔════════════════════════════════════════╗")));
  console.log(pc.bold(pc.magenta("║    arolariu.ro Code Linter Tool        ║")));
  console.log(pc.bold(pc.magenta("╚════════════════════════════════════════╝\n")));

  if (!arg) {
    console.error(pc.red("✗ Missing target argument"));
    console.log(pc.gray("\n💡 Usage: lint <all|packages|website|cv>"));
    console.log(pc.gray("   - all:      Lint all targets"));
    console.log(pc.gray("   - packages: Lint component packages"));
    console.log(pc.gray("   - website:  Lint main website"));
    console.log(pc.gray("   - cv:       Lint CV site\n"));
    return 1;
  }

  try {
    let exitCode = 0;

    switch (arg) {
      case "all":
        exitCode = await startESLint("all");
        break;
      case "packages":
        exitCode = await startESLint("packages");
        break;
      case "website":
        exitCode = await startESLint("website");
        break;
      case "cv":
        exitCode = await startESLint("cv");
        break;
      default:
        console.error(pc.red(`✗ Invalid target: "${arg}"`));
        console.log(pc.gray("\n💡 Valid targets: all, packages, website, cv\n"));
        return 1;
    }

    if (exitCode === 0) {
      console.log(pc.bold(pc.green("\n✅ Linting completed successfully!\n")));
    } else {
      console.log(pc.bold(pc.red("\n❌ Linting completed with errors\n")));
    }

    return exitCode;
  } catch (error) {
    console.error(pc.bold(pc.red("\n❌ Linting failed with errors:")), error);
    return 1;
  }
}

if (import.meta.main) {
  const arg = process.argv[2];
  main(arg)
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
