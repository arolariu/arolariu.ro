/**
 * @fileoverview Navigation fixtures for Playwright E2E tests.
 * Provides `safeNavigate`, `navigateAndAssert`, and `checkUrl` helpers that wrap
 * `page.goto` with structured result reporting. Tests run as a single attempt
 * — retries previously existed only to mask dev-mode 500s and slow on-demand
 * compilation, which the production-build web server eliminates.
 * @module tests/fixtures/navigation
 */

import {type Page, type Response} from "@playwright/test";

import {loggers} from "../utils/logger";
import {baseTest} from "./base.fixture";

const log = loggers.navigation;

/* eslint-disable no-magic-numbers, unicorn/numeric-separators-style -- Test utilities use explicit numeric values */

/**
 * Navigation options.
 */
export interface NavigateOptions {
  /** Wait until strategy (default: "domcontentloaded") */
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  /** Timeout for the navigation in ms (default: 30000 — generous for dev-mode cold compile) */
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
  /** Always 1 — kept for back-compat with callers that logged retry counts */
  attempts: number;
  /** Error message if navigation failed */
  error?: string;
  /** URL navigated to */
  url: string;
}

/** HTTP status constants */
const HTTP_OK = 200;

/**
 * Default navigation options. Tests run as a single attempt — retries previously
 * existed to mask dev-mode 500s and slow on-demand compilation. The 30s navigation
 * timeout is generous enough to absorb dev-mode cold-compile (Clerk routes, the
 * global 404 page) without reintroducing retry logic; prod-build navigations
 * complete in <1s so the ceiling is irrelevant on that path.
 */
export const NAVIGATION_DEFAULTS = {
  waitUntil: "domcontentloaded" as const,
  navigationTimeout: 30000,
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
    const message = error instanceof Error ? error.message : String(error);
    const duration = performance.now() - startTime;
    log.error(`Navigation failed: ${url}`, {durationMs: duration.toFixed(2), error: message});

    return {
      response: null,
      status: null,
      success: false,
      attempts: 1,
      url,
      error: message,
    };
  }
}

/**
 * Navigation fixture types.
 */
export interface NavigationFixtures {
  /**
   * Navigate to a URL and report a structured `NavigationResult`.
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
   * Default navigation options.
   */
  navigationOptions: NavigateOptions;
}

/**
 * Navigation test fixture.
 */
export const navigationTest = baseTest.extend<NavigationFixtures>({
  safeNavigate: async ({page}, use) => {
    await use(async (url: string, options?: NavigateOptions) => {
      return navigateWithRetry(page, url, options);
    });
  },

  navigateAndAssert: async ({page}, use) => {
    await use(async (url: string, options?: NavigateOptions) => {
      const result = await navigateWithRetry(page, url, options);
      if (!result.success || !result.response) {
        throw new Error(`Navigation to ${url} failed: ${result.error} (status: ${result.status}, attempts: ${result.attempts})`);
      }
      return result.response;
    });
  },

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

  navigationOptions: async ({}, use) => {
    await use(getDefaultNavigationOptions());
  },
});

/* eslint-enable no-magic-numbers, unicorn/numeric-separators-style */
