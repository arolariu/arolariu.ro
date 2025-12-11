import process from "node:process";
import {fileURLToPath} from "node:url";
import pc from "picocolors";
import Piscina from "piscina";
import type {FormatTarget, FormatWorkerInput, FormatWorkerResult} from "./types/format.ts";

/** All available format targets in consistent order */
const allTargets: FormatTarget[] = ["packages", "website", "cv", "api"];

/**
 * Prints a format worker result to the console.
 * @param result The format worker result to print
 */
function printWorkerResult(result: FormatWorkerResult): void {
  const workerInfo = pc.gray(`[Worker #${result.workerId}]`);
  const durationInfo = pc.gray(`[${result.durationMs}ms]`);
  console.log("─".repeat(45));
  console.log();
  console.log(pc.bold(`📁 Target: ${result.target}`) + ` ${workerInfo} ${durationInfo}`);
  console.log();
  console.log(result.resultText);
}

/**
 * Runs formatting on all targets in parallel using Piscina workers.
 * @returns Exit code (0 for success, non-zero for failure)
 */
async function runOnAllTargets(): Promise<number> {
  console.log(pc.bold(pc.magenta("\n🧵 Running format workers in parallel...")));

  const piscina = new Piscina({
    filename: fileURLToPath(new URL("./workers/format.worker.ts", import.meta.url)),
    execArgv: ["--experimental-strip-types", "--no-warnings"],
  });

  console.log(pc.gray(`   Main process PID: ${process.pid}`));
  console.log(pc.gray(`   Worker pool: min=${piscina.options.minThreads}, max=${piscina.options.maxThreads}\n`));

  try {
    // Dispatch all workers in parallel
    const workerPromises = allTargets.map((target) => {
      const input: FormatWorkerInput = {target};
      return piscina.run(input) as Promise<FormatWorkerResult>;
    });

    // Wait for all workers to complete
    const results = await Promise.all(workerPromises);

    // Print results in order
    for (const result of results) {
      printWorkerResult(result);
    }

    // Calculate summary
    const alreadyFormatted = results.filter((r) => r.checkPassed).length;
    const formatted = results.filter((r) => r.formatted).length;
    const failed = results.filter((r) => r.exitCode !== 0).length;

    console.log("─".repeat(45));
    console.log();
    console.log(pc.bold("📊 Summary:"));
    if (alreadyFormatted > 0) {
      console.log(pc.green(`   ✓ ${alreadyFormatted} target(s) already formatted`));
    }
    if (formatted > 0) {
      console.log(pc.yellow(`   ✎ ${formatted} target(s) were formatted`));
    }
    if (failed > 0) {
      console.log(pc.red(`   ✗ ${failed} target(s) failed`));
    }
    console.log();

    return failed > 0 ? 1 : 0;
  } finally {
    await piscina.destroy();
  }
}

/**
 * Runs formatting on a single target using a Piscina worker.
 * @param target The specific target to format
 * @returns Exit code (0 for success, non-zero for failure)
 */
async function runOnSingleTarget(target: FormatTarget): Promise<number> {
  console.log(pc.bold(pc.magenta(`\n🎨 Formatting: ${target}\n`)));

  const piscina = new Piscina({
    filename: fileURLToPath(new URL("./workers/format.worker.ts", import.meta.url)),
    execArgv: ["--experimental-strip-types", "--no-warnings"],
  });

  try {
    const input: FormatWorkerInput = {target};
    const result = (await piscina.run(input)) as FormatWorkerResult;

    printWorkerResult(result);

    return result.exitCode;
  } finally {
    await piscina.destroy();
  }
}

export async function main(arg?: string): Promise<number> {
  console.log(pc.bold(pc.magenta("\n╔════════════════════════════════════════╗")));
  console.log(pc.bold(pc.magenta("║   arolariu.ro Code Formatter Tool      ║")));
  console.log(pc.bold(pc.magenta("╚════════════════════════════════════════╝\n")));

  if (!arg) {
    console.error(pc.red("✗ Missing target argument"));
    console.log(pc.gray("\n💡 Usage: format <all|packages|website|cv|api>"));
    console.log(pc.gray("   - all:      Format all targets (Prettier + dotnet)"));
    console.log(pc.gray("   - packages: Format component packages"));
    console.log(pc.gray("   - website:  Format main website"));
    console.log(pc.gray("   - cv:       Format CV site"));
    console.log(pc.gray("   - api:      Format backend API (.NET)\n"));
    return 1;
  }

  try {
    let exitCode = 0;

    switch (arg) {
      case "all":
        exitCode = await runOnAllTargets();
        break;
      case "packages":
      case "website":
      case "cv":
      case "api":
        exitCode = await runOnSingleTarget(arg);
        break;
      default:
        console.error(pc.red(`✗ Invalid target: "${arg}"`));
        console.log(pc.gray("\n💡 Valid targets: all, packages, website, cv, api\n"));
        return 1;
    }

    if (exitCode === 0) {
      console.log(pc.bold(pc.green("✅ Formatting completed successfully!\n")));
    } else {
      console.log(pc.bold(pc.yellow("⚠️  Formatting completed with some issues\n")));
    }

    return exitCode;
  } catch (error) {
    console.error(pc.bold(pc.red("\n❌ Formatting failed with errors\n")));

    if (error instanceof Error) {
      console.error(pc.red(`Error: ${error.message}`));
      if (error.stack) {
        console.error(pc.gray(`\nStack trace:\n${error.stack}`));
      }
    } else {
      console.error(pc.red(String(error)));
    }

    console.log(); // Add spacing
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
