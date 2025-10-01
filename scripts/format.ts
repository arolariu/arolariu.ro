import pc from "picocolors";
import {resolveConfigFile} from "prettier";
import {runWithSpinner} from "./common/index.ts";

type FormatTarget = "all" | "packages" | "website" | "cv" | "api";

const directoryMap: Record<Exclude<FormatTarget, "all">, string> = {
  packages: "packages/components/**",
  website: "sites/arolariu.ro/**",
  cv: "sites/cv.arolariu.ro/**",
  api: "sites/api.arolariu.ro/**",
};

/**
 * Checks code for a specific target using the appropriate checker.
 * @param target The target to check (e.g., "packages", "website", "cv", "api").
 * @param hideOutput Whether to hide output (true for parallel execution)
 * @returns Promise with exit code and output
 * @throws Error if configuration cannot be resolved
 */
async function checkTarget(target: Exclude<FormatTarget, "all">, hideOutput: boolean = true): Promise<{code: number; output: string}> {
  if (target === "api") {
    return await runWithSpinner(
      "dotnet",
      ["format", "arolariu.slnx", "--verify-no-changes", "--verbosity", hideOutput ? "quiet" : "detailed"],
      `${pc.cyan("🔍")} Checking ${pc.bold(".NET API")}`,
      hideOutput,
    );
  }

  // Prettier targets
  const directoryToCheck = directoryMap[target];
  if (!directoryToCheck) {
    throw new Error(`No directory mapping found for target: ${target}`);
  }

  const configFilePath = await resolveConfigFile();
  if (configFilePath === null) {
    throw new Error("Could not resolve prettier configuration file!");
  }

  return await runWithSpinner(
    "node",
    [
      "node_modules/prettier/bin/prettier.cjs",
      "--check",
      directoryToCheck,
      "--cache",
      "--config",
      configFilePath,
      "--config-precedence",
      "prefer-file",
      "--check-ignore-pragma",
    ],
    `${pc.cyan("🔍")} Checking ${pc.bold(target)}`,
    hideOutput,
  );
}

/**
 * Formats code for a specific target using the appropriate formatter.
 * @param target The target to format (e.g., "packages", "website", "cv", "api").
 * @param hideOutput Whether to hide output (true for parallel execution)
 * @returns Promise with exit code and output
 * @throws Error if configuration cannot be resolved
 */
async function formatTarget(target: Exclude<FormatTarget, "all">, hideOutput: boolean = true): Promise<{code: number; output: string}> {
  if (target === "api") {
    return await runWithSpinner(
      "dotnet",
      ["format", "arolariu.slnx", "--verbosity", hideOutput ? "quiet" : "detailed"],
      `${pc.cyan("🔧")} Formatting ${pc.bold(".NET API")}`,
      hideOutput,
    );
  }

  // Prettier targets
  const directoryToCheck = directoryMap[target];
  if (!directoryToCheck) {
    throw new Error(`No directory mapping found for target: ${target}`);
  }

  const configFilePath = await resolveConfigFile();
  if (configFilePath === null) {
    throw new Error("Could not resolve prettier configuration file!");
  }

  return await runWithSpinner(
    "node",
    [
      "node_modules/prettier/bin/prettier.cjs",
      "--write",
      directoryToCheck,
      "--cache",
      "--config",
      configFilePath,
      "--config-precedence",
      "prefer-file",
      "--check-ignore-pragma",
    ],
    `${pc.cyan("✨")} Formatting ${pc.bold(target)}`,
    hideOutput,
  );
}

/**
 * Checks and formats code for a specific target.
 * First checks the code, then formats only if needed.
 * @param target The target to check and format
 * @param hideOutput Whether to hide output (true for parallel execution)
 * @returns Exit code (0 for success, non-zero for failure)
 */
async function checkAndFormatTarget(target: Exclude<FormatTarget, "all">, hideOutput: boolean = true): Promise<number> {
  const checkResult = await checkTarget(target, hideOutput);

  // If check passed, we're done
  if (checkResult.code === 0) return 0;

  // Otherwise, format the code
  const formatResult = await formatTarget(target, hideOutput);
  return formatResult.code;
}

/**
 * Formats all targets in parallel - checks first, then formats if needed.
 * @returns Exit code (0 for success, non-zero for failure)
 * @throws Error if configuration cannot be resolved or targets are invalid
 */
async function runOnAllTargets(): Promise<number> {
  console.log(pc.bold(pc.magenta("\n🧵 Phase 1: Checking all targets in parallel...\n")));

  const allTargets: Exclude<FormatTarget, "all">[] = ["packages", "website", "cv", "api"];

  // Phase 1: Run ALL checks in parallel using the wrapper
  const checkPromises = allTargets.map((target) => checkTarget(target, true).then((result) => ({target, result})));

  const checkResults = await Promise.allSettled(checkPromises).then((results) =>
    results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        const target = allTargets[index];
        console.error(pc.red(`\n✗ Check failed for target ${target}: ${result.reason}`));
        // Return a dummy result with error code
        return {
          target,
          result: {code: 1, output: result.reason?.toString() || "Unknown error"},
        };
      }
    }),
  );

  console.log(); // Add spacing after checks

  // Phase 2: Format only the targets that failed checks
  const targetsToFormat = checkResults.filter((r) => r.result.code !== 0);

  if (targetsToFormat.length === 0) {
    console.log(pc.green("✓ All targets already properly formatted!\n"));
    return 0;
  }

  console.log(pc.bold(pc.magenta(`\n🧵 Phase 2: Formatting ${targetsToFormat.length} target(s) in parallel...\n`)));

  // Phase 2: Format only failed targets using the wrapper
  const formatPromises = targetsToFormat.map(({target}) => {
    if (!target) {
      throw new Error("Invalid target in format phase");
    }
    return formatTarget(target, true);
  });

  const formatResults = await Promise.allSettled(formatPromises).then((results) =>
    results.map((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        console.error(pc.red(`\n✗ Format operation failed: ${result.reason}`));
        return {code: 1, output: result.reason?.toString() || "Unknown error"};
      }
    }),
  );

  console.log(); // Add spacing after formatting

  // Check if any formatting failed
  const failedCount = formatResults.filter((r) => r.code !== 0).length;
  if (failedCount > 0) {
    console.log(pc.yellow(`\n⚠ ${failedCount} target(s) had formatting issues`));
    return 1;
  }

  return 0;
}

/**
 * Formats a single target with full output visibility.
 * @param target The specific target to format (not "all")
 * @returns Exit code (0 for success, non-zero for failure)
 */
async function runOnSingleTarget(target: Exclude<FormatTarget, "all">): Promise<number> {
  console.log(pc.bold(pc.magenta(`\n🎨 Formatting: ${target}\n`)));

  // For single targets, show full output using the wrapper (hideOutput = false)
  return await checkAndFormatTarget(target, false);
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
