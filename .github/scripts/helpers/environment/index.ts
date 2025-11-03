/**
 * @fileoverview Environment variable management utilities for GitHub Actions
 * @module helpers/environment
 * 
 * Provides a clean, type-safe API for working with environment variables in GitHub Actions workflows.
 * Follows Single Responsibility Principle by focusing solely on environment access and validation.
 */

import * as core from "@actions/core";

/**
 * Configuration for environment variable retrieval
 */
export interface EnvConfig {
  /** Variable name to retrieve */
  key: string;
  /** Default value if variable is not set */
  defaultValue?: string;
  /** Whether the variable is required (throws if missing) */
  required?: boolean;
  /** Custom validation function */
  validator?: (value: string) => boolean;
}

/**
 * GitHub Actions environment context
 * Contains standard environment variables provided by GitHub Actions
 */
export interface GitHubEnvContext {
  /** Full commit SHA */
  sha: string;
  /** Git reference (e.g., refs/heads/main) */
  ref: string;
  /** Actor who triggered the workflow */
  actor: string;
  /** Event name that triggered the workflow */
  eventName: string;
  /** Repository in owner/name format */
  repository: string;
  /** Unique run ID */
  runId: string;
  /** Run number (incremental) */
  runNumber: string;
  /** Workflow name */
  workflow: string;
  /** Job name */
  job: string;
  /** Action name */
  action: string;
}

/**
 * Environment variable access interface
 * Provides methods for retrieving and validating environment variables
 */
export interface IEnvironmentHelper {
  /**
   * Gets an environment variable value
   * @param key - Variable name
   * @param defaultValue - Optional default value
   * @returns Variable value or default, undefined if not set
   */
  get(key: string, defaultValue?: string): string | undefined;

  /**
   * Gets a required environment variable, fails workflow if missing
   * @param key - Variable name
   * @returns Variable value
   * @throws Sets workflow failure via core.setFailed if missing
   */
  getRequired(key: string): string;

  /**
   * Gets multiple required environment variables
   * @param keys - Array of variable names
   * @returns Record mapping variable names to values
   * @throws Sets workflow failure if any variable is missing
   */
  getRequiredBatch(keys: string[]): Record<string, string>;

  /**
   * Checks if an environment variable exists and has a value
   * @param key - Variable name
   * @returns True if variable exists and is not empty
   */
  has(key: string): boolean;

  /**
   * Parses an environment variable as boolean
   * @param key - Variable name
   * @param defaultValue - Default value if not set
   * @returns Boolean value
   */
  getBoolean(key: string, defaultValue?: boolean): boolean;

  /**
   * Parses an environment variable as integer
   * @param key - Variable name
   * @param defaultValue - Default value if not set or invalid
   * @returns Integer value
   */
  getInt(key: string, defaultValue: number): number;

  /**
   * Gets GitHub Actions environment context
   * @returns Object containing GitHub Actions environment variables
   */
  getGitHubContext(): GitHubEnvContext;

  /**
   * Gets an environment variable with custom validation
   * @param config - Configuration object
   * @returns Variable value if validation passes
   * @throws If required and missing, or validation fails
   */
  getWithValidation(config: EnvConfig): string | undefined;
}

/**
 * Implementation of environment variable helper
 * Provides clean, type-safe access to environment variables
 */
export class EnvironmentHelper implements IEnvironmentHelper {
  /**
   * Checks if a value is considered empty/null
   * @param value - Value to check
   * @returns True if value is empty, null, undefined, or the string representations
   */
  private isEmptyValue(value: string | undefined): boolean {
    return !value || value === "null" || value === "" || value === "undefined";
  }

  /**
   * {@inheritDoc IEnvironmentHelper.get}
   */
  get(key: string, defaultValue?: string): string | undefined {
    const value = process.env[key];

    if (this.isEmptyValue(value)) {
      return defaultValue;
    }

    return value;
  }

  /**
   * {@inheritDoc IEnvironmentHelper.getRequired}
   */
  getRequired(key: string): string {
    const value = this.get(key);

    if (!value) {
      const errorMessage = `Required environment variable '${key}' is not set or is empty`;
      core.setFailed(errorMessage);
      throw new Error(errorMessage);
    }

    return value;
  }

  /**
   * {@inheritDoc IEnvironmentHelper.getRequiredBatch}
   */
  getRequiredBatch(keys: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    const missingVars: string[] = [];

    for (const key of keys) {
      const value = this.get(key);
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

    core.debug(`Successfully retrieved ${keys.length} required environment variables`);
    return result;
  }

  /**
   * {@inheritDoc IEnvironmentHelper.has}
   */
  has(key: string): boolean {
    const value = process.env[key];
    return !this.isEmptyValue(value);
  }

  /**
   * {@inheritDoc IEnvironmentHelper.getBoolean}
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.get(key);

    if (!value) {
      return defaultValue;
    }

    const normalized = value.toLowerCase().trim();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  /**
   * {@inheritDoc IEnvironmentHelper.getInt}
   */
  getInt(key: string, defaultValue: number): number {
    const value = this.get(key);

    if (!value) {
      return defaultValue;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * {@inheritDoc IEnvironmentHelper.getGitHubContext}
   */
  getGitHubContext(): GitHubEnvContext {
    core.debug("Extracting GitHub Actions environment context");

    return {
      sha: this.get("GITHUB_SHA") ?? "unknown",
      ref: this.get("GITHUB_REF") ?? "unknown",
      actor: this.get("GITHUB_ACTOR") ?? "unknown",
      eventName: this.get("GITHUB_EVENT_NAME") ?? "unknown",
      repository: this.get("GITHUB_REPOSITORY") ?? "unknown",
      runId: this.get("GITHUB_RUN_ID") ?? "unknown",
      runNumber: this.get("GITHUB_RUN_NUMBER") ?? "unknown",
      workflow: this.get("GITHUB_WORKFLOW") ?? "unknown",
      job: this.get("GITHUB_JOB") ?? "unknown",
      action: this.get("GITHUB_ACTION") ?? "unknown",
    };
  }

  /**
   * {@inheritDoc IEnvironmentHelper.getWithValidation}
   */
  getWithValidation(config: EnvConfig): string | undefined {
    const { key, defaultValue, required = false, validator } = config;

    const value = this.get(key, defaultValue);

    if (required && !value) {
      const errorMessage = `Required environment variable '${key}' is not set or is empty`;
      core.setFailed(errorMessage);
      throw new Error(errorMessage);
    }

    if (value && validator && !validator(value)) {
      const errorMessage = `Environment variable '${key}' failed validation: ${value}`;
      core.setFailed(errorMessage);
      throw new Error(errorMessage);
    }

    return value;
  }
}

/**
 * Creates a new instance of the environment helper
 * @returns Environment helper instance
 * @example
 * ```typescript
 * const env = createEnvironmentHelper();
 * const apiUrl = env.get('API_URL', 'http://localhost:3000');
 * const commitSha = env.getRequired('GITHUB_SHA');
 * const isProduction = env.getBoolean('IS_PRODUCTION', false);
 * ```
 */
export function createEnvironmentHelper(): IEnvironmentHelper {
  return new EnvironmentHelper();
}

/**
 * Default environment helper instance
 * Exported for convenience - can be used directly without creating an instance
 */
export const env = createEnvironmentHelper();
