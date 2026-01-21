/**
 * @fileoverview Navigation fixtures with retry logic and warmup capabilities.
 * Handles Next.js on-demand compilation issues gracefully.
 * @module tests/fixtures/navigation
 */

import {type Page, type Response} from "@playwright/test";

import {loggers} from "../utils/logger";
import {baseTest} from "./base.fixture";

const log = loggers.navigation;

/* eslint-disable no-magic-numbers, unicorn/numeric-separators-style -- Test utilities use explicit numeric values */

/**
 * Navigation options with retry configuration.
 */
export interface NavigateOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms before retrying (default: 1000) */
  initialDelay?: number;
  /** Maximum total wait time in ms (default: 30000) */
  maxTotalWait?: number;
  /** Wait until strategy (default: "domcontentloaded") */
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  /** Timeout per navigation attempt in ms (default: 15000) */
  navigationTimeout?: number;
}

/**
 * Result of a navigation attempt.
 */
export interface NavigationResult {
  /** The response object, or null if navigation failed */
  response: Response | null;
  /** HTTP status code, or null if navigation failed */
  status: number | null;
  /** Whether the navigation was successful (status 200) */
  success: boolean;
  /** Number of attempts made */
  attempts: number;
  /** Error message if navigation failed */
  error?: string;
  /** URL navigated to */
  url: string;
}

/** HTTP status constants */
const HTTP_OK = 200;
const HTTP_SERVER_ERROR = 500;

/**
 * Default navigation options for different environments.
 */
export const NAVIGATION_DEFAULTS = {
  ci: {
    maxAttempts: 3,
    initialDelay: 2000,
    maxTotalWait: 25000,
    waitUntil: "domcontentloaded" as const,
    navigationTimeout: 15000,
  },
  local: {
    maxAttempts: 2,
    initialDelay: 500,
    maxTotalWait: 10000,
    waitUntil: "domcontentloaded" as const,
    navigationTimeout: 10000,
  },
} as const;

/**
 * Get default navigation options based on environment.
 */
export function getDefaultNavigationOptions(): NavigateOptions {
  return process.env["CI"] ? NAVIGATION_DEFAULTS.ci : NAVIGATION_DEFAULTS.local;
}

/**
 * Check if a status code indicates a server error.
 */
function isServerError(status: number | undefined): boolean {
  return typeof status === "number" && status >= HTTP_SERVER_ERROR;
}

/**
 * Safe wait that handles page closure.
 */
async function safeWait(page: Page, delay: number): Promise<boolean> {
  try {
    await page.waitForTimeout(delay);
    return true;
  } catch {
    return false;
  }
}

/**
 * Navigate to a URL with automatic retry for server warmup issues.
 * Uses linear backoff to stay within test timeout limits.
 */
export async function navigateWithRetry(page: Page, url: string, options: NavigateOptions = {}): Promise<NavigationResult> {
  const defaults = getDefaultNavigationOptions();
  const {
    maxAttempts = defaults.maxAttempts ?? 3,
    initialDelay = defaults.initialDelay ?? 1000,
    maxTotalWait = defaults.maxTotalWait ?? 30000,
    waitUntil = defaults.waitUntil ?? "domcontentloaded",
    navigationTimeout = defaults.navigationTimeout ?? 15000,
  } = options;

  const startTime = performance.now();
  log.debug(`Navigating to: ${url}`, {maxAttempts, waitUntil, navigationTimeout});

  let totalWaitTime = 0;
  let lastError: Error | undefined;
  let lastResponse: Response | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt < maxAttempts && totalWaitTime < maxTotalWait; attempt++) {
    attempts++;
    log.debug(`Attempt ${attempts}/${maxAttempts} for ${url}`);

    try {
      const response = await page.goto(url, {waitUntil, timeout: navigationTimeout});
      lastResponse = response;

      if (response) {
        const status = response.status();

        // Success - return immediately
        if (status === HTTP_OK) {
          const duration = performance.now() - startTime;
          log.debug(`✅ Navigation successful: ${url}`, {status, attempts, durationMs: duration.toFixed(2)});
          return {response, status, success: true, attempts, url};
        }

        // Server error (5xx) - retry with backoff
        if (isServerError(status)) {
          log.warn(`Server error ${status} for ${url}, will retry`, {attempt: attempts, maxAttempts});
          const delay = Math.min(initialDelay * (attempt + 1), maxTotalWait - totalWaitTime);
          if (delay > 0 && attempt < maxAttempts - 1) {
            log.debug(`Waiting ${delay}ms before retry`);
            const waited = await safeWait(page, delay);
            if (!waited) break;
            totalWaitTime += delay;
            continue;
          }
        }

        // Client error (4xx) or redirect - return as-is
        const duration = performance.now() - startTime;
        log.debug(`Navigation completed with status ${status}: ${url}`, {attempts, durationMs: duration.toFixed(2)});
        return {
          response,
          status,
          success: false,
          attempts,
          url,
          error: `Received status ${status}`,
        };
      }
    } catch (error) {
      lastError = error as Error;
      log.warn(`Navigation error for ${url}: ${lastError.message}`, {attempt: attempts});
      const delay = Math.min(initialDelay * (attempt + 1), maxTotalWait - totalWaitTime);
      if (delay > 0 && attempt < maxAttempts - 1) {
        log.debug(`Waiting ${delay}ms before retry after error`);
        const waited = await safeWait(page, delay);
        if (!waited) break;
        totalWaitTime += delay;
      }
    }
  }

  const duration = performance.now() - startTime;
  log.error(`❌ Navigation failed: ${url}`, {
    attempts,
    totalWaitTime,
    durationMs: duration.toFixed(2),
    error: lastError?.message,
  });

  return {
    response: lastResponse,
    status: lastResponse?.status() ?? null,
    success: false,
    attempts,
    url,
    error: lastError?.message ?? "Navigation failed after all attempts",
  };
}

