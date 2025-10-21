/**
 * @fileoverview Environment variable helper utilities for GitHub Actions
 * @module lib/env-helper
 */

import type {ScriptParams} from "../types/index.ts";

/**
 * Safely retrieves an environment variable with optional default value
 * @param key - Environment variable name
 * @param defaultValue - Optional default value if variable is not set
 * @returns Environment variable value or default value
 * @example
 * ```typescript
 * const apiUrl = getEnvVar('API_URL', 'http://localhost:3000');
 * const nodeEnv = getEnvVar('NODE_ENV'); // Returns undefined if not set
 * ```
 */
export function getEnvVar(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];

  if (!value || value === "null" || value === "" || value === "undefined") {
    return defaultValue;
  }

  return value;
}

/**
 * Retrieves a required environment variable, failing the workflow if not set
 * @param core - GitHub Actions core utilities for error handling
 * @param key - Environment variable name (must be set)
 * @returns Environment variable value
 * @throws Sets workflow failure via core.setFailed if variable is missing
 * @example
 * ```typescript
 * const commitSha = getRequiredEnvVar(core, 'GITHUB_SHA');
 * // Workflow fails if GITHUB_SHA is not set
 * ```
 */
export function getRequiredEnvVar(core: ScriptParams["core"], key: string): string {
  const value = getEnvVar(key);

  if (!value) {
    core.setFailed(`Required environment variable '${key}' is not set or is empty`);
    throw new Error(`Required environment variable '${key}' is not set or is empty`);
  }

  return value;
}

/**
 * Retrieves multiple required environment variables at once
 * @param core - GitHub Actions core utilities for error handling
 * @param keys - Array of environment variable names that must be set
 * @returns Record mapping variable names to their values
 * @throws Sets workflow failure via core.setFailed if any variable is missing
 * @example
 * ```typescript
 * const vars = getRequiredEnvVars(core, ['COMMIT_SHA', 'RUN_ID', 'BRANCH_NAME']);
 * console.log(vars.COMMIT_SHA, vars.RUN_ID, vars.BRANCH_NAME);
 * ```
 */
export function getRequiredEnvVars(core: ScriptParams["core"], keys: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const missingVars: string[] = [];

  for (const key of keys) {
    const value = getEnvVar(key);
    if (!value) {
      missingVars.push(key);
    } else {
      result[key] = value;
    }
  }

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(", ")}`;
    core.setFailed(errorMessage);
    throw new Error(errorMessage);
  }

  core.debug(`Successfully extracted ${keys.length} required environment variables`);
  return result;
}

/**
 * Checks if an environment variable is set (regardless of value)
 * @param key - Environment variable name
 * @returns True if variable exists and is not empty/null/undefined string
 * @example
 * ```typescript
 * if (hasEnvVar('DEBUG_MODE')) {
 *   console.log('Debug mode is enabled');
 * }
 * ```
 */
export function hasEnvVar(key: string): boolean {
  const value = process.env[key];
  return !(!value || value === "null" || value === "" || value === "undefined");
}

/**
 * Extracts common GitHub Actions environment variables
 * @param core - GitHub Actions core utilities for logging
 * @returns Object containing common GitHub Actions variables
 * @example
 * ```typescript
 * const { sha, ref, actor, eventName } = getGitHubEnvVars(core);
 * console.log(`Triggered by ${actor} on ${eventName}`);
 * ```
 */
export function getGitHubEnvVars(core: ScriptParams["core"]): {
  sha: string;
  ref: string;
  actor: string;
  eventName: string;
  repository: string;
  runId: string;
  runNumber: string;
  workflow: string;
} {
  core.debug("Extracting GitHub Actions environment variables");

  return {
    sha: getEnvVar("GITHUB_SHA", "unknown") ?? "unknown",
    ref: getEnvVar("GITHUB_REF", "unknown") ?? "unknown",
    actor: getEnvVar("GITHUB_ACTOR", "unknown") ?? "unknown",
    eventName: getEnvVar("GITHUB_EVENT_NAME", "unknown") ?? "unknown",
    repository: getEnvVar("GITHUB_REPOSITORY", "unknown") ?? "unknown",
    runId: getEnvVar("GITHUB_RUN_ID", "unknown") ?? "unknown",
    runNumber: getEnvVar("GITHUB_RUN_NUMBER", "unknown") ?? "unknown",
    workflow: getEnvVar("GITHUB_WORKFLOW", "unknown") ?? "unknown",
  };
}

/**
 * Parses a boolean environment variable
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set (defaults to false)
 * @returns Boolean value parsed from environment variable
 * @example
 * ```typescript
 * const isProduction = getEnvVarAsBoolean('IS_PRODUCTION', false);
 * const debugMode = getEnvVarAsBoolean('DEBUG'); // Defaults to false
 * ```
 */
export function getEnvVarAsBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = getEnvVar(key);

  if (!value) {
    return defaultValue;
  }

  const normalized = value.toLowerCase().trim();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Parses an integer environment variable
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set or invalid
 * @returns Integer value parsed from environment variable
 * @example
 * ```typescript
 * const timeout = getEnvVarAsInt('TIMEOUT_SECONDS', 30);
 * const maxRetries = getEnvVarAsInt('MAX_RETRIES', 3);
 * ```
 */
export function getEnvVarAsInt(key: string, defaultValue: number): number {
  const value = getEnvVar(key);

  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}
