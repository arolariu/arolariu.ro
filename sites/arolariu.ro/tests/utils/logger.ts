/**
 * @fileoverview Centralized logging utility for Playwright tests.
 * Provides debug-aware logging with consistent formatting.
 * @module tests/utils/logger
 *
 * @example
 * Enable debug logging:
 * ```bash
 * PLAYWRIGHT_DEBUG=true npx playwright test
 * ```
 */

/* eslint-disable no-console -- Logger utility needs console access */

/**
 * Log levels for filtering output.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Log categories for grouping related messages.
 */
export type LogCategory = "config" | "navigation" | "a11y" | "screenshot" | "fixture" | "page-object" | "setup" | "teardown" | "test";

/**
 * Check if debug mode is enabled.
 */
export function isDebugEnabled(): boolean {
  return process.env["PLAYWRIGHT_DEBUG"] === "true" || process.env["DEBUG"] === "true";
}

/**
 * Check if verbose mode is enabled (even more output).
 */
export function isVerboseEnabled(): boolean {
  return process.env["PLAYWRIGHT_VERBOSE"] === "true";
}

/**
 * Format a timestamp for log output.
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().slice(11, 23); // HH:mm:ss.SSS
}

/**
 * Format a log message with consistent structure.
 */
function formatMessage(category: LogCategory, level: LogLevel, message: string): string {
  const timestamp = formatTimestamp();
  const levelStr = level.toUpperCase().padEnd(5);
  const categoryStr = category.toUpperCase().padEnd(12);
  return `[${timestamp}] [${levelStr}] [${categoryStr}] ${message}`;
}

/**
 * Core logging function.
 */
function log(category: LogCategory, level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const formattedMessage = formatMessage(category, level, message);

  switch (level) {
    case "error":
      console.error(formattedMessage, data ?? "");
      break;
    case "warn":
      console.warn(formattedMessage, data ?? "");
      break;
    case "info":
      console.info(formattedMessage, data ?? "");
      break;
    case "debug":
      if (isDebugEnabled()) {
        console.log(formattedMessage, data ?? "");
      }
      break;
  }
}

/**
 * Logger interface for a specific category.
 */
export interface CategoryLogger {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  /** Log timing information */
  time: (label: string) => () => void;
  /** Log a section header */
  section: (title: string) => void;
}

/**
 * Create a logger for a specific category.
 *
 * @param category - Log category for filtering
 * @returns Logger instance with category-scoped methods
 *
 * @example
 * ```typescript
 * const logger = createLogger('navigation');
 * logger.debug('Starting navigation', { url: '/about' });
 * logger.info('Navigation complete', { status: 200 });
 * ```
 */
export function createLogger(category: LogCategory): CategoryLogger {
  return {
    debug: (message: string, data?: Record<string, unknown>) => log(category, "debug", message, data),
    info: (message: string, data?: Record<string, unknown>) => log(category, "info", message, data),
    warn: (message: string, data?: Record<string, unknown>) => log(category, "warn", message, data),
    error: (message: string, data?: Record<string, unknown>) => log(category, "error", message, data),

    /**
     * Start a timer and return a function to log elapsed time.
     */
    time: (label: string) => {
      const start = performance.now();
      if (isDebugEnabled()) {
        log(category, "debug", `⏱️  Starting: ${label}`);
      }
      return () => {
        const elapsed = performance.now() - start;
        log(category, "debug", `⏱️  Completed: ${label} (${elapsed.toFixed(2)}ms)`);
      };
    },

    /**
     * Log a section header for visual separation.
     */
    section: (title: string) => {
      if (isDebugEnabled()) {
        const separator = "─".repeat(50);
        console.log(`\n${separator}`);
        console.log(`  ${title}`);
        console.log(`${separator}`);
      }
    },
  };
}

/**
 * Pre-configured loggers for each category.
 */
export const loggers = {
  config: createLogger("config"),
  navigation: createLogger("navigation"),
  a11y: createLogger("a11y"),
  screenshot: createLogger("screenshot"),
  fixture: createLogger("fixture"),
  pageObject: createLogger("page-object"),
  setup: createLogger("setup"),
  teardown: createLogger("teardown"),
  test: createLogger("test"),
} as const;

/**
 * Log test start with context.
 */
export function logTestStart(testName: string, tags?: string[]): void {
  if (isDebugEnabled()) {
    loggers.test.section(`Test: ${testName}`);
    if (tags && tags.length > 0) {
      loggers.test.debug("Tags", {tags});
    }
  }
}

/**
 * Log test end with status.
 */
export function logTestEnd(testName: string, status: "passed" | "failed" | "skipped", durationMs?: number): void {
  const statusEmoji = status === "passed" ? "✅" : status === "failed" ? "❌" : "⏭️";
  const message = `${statusEmoji} ${testName} - ${status}`;

  if (status === "failed") {
    loggers.test.error(message, durationMs ? {durationMs} : undefined);
  } else if (isDebugEnabled()) {
    loggers.test.info(message, durationMs ? {durationMs} : undefined);
  }
}

/**
 * Log a summary table of results.
 */
export function logSummary(title: string, data: Record<string, string | number>): void {
  console.log(`\n${"═".repeat(50)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(50));

  for (const [key, value] of Object.entries(data)) {
    const paddedKey = key.padEnd(15);
    console.log(`  ${paddedKey}: ${value}`);
  }

  console.log("═".repeat(50) + "\n");
}

/* eslint-enable no-console */
