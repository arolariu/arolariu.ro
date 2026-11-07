/**
 * @fileoverview Environment variable management utilities for GitHub Actions.
 * @module github/scripts/helpers/environment
 *
 * @remarks
 * Provides a clean, type-safe API for working with environment variables in GitHub Actions workflows.
 * Follows Single Responsibility Principle by focusing solely on environment access and validation.
 */

import * as core from "../sdk/core.ts";

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
 * Reads the current directory at the resource boundary, without changing it.
 * @returns Native absolute working directory for a local execution fallback.
 */
export function getWorkingDirectory(): string {
  return process.cwd();
}

/**
 * GitHub Actions environment context
 * Contains standard environment variables provided by GitHub Actions
 */
export interface GitHubEnvContext {
  /** Full commit SHA */
  readonly sha: string;
  /** Git reference (e.g., refs/heads/main) */
  readonly ref: string;
  /** Actor who triggered the workflow */
  readonly actor: string;
  /** Event name that triggered the workflow */
  readonly eventName: string;
  /** Repository in owner/name format */
  readonly repository: string;
  /** Unique run ID */
  readonly runId: string;
  /** Run number (incremental) */
  readonly runNumber: string;
  /** Workflow name */
  readonly workflow: string;
  /** Job name */
  readonly job: string;
  /** Action name */
  readonly action: string;
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
   * @remarks Ordinary lookup retains legacy "null"/"undefined" sentinel handling;
   * typed boolean/integer reads reject those supplied invalid strings.
   */
  get(key: string, defaultValue?: string): string | undefined;

  /**
   * Gets a required environment variable without changing action status.
   * @param key - Variable name
   * @returns Variable value
   * @throws {Error} When the value is missing or empty.
   */
  getRequired(key: string): string;

  /**
   * Gets multiple required environment variables
   * @param keys - Array of variable names
   * @returns Record mapping variable names to values
   * @throws {Error} When any requested variable is missing.
   */
  getRequiredBatch(keys: readonly string[]): Readonly<Record<string, string>>;

  /**
   * Checks if an environment variable exists and has a value
   * @param key - Variable name
   * @returns True if variable exists and is not empty
   */
  has(key: string): boolean;

  /**
   * Captures a shallow immutable variable record for one execution.
   * @returns A copy of the current source; it may contain secrets and must not be logged or serialized into reports.
   */
  snapshot(): Readonly<Record<string, string | undefined>>;

  /**
   * Parses an environment variable as boolean
   * @param key - Variable name
   * @param defaultValue - Default value if not set
   * @returns A recognized true/false value, or the default only when absent.
   * @throws {Error} When a supplied value is not true/false, 1/0, or yes/no.
   */
  getBoolean(key: string, defaultValue?: boolean): boolean;

  /**
   * Parses an environment variable as integer
   * @param key - Variable name
   * @param defaultValue - Default value only when the variable is absent.
   * @returns A safe integer.
   * @throws {Error} When a supplied value is not a complete safe integer.
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
  private readonly variables: Readonly<Record<string, string | undefined>> | undefined;

  /**
   * Selects a stable injected source or live ambient lookups.
   * @param variables - Optional record copied once; omission reads the current process environment on each lookup.
   */
  constructor(variables?: Readonly<Record<string, string | undefined>>) {
    this.variables = variables === undefined ? undefined : Object.freeze({...variables});
  }

  /**
   * Checks if a value is considered empty/null
   * @param value - Value to check
   * @returns True if value is empty, null, undefined, or the string representations
   */
  private isEmptyValue(value: string | undefined): boolean {
    return !value || value.trim().length === 0 || value === "null" || value === "undefined";
  }

  private typedValue(key: string): string | undefined {
    const value = (this.variables ?? process.env)[key];
    return value === undefined || value.trim().length === 0 ? undefined : value;
  }

  /**
   * {@inheritDoc IEnvironmentHelper.get}
   */
  get(key: string, defaultValue?: string): string | undefined {
    const value = (this.variables ?? process.env)[key];

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
      throw new Error(errorMessage);
    }

    return value;
  }

  /**
   * {@inheritDoc IEnvironmentHelper.getRequiredBatch}
   */
  getRequiredBatch(keys: readonly string[]): Readonly<Record<string, string>> {
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
      throw new Error(errorMessage);
    }

    core.debug(`Successfully retrieved ${keys.length} required environment variables`);
    return result;
  }

  /**
   * {@inheritDoc IEnvironmentHelper.has}
   */
  has(key: string): boolean {
    const value = (this.variables ?? process.env)[key];
    return !this.isEmptyValue(value);
  }

  /** {@inheritDoc IEnvironmentHelper.snapshot} */
  snapshot(): Readonly<Record<string, string | undefined>> {
    return Object.freeze({...(this.variables ?? process.env)});
  }

  /**
   * {@inheritDoc IEnvironmentHelper.getBoolean}
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.typedValue(key);

    if (!value) {
      return defaultValue;
    }

    const normalized = value.toLowerCase().trim();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
    throw new Error(`Environment variable '${key}' must be a boolean`);
  }

  /**
   * {@inheritDoc IEnvironmentHelper.getInt}
   */
  getInt(key: string, defaultValue: number): number {
    const value = this.typedValue(key);

    if (!value) {
      return defaultValue;
    }

    const normalized = value.trim();
    const parsed = Number(normalized);
    if (!/^[+-]?\d+$/.test(normalized) || !Number.isSafeInteger(parsed)) {
      throw new Error(`Environment variable '${key}' must be a safe integer`);
    }
    return parsed;
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
    const {key, defaultValue, required = false, validator} = config;

    const value = this.get(key, defaultValue);

    if (required && !value) {
      const errorMessage = `Required environment variable '${key}' is not set or is empty`;
      throw new Error(errorMessage);
    }

    if (value && validator && !validator(value)) {
      const errorMessage = `Environment variable '${key}' failed validation`;
      throw new Error(errorMessage);
    }

    return value;
  }
}

/**
 * Creates a new instance of the environment helper
 * @param variables - Optional immutable input source; omission retains live environment lookups.
 * @returns Environment helper instance
 * @example
 * ```typescript
 * const env = createEnvironmentHelper();
 * const apiUrl = env.get('API_URL', 'http://localhost:3000');
 * const commitSha = env.getRequired('GITHUB_SHA');
 * const isProduction = env.getBoolean('IS_PRODUCTION', false);
 * ```
 */
export function createEnvironmentHelper(variables?: Readonly<Record<string, string | undefined>>): IEnvironmentHelper {
  return new EnvironmentHelper(variables);
}

/**
 * Default environment helper instance
 * Exported for convenience - can be used directly without creating an instance
 */
export const env = createEnvironmentHelper();
