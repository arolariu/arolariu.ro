/**
 * @fileoverview Format worker thread for Piscina parallel execution.
 * @module scripts/workers/format.worker
 *
 * @remarks
 * This worker is executed in a separate thread by Piscina to run code formatting
 * operations (Prettier for JS/TS/Svelte, dotnet format for C#) in parallel.
 * Each worker handles a single target and buffers all output for ordered
 * printing in the main thread.
 *
 * **Design Decisions:**
 * - Worker receives target name and resolves formatter internally
 * - Output is buffered and returned as `resultText` for consistent ordering
 * - Errors are caught and returned in the result, not thrown
 * - Supports both Prettier (packages/website/cv) and dotnet format (api)
 *
 * @see {@link FormatWorkerInput} - Input type for this worker
 * @see {@link FormatWorkerResult} - Output type for this worker
 */

import {spawn} from "node:child_process";
import {threadId} from "node:worker_threads";
import {resolveConfigFile} from "prettier";
import type {FormatTarget, FormatWorkerInput, FormatWorkerResult} from "../types/format.ts";

/** Cache directory for build artifacts */
const CACHE_DIR = "artifacts";

// Directory mappings for Prettier targets
const directoryMap: Record<Exclude<FormatTarget, "api">, string> = {
  packages: "packages/components/**",
  website: "sites/arolariu.ro/**",
  cv: "sites/cv.arolariu.ro/**",
};

/**
 * Runs a command and captures output.
 * @param command The command to run
 * @param args Command arguments
 * @returns Promise with exit code and output
 */
async function runCommand(command: string, args: string[]): Promise<{code: number; output: string}> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "pipe",
      windowsHide: true,
    });

    let output = "";
    let errorOutput = "";

    child.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      resolve({code: code ?? 1, output: output + errorOutput});
    });

    child.on("error", (error) => {
      resolve({code: 1, output: error.message});
    });
  });
}

/**
 * Checks if code is properly formatted for a target.
 * @param target The target to check
 * @returns Promise with exit code and output
 */
async function checkTarget(target: FormatTarget): Promise<{code: number; output: string}> {
  if (target === "api") {
    return runCommand("dotnet", ["format", "arolariu.slnx", "--verify-no-changes", "--verbosity", "quiet"]);
  }

  // Prettier targets
  const directoryToCheck = directoryMap[target];
  const configFilePath = await resolveConfigFile();

  if (configFilePath === null) {
    return {code: 1, output: "Could not resolve prettier configuration file!"};
  }

  return runCommand("node", [
    "node_modules/prettier/bin/prettier.cjs",
    "--check",
    directoryToCheck,
    "--cache",
    "--cache-location",
    `${CACHE_DIR}/.prettiercache-${target}`,
    "--config",
    configFilePath,
    "--config-precedence",
    "prefer-file",
    "--check-ignore-pragma",
  ]);
}

/**
 * Formats code for a target.
 * @param target The target to format
 * @returns Promise with exit code and output
 */
async function formatTarget(target: FormatTarget): Promise<{code: number; output: string}> {
  if (target === "api") {
    return runCommand("dotnet", ["format", "arolariu.slnx", "--verbosity", "quiet"]);
  }

  // Prettier targets
  const directoryToCheck = directoryMap[target];
  const configFilePath = await resolveConfigFile();

  if (configFilePath === null) {
    return {code: 1, output: "Could not resolve prettier configuration file!"};
  }

  return runCommand("node", [
    "node_modules/prettier/bin/prettier.cjs",
    "--write",
    directoryToCheck,
    "--cache",
    "--cache-location",
    `${CACHE_DIR}/.prettiercache-${target}`,
    "--config",
    configFilePath,
    "--config-precedence",
    "prefer-file",
    "--check-ignore-pragma",
  ]);
}

/**
 * Format worker entry point for Piscina.
 *
 * @remarks
 * This is the default export that Piscina calls with the worker input.
 * It checks if formatting is needed, then formats if necessary.
 * All output is buffered and returned for ordered printing.
 *
 * @param input - The worker input containing the target to format
 * @returns The worker result with buffered output
 */
export default async function formatWorker(input: FormatWorkerInput): Promise<FormatWorkerResult> {
  const {target} = input;
  const startTime = performance.now();
  const workerId = threadId; // Use threadId for unique worker identification
  let resultText = "";

  try {
    // Phase 1: Check if formatting is needed
    resultText += `🔍 Checking ${target}...\n`;
    const checkResult = await checkTarget(target);

    if (checkResult.code === 0) {
      // Already properly formatted
      resultText += `  ✓ ${target} is already properly formatted\n`;
      return {
        target,
        checkPassed: true,
        formatted: false,
        exitCode: 0,
        resultText,
        workerId,
        durationMs: Math.round(performance.now() - startTime),
      };
    }

    // Phase 2: Format needed
    resultText += `  ⚠ ${target} needs formatting\n`;
    resultText += `🔧 Formatting ${target}...\n`;

    const formatResult = await formatTarget(target);

    if (formatResult.code === 0) {
      resultText += `  ✓ ${target} formatted successfully\n`;
      return {
        target,
        checkPassed: false,
        formatted: true,
        exitCode: 0,
        resultText,
        workerId,
        durationMs: Math.round(performance.now() - startTime),
      };
    } else {
      resultText += `  ✗ ${target} formatting failed\n`;
      if (formatResult.output.trim()) {
        resultText += `\n${formatResult.output.trim()}\n`;
      }
      return {
        target,
        checkPassed: false,
        formatted: false,
        exitCode: formatResult.code,
        resultText,
        workerId,
        durationMs: Math.round(performance.now() - startTime),
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    resultText += `  ✗ Error: ${errorMessage}\n`;
    return {
      target,
      checkPassed: false,
      formatted: false,
      exitCode: 1,
      resultText,
      error: errorMessage,
      workerId,
      durationMs: Math.round(performance.now() - startTime),
    };
  }
}
