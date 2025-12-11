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
import type {ESLintWorkerInput, ESLintWorkerResult} from "../types/lint.ts";

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
  const {configName} = input;
  const startTime = performance.now();
  const workerId = threadId; // Use threadId for unique worker identification

  try {
    // Dynamically import the eslint config in this worker thread
    const {default: eslintConfig} = await import("../../eslint.config.ts");

    // Find the config by name
    const config = eslintConfig.find((cfg: {name?: string}) => cfg.name === configName);

    if (!config) {
      return {
        configName,
        errorCount: 1,
        warningCount: 0,
        resultText: "",
        error: `Config not found: ${configName}`,
        workerId,
        durationMs: Math.round(performance.now() - startTime),
      };
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
      errorOnUnmatchedPattern: true,
      stats: true,
    });

    // Extract file patterns from config
    const rawPatterns = Array.isArray(config.files) ? config.files : [config.files];
    const filePatterns = rawPatterns.filter((p: unknown): p is string => typeof p === "string");

    // Run ESLint analysis
    const results = await eslint.lintFiles(filePatterns);

    // Load formatter and format results
    const formatter = await eslint.loadFormatter("stylish");
    const resultText = await formatter.format(results);

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
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      configName,
      errorCount: 1,
      warningCount: 0,
      resultText: "",
      error: errorMessage,
      workerId,
      durationMs: Math.round(performance.now() - startTime),
    };
  }
}
