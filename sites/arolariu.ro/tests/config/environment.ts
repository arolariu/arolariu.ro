/**
 * @fileoverview Environment detection and configuration utilities.
 * Provides consistent environment detection across the test infrastructure.
 * @module tests/config/environment
 */

/* eslint-disable no-magic-numbers, no-console -- Configuration uses explicit numeric values */

/** Supported test environments */
export type TestEnvironment = "ci" | "local" | "local-full" | "staging" | "production";

/** Environment-specific configuration */
export interface EnvironmentConfig {
  /** Base URL for the application */
  readonly baseURL: string;
  /** Whether to reuse existing server */
  readonly reuseExistingServer: boolean;
  /** Global test timeout in milliseconds */
  readonly timeout: number;
  /** Number of retries on failure */
  readonly retries: number;
  /** Worker percentage or count */
  readonly workers: string | number;
  /** Maximum failures before stopping */
  readonly maxFailures: number;
  /** Whether to record video */
  readonly video: "on" | "off" | "retain-on-failure" | "on-first-retry";
  /** Whether to capture trace */
  readonly trace: "on" | "off" | "retain-on-failure" | "on-first-retry";
}

/** Environment variable keys */
const ENV_KEYS = {
  CI: "CI",
  TEST_ENV: "TEST_ENV",
  BASE_URL: "BASE_URL",
  PLAYWRIGHT_WORKERS: "PLAYWRIGHT_WORKERS",
} as const;

/** Simple debug check for config logging (avoids circular import) */
const isDebug = process.env["PLAYWRIGHT_DEBUG"] === "true" || process.env["DEBUG"] === "true";

/**
 * Detect the current test environment.
 * Priority: TEST_ENV > CI detection > default to local
 */
export function getEnvironment(): TestEnvironment {
  const explicitEnv = process.env[ENV_KEYS.TEST_ENV];
  if (explicitEnv && isValidEnvironment(explicitEnv)) {
    if (isDebug) {
      console.log(`[CONFIG] Environment explicitly set to: ${explicitEnv}`);
    }
    return explicitEnv;
  }

  if (process.env[ENV_KEYS.CI]) {
    if (isDebug) {
      console.log("[CONFIG] CI environment detected");
    }
    return "ci";
  }

  if (isDebug) {
    console.log("[CONFIG] Using default environment: local");
  }
  return "local";
}

/**
 * Type guard for valid environment strings.
 */
function isValidEnvironment(value: string): value is TestEnvironment {
  return ["ci", "local", "local-full", "staging", "production"].includes(value);
}

/**
 * Check if running in CI environment.
 */
export function isCI(): boolean {
  return Boolean(process.env[ENV_KEYS.CI]);
}

/**
 * Check if running in local development.
 */
export function isLocal(): boolean {
  const env = getEnvironment();
  return env === "local" || env === "local-full";
}

/**
 * Get the base URL for the current environment.
 */
export function getBaseURL(): string {
  const customURL = process.env[ENV_KEYS.BASE_URL];
  if (customURL) {
    return customURL;
  }

  const env = getEnvironment();
  switch (env) {
    case "production":
      return "https://arolariu.ro";
    case "staging":
      return "https://staging.arolariu.ro";
    default:
      return "https://localhost:3000";
  }
}

/**
 * Get environment-specific configuration.
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = getEnvironment();
  const baseURL = getBaseURL();

  if (isDebug) {
    console.log(`[CONFIG] Loading configuration for environment: ${env}`);
    console.log(`[CONFIG] Base URL: ${baseURL}`);
  }

  const configs: Record<TestEnvironment, EnvironmentConfig> = {
    ci: {
      baseURL,
      reuseExistingServer: false,
      timeout: 90_000,
      retries: 2,
      workers: "75%",
      maxFailures: 5,
      video: "retain-on-failure",
      trace: "on-first-retry",
    },
    local: {
      baseURL,
      reuseExistingServer: true,
      timeout: 60_000,
      retries: 1,
      workers: "100%",
      maxFailures: 10,
      video: "off",
      trace: "on-first-retry",
    },
    "local-full": {
      baseURL,
      reuseExistingServer: true,
      timeout: 90_000,
      retries: 2,
      workers: "100%",
      maxFailures: 20,
      video: "on-first-retry",
      trace: "on-first-retry",
    },
    staging: {
      baseURL,
      reuseExistingServer: true,
      timeout: 120_000,
      retries: 3,
      workers: "50%",
      maxFailures: 10,
      video: "retain-on-failure",
      trace: "retain-on-failure",
    },
    production: {
      baseURL,
      reuseExistingServer: true,
      timeout: 120_000,
      retries: 3,
      workers: "25%",
      maxFailures: 3,
      video: "retain-on-failure",
      trace: "retain-on-failure",
    },
  };

  return configs[env];
}

/**
 * Get custom worker count if specified.
 */
export function getWorkerConfig(): string | number | undefined {
  const customWorkers = process.env[ENV_KEYS.PLAYWRIGHT_WORKERS];
  if (customWorkers) {
    const parsed = Number.parseInt(customWorkers, 10);
    return Number.isNaN(parsed) ? customWorkers : parsed;
  }
  return undefined;
}

/* eslint-enable no-magic-numbers, no-console */
