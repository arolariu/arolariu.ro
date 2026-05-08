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

/**
 * Default navigation options. Tests run against a production build, so a
 * single navigation attempt is enough — retries previously existed to mask
 * dev-mode compile failures.
 */
export const NAVIGATION_DEFAULTS = {
  maxAttempts: 1,
  initialDelay: 0,
  maxTotalWait: 0,
  waitUntil: "domcontentloaded" as const,
  navigationTimeout: 15000,
} as const;

/**
 * Get default navigation options. Kept as a function for back-compat with
 * callers that expected env-aware defaults.
 */
export function getDefaultNavigationOptions(): NavigateOptions {
  return NAVIGATION_DEFAULTS;
}

/**
 * Navigate to a URL once and report the outcome.
 * No retries — a 500 from a static production page is a real bug.
 */
export async function navigateWithRetry(
  page: Page,
  url: string,
  options: NavigateOptions = {},
): Promise<NavigationResult> {
  const {waitUntil = NAVIGATION_DEFAULTS.waitUntil, navigationTimeout = NAVIGATION_DEFAULTS.navigationTimeout} = options;

  const startTime = performance.now();
  log.debug(`Navigating to: ${url}`, {waitUntil, navigationTimeout});

  try {
    const response = await page.goto(url, {waitUntil, timeout: navigationTimeout});
    const status = response?.status() ?? null;
    const success = status === HTTP_OK;
    const duration = performance.now() - startTime;

    log.debug(`Navigation completed: ${url}`, {status, success, durationMs: duration.toFixed(2)});

    return {
      response,
      status,
      success,
      attempts: 1,
      url,
      ...(success ? {} : {error: `Received status ${status}`}),
    };
  } catch (error) {
    const err = error as Error;
    const duration = performance.now() - startTime;
    log.error(`Navigation failed: ${url}`, {durationMs: duration.toFixed(2), error: err.message});

    return {
      response: null,
      status: null,
      success: false,
      attempts: 1,
      url,
      error: err.message,
    };
  }
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