/**
 * Navigation fixture types.
 */
export interface NavigationFixtures {
  /**
   * Navigate to a URL with automatic retry logic.
   * Handles Next.js on-demand compilation gracefully.
   */
  safeNavigate: (url: string, options?: NavigateOptions) => Promise<NavigationResult>;

  /**
   * Navigate and assert success (status 200).
   * Throws if navigation fails.
   */
  navigateAndAssert: (url: string, options?: NavigateOptions) => Promise<Response>;

  /**
   * Check if a URL is accessible without affecting current page.
   * Opens URL in a new page context.
   */
  checkUrl: (url: string, options?: NavigateOptions) => Promise<NavigationResult>;

  /**
   * Pre-warm routes by navigating to them.
   * Useful in beforeAll hooks.
   */
  warmupRoutes: (routes: string[]) => Promise<void>;

  /**
   * Current navigation options based on environment.
   */
  navigationOptions: NavigateOptions;
}

/**
 * Navigation test fixture with retry logic.
 */
export const navigationTest = baseTest.extend<NavigationFixtures>({
  /**
   * Safe navigation with retry.
   */
  safeNavigate: async ({page}, use) => {
    await use(async (url: string, options?: NavigateOptions) => {
      return navigateWithRetry(page, url, options);
    });
  },

  /**
   * Navigate and assert success.
   */
  navigateAndAssert: async ({page}, use) => {
    await use(async (url: string, options?: NavigateOptions) => {
      const result = await navigateWithRetry(page, url, options);
      if (!result.success || !result.response) {
        throw new Error(`Navigation to ${url} failed: ${result.error} (status: ${result.status}, attempts: ${result.attempts})`);
      }
      return result.response;
    });
  },

  /**
   * Check URL accessibility in new page.
   */
  checkUrl: async ({context}, use) => {
    await use(async (url: string, options?: NavigateOptions) => {
      const newPage = await context.newPage();
      try {
        return await navigateWithRetry(newPage, url, options);
      } finally {
        await newPage.close();
      }
    });
  },

  /**
   * Warmup routes for faster test execution.
   */
  warmupRoutes: async ({page}, use) => {
    await use(async (routes: string[]) => {
      const warmupOptions: NavigateOptions = {
        maxAttempts: 2,
        initialDelay: 500,
        maxTotalWait: 10000,
        navigationTimeout: 10000,
      };

      for (const route of routes) {
        try {
          await navigateWithRetry(page, route, warmupOptions);
        } catch {
          // Ignore warmup failures
        }
      }
    });
  },

  /**
   * Environment-aware navigation options.
   */
  navigationOptions: async ({}, use) => {
    await use(getDefaultNavigationOptions());
  },
});

/**
 * Routes commonly needing warmup.
 */
export const WARMUP_ROUTES = ["/", "/about", "/domains", "/auth"];

/* eslint-enable no-magic-numbers, unicorn/numeric-separators-style */
