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
 * @param customPatterns Optional custom file patterns for selective targeting
 * @returns Promise with exit code and output
 */
async function checkTarget(
  target: FormatTarget,
  customPatterns?: readonly string[],
): Promise<{code: number; output: string}> {
  if (target === "api") {
    // For .NET, custom patterns are not supported via dotnet format CLI easily
    return runCommand("dotnet", ["format", "arolariu.slnx", "--verify-no-changes", "--verbosity", "quiet"]);
  }

  // Prettier targets - use custom patterns if provided
  const patterns = customPatterns && customPatterns.length > 0 ? customPatterns : [directoryMap[target]];
  const configFilePath = await resolveConfigFile();

  if (configFilePath === null) {
    return {code: 1, output: "Could not resolve prettier configuration file!"};
  }

  return runCommand("node", [
    "node_modules/prettier/bin/prettier.cjs",
    "--check",
    ...patterns,
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
 * @param customPatterns Optional custom file patterns for selective targeting
 * @returns Promise with exit code and output
 */
async function formatTarget(
  target: FormatTarget,
  customPatterns?: readonly string[],
): Promise<{code: number; output: string}> {
  if (target === "api") {
    // For .NET, custom patterns are not supported via dotnet format CLI easily
    return runCommand("dotnet", ["format", "arolariu.slnx", "--verbosity", "quiet"]);
  }

  // Prettier targets - use custom patterns if provided
  const patterns = customPatterns && customPatterns.length > 0 ? customPatterns : [directoryMap[target]];
  const configFilePath = await resolveConfigFile();

  if (configFilePath === null) {
    return {code: 1, output: "Could not resolve prettier configuration file!"};
  }

  return runCommand("node", [
    "node_modules/prettier/bin/prettier.cjs",
    "--write",
    ...patterns,
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
 * Extracts file count from Prettier output.
 * Prettier outputs lines like "Checking 123 files..." or lists individual files.
 * @param output The command output
 * @returns Estimated file count
 */
function extractFileCount(output: string): number {
  // Try to match "Checking X files" pattern
  const checkingMatch = output.match(/Checking (\d+) files?/i);
  if (checkingMatch) {
    return parseInt(checkingMatch[1]!, 10);
  }

  // Count individual file paths in output (lines containing file extensions)
  const lines = output.split("\n");
  const fileLines = lines.filter((line) => /\.(ts|tsx|js|jsx|json|css|scss|md|svelte)$/i.test(line.trim()));
  return fileLines.length;
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
  const {target, filePatterns} = input;
  const startTime = performance.now();
  const workerId = threadId; // Use threadId for unique worker identification
  let resultText = "";
  let fileCount = 0;

  // Track peak memory usage
  let peakMemoryBytes = process.memoryUsage().heapUsed;
  const trackMemory = (): void => {
    const current = process.memoryUsage().heapUsed;
    if (current > peakMemoryBytes) {
      peakMemoryBytes = current;
    }
  };

  // Timing tracking
  let initTimeMs = 0;
  let workTimeMs = 0;

  // Create error result helper
  const createErrorResult = (error: string): FormatWorkerResult => ({
    target,
    checkPassed: false,
    formatted: false,
    exitCode: 1,
    resultText: resultText + `  ✗ Error: ${error}\n`,
    error,
    workerId,
    durationMs: Math.round(performance.now() - startTime),
    workTimeMs: 0,
    initTimeMs,
    fileCount: 0,
    peakMemoryBytes,
  });

  try {
    // ===== INITIALIZATION PHASE =====
    const initStartTime = performance.now();

    // For Prettier targets, resolve config file (this is the main init cost)
    // For API (.NET), initialization is minimal
    if (target !== "api") {
      await resolveConfigFile(); // Pre-warm the config resolution
    }
    trackMemory();

    // Mark end of initialization phase
    initTimeMs = Math.round(performance.now() - initStartTime);

    // ===== WORK PHASE =====
    const workStartTime = performance.now();

    // Phase 1: Check if formatting is needed
    resultText += `🔍 Checking ${target}...\n`;
    const checkResult = await checkTarget(target, filePatterns);
    trackMemory();

    // Extract file count from output
    fileCount = extractFileCount(checkResult.output);

    if (checkResult.code === 0) {
      // Already properly formatted
      workTimeMs = Math.round(performance.now() - workStartTime);
      resultText += `  ✓ ${target} is already properly formatted\n`;
      return {
        target,
        checkPassed: true,
        formatted: false,
        exitCode: 0,
        resultText,
        workerId,
        durationMs: Math.round(performance.now() - startTime),
        workTimeMs,
        initTimeMs,
        fileCount,
        peakMemoryBytes,
      };
    }

    // Phase 2: Format needed
    resultText += `  ⚠ ${target} needs formatting\n`;
    resultText += `🔧 Formatting ${target}...\n`;

    const formatResult = await formatTarget(target, filePatterns);
    trackMemory();

    // Update file count if we got better info from format output
    const formatFileCount = extractFileCount(formatResult.output);
    if (formatFileCount > fileCount) {
      fileCount = formatFileCount;
    }

    // Mark end of work phase
    workTimeMs = Math.round(performance.now() - workStartTime);

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
        workTimeMs,
        initTimeMs,
        fileCount,
        peakMemoryBytes,
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
        workTimeMs,
        initTimeMs,
        fileCount,
        peakMemoryBytes,
      };
    }
  } catch (error) {
    trackMemory();
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResult(errorMessage);
  }
}
