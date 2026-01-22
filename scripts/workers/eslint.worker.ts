/**
 * @fileoverview ESLint worker thread for parallel linting execution.
 * @module scripts/workers/eslint.worker
 *
 * @remarks
 * This worker is spawned by Piscina to run ESLint analysis in a separate thread.
 * Each worker re-imports the eslint.config.ts to get the full config by name,
 * uses a per-config cache file to prevent race conditions, and returns
 * serializable results to the main thread.
 */

import {ESLint} from "eslint";
import {threadId} from "node:worker_threads";
import type {ESLintFileStats, ESLintWorkerInput, ESLintWorkerResult} from "../types/lint.ts";

/** Number of slowest files to track */
const TOP_SLOWEST_FILES = 5;

/**
 * Sanitizes a config name for use as a cache filename.
 * Strips brackets and replaces special characters with hyphens.
 *
 * @param configName - The ESLint config name (e.g., "[@arolariu/packages]")
 * @returns Sanitized name safe for filesystem (e.g., "arolariu-packages")
 *
 * @example
 * ```typescript
 * sanitizeConfigName("[@arolariu/packages]") // "arolariu-packages"
 * sanitizeConfigName("[@arolariu/website]")  // "arolariu-website"
 * ```
 */
function sanitizeConfigName(configName: string): string {
  return configName
    .replace(/^\[@/, "") // Remove leading "[@"
    .replace(/\]$/, "") // Remove trailing "]"
    .replaceAll("/", "-") // Replace "/" with "-"
    .replaceAll(/[^a-zA-Z0-9-]/g, ""); // Remove any other special chars
}

/** Cache directory for build artifacts */
const CACHE_DIR = "artifacts";

/**
 * ESLint worker function executed in a separate thread.
 * Loads the config by name, runs ESLint with per-config caching, and returns results.
 *
 * @param input - Worker input containing the config name to lint
 * @returns Promise resolving to ESLint results with buffered output
 */
export default async function eslintWorker(input: ESLintWorkerInput): Promise<ESLintWorkerResult> {
  const {configName, filePatterns: inputPatterns} = input;
  const startTime = performance.now();
  const workerId = threadId; // Use threadId for unique worker identification

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

  // Create default error result helper
  const createErrorResult = (error: string): ESLintWorkerResult => ({
    configName,
    errorCount: 1,
    warningCount: 0,
    resultText: "",
    error,
    workerId,
    durationMs: Math.round(performance.now() - startTime),
    workTimeMs: 0,
    initTimeMs,
    fileCount: 0,
    peakMemoryBytes,
    slowestFiles: [],
  });

  try {
    // ===== INITIALIZATION PHASE =====
    const initStartTime = performance.now();

    // Dynamically import the eslint config in this worker thread
    const {default: eslintConfig} = await import("../../eslint.config.ts");
    trackMemory();

    // Find the config by name
    const config = eslintConfig.find((cfg: {name?: string}) => cfg.name === configName);

    if (!config) {
      initTimeMs = Math.round(performance.now() - initStartTime);
      return createErrorResult(`Config not found: ${configName}`);
    }

    // Create per-config cache filename to prevent race conditions
    const sanitizedName = sanitizeConfigName(configName);
    const cacheLocation = `${CACHE_DIR}/.eslintcache-${sanitizedName}`;

    // Create ESLint instance with the config
    const eslint = new ESLint({
      baseConfig: config,
      cache: true,
      cacheLocation,
      cacheStrategy: "content",
      errorOnUnmatchedPattern: false, // Changed to false to support selective targeting gracefully
      stats: true,
    });

    // Use input patterns if provided (selective targeting), otherwise use config patterns
    let filePatterns: string[];
    if (inputPatterns && inputPatterns.length > 0) {
      filePatterns = [...inputPatterns];
    } else {
      const rawPatterns = Array.isArray(config.files) ? config.files : [config.files];
      filePatterns = rawPatterns.filter((p: unknown): p is string => typeof p === "string");
    }

    trackMemory();

    // Mark end of initialization phase
    initTimeMs = Math.round(performance.now() - initStartTime);

    // ===== WORK PHASE =====
    const workStartTime = performance.now();

    // Run ESLint analysis
    const results = await eslint.lintFiles(filePatterns);
    trackMemory();

    // Extract per-file timing from stats (if available)
    const fileStats: ESLintFileStats[] = [];
    for (const result of results) {
      // ESLint stats include timing info per file
      const stats = result.stats as {fixPasses?: number; times?: {passes: Array<{total: number}>}} | undefined;
      const lintTimeMs = stats?.times?.passes?.[0]?.total ?? 0;
      fileStats.push({
        filePath: result.filePath,
        lintTimeMs,
      });
    }

    // Sort by lint time descending and take top N slowest
    const slowestFiles = fileStats.sort((a, b) => b.lintTimeMs - a.lintTimeMs).slice(0, TOP_SLOWEST_FILES);

    // Load formatter and format results
    const formatter = await eslint.loadFormatter("stylish");
    const resultText = await formatter.format(results);
    trackMemory();

    // Mark end of work phase
    workTimeMs = Math.round(performance.now() - workStartTime);

    // Aggregate counts
    const errorCount = results.reduce((sum, res) => sum + res.errorCount, 0);
    const warningCount = results.reduce((sum, res) => sum + res.warningCount, 0);

    return {
      configName,
      errorCount,
      warningCount,
      resultText: resultText || "",
      workerId,
      durationMs: Math.round(performance.now() - startTime),
      workTimeMs,
      initTimeMs,
      fileCount: results.length,
      peakMemoryBytes,
      slowestFiles,
    };
  } catch (error) {
    trackMemory();
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorResult(errorMessage);
  }
}
