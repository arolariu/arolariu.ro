/**
 * @fileoverview Playwright test utilities for reliable E2E testing.
 * Provides retry logic that respects test timeouts and handles server warmup issues.
 * @module test-utils/playwright-helpers
 */

import {expect, type Page, type Response} from "@playwright/test";

/* eslint-disable unicorn/numeric-separators-style, no-magic-numbers -- Test utilities use simple numeric constants for clarity */

/**
 * Options for navigation with retry logic.
 */
interface NavigateWithRetryOptions {
  /** Maximum number of attempts (default: 3) */
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
 * Navigation result with status information.
 */
interface NavigationResult {
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
}

/** Success HTTP status code */
const HTTP_OK = 200;
/** Server error threshold */
const HTTP_SERVER_ERROR = 500;

/**
 * Internal state for retry loop.
 */
interface RetryState {
  totalWaitTime: number;
  lastError: Error | undefined;
  lastResponse: Response | null;
  attempts: number;
  shouldBreak: boolean;
}

/**
 * Configuration shared by retry handlers.
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxTotalWait: number;
}

/**
 * Result of handling a retry step.
 */
interface RetryUpdate {
  shouldBreak: boolean;
  addedWait: number;
}

/**
 * Parameters for handling a successful navigation response.
 */
interface HandleSuccessParams {
  page: Page;
  response: Response;
  attempt: number;
  config: RetryConfig;
  totalWaitTime: number;
  attempts: number;
}

/**
 * Calculate the delay for the current attempt.
 */
function calculateDelay(attempt: number, initialDelay: number, maxTotalWait: number, totalWaitTime: number): number {
  return Math.min(initialDelay * (attempt + 1), maxTotalWait - totalWaitTime);
}

/**
 * Check if a status code indicates a server error that should trigger a retry.
 */
function isServerError(status: number | undefined): boolean {
  return typeof status === "number" && status >= HTTP_SERVER_ERROR;
}

/**
 * Wait for a delay, returning false if the page is closed.
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
 * Handle a navigation error by updating state and waiting if needed.
 */
async function handleNavigationError(page: Page, attempt: number, config: RetryConfig, totalWaitTime: number): Promise<RetryUpdate> {
  const delay = calculateDelay(attempt, config.initialDelay, config.maxTotalWait, totalWaitTime);
  if (delay > 0 && attempt < config.maxAttempts - 1) {
    const waited = await safeWait(page, delay);
    if (!waited) {
      return {shouldBreak: true, addedWait: 0};
    }
    return {shouldBreak: false, addedWait: delay};
  }

  return {shouldBreak: false, addedWait: 0};
}

/**
 * Handle a successful response by returning early or waiting for retry.
 */
async function handleSuccessfulResponse(params: HandleSuccessParams): Promise<NavigationResult | RetryUpdate | undefined> {
  const {page, response, attempt, config, totalWaitTime, attempts} = params;
  const status = response.status();

  // Success - return immediately
  if (status === HTTP_OK) {
    return {response, status, success: true, attempts};
  }

  // Server error (5xx) - retry with linear backoff
  if (isServerError(status)) {
    const delay = calculateDelay(attempt, config.initialDelay, config.maxTotalWait, totalWaitTime);
    if (delay > 0 && attempt < config.maxAttempts - 1) {
      const waited = await safeWait(page, delay);
      if (!waited) {
        return {shouldBreak: true, addedWait: 0};
      }
      return {shouldBreak: false, addedWait: delay};
    }
    return undefined;
  }

  // Client error (4xx) or redirect (3xx) - return as-is, don't retry
  return {response, status, success: false, attempts, error: `Received status ${status}`};
}

/**
 * Navigate to a URL with automatic retry for server warmup issues.
 * Uses linear backoff to stay within test timeout limits.
 *
 * @param page - Playwright page object
 * @param url - URL or path to navigate to
 * @param options - Navigation options
 * @returns Navigation result with status information
 *
 * @example
 * ```typescript
 * const result = await navigateWithRetry(page, "/about");
 * expect(result.success).toBe(true);
 * expect(result.status).toBe(200);
 * ```
 */
export async function navigateWithRetry(page: Page, url: string, options: NavigateWithRetryOptions = {}): Promise<NavigationResult> {
  const {maxAttempts = 3, initialDelay = 1000, maxTotalWait = 30000, waitUntil = "domcontentloaded", navigationTimeout = 15000} = options;
  const retryConfig: RetryConfig = {maxAttempts, initialDelay, maxTotalWait};

  const state: RetryState = {
    totalWaitTime: 0,
    lastError: undefined,
    lastResponse: null,
    attempts: 0,
    shouldBreak: false,
  };

  for (let attempt = 0; attempt < maxAttempts && state.totalWaitTime < maxTotalWait; attempt++) {
    if (state.shouldBreak) break;
    state.attempts++;

    try {
      const response = await page.goto(url, {waitUntil, timeout: navigationTimeout});
      state.lastResponse = response;

      if (response) {
        const result = await handleSuccessfulResponse({
          page,
          response,
          attempt,
          config: retryConfig,
          totalWaitTime: state.totalWaitTime,
          attempts: state.attempts,
        });
        if (result) {
          if ("success" in result) return result;
          state.totalWaitTime += result.addedWait;
          state.shouldBreak = result.shouldBreak;
        }
      }
    } catch (error) {
      state.lastError = error as Error;
      const update = await handleNavigationError(page, attempt, retryConfig, state.totalWaitTime);
      state.totalWaitTime += update.addedWait;
      state.shouldBreak = update.shouldBreak;
    }
  }

  return {
    response: state.lastResponse,
    status: state.lastResponse?.status() ?? null,
    success: false,
    attempts: state.attempts,
    error: state.lastError?.message ?? "Navigation failed after all attempts",
  };
}

/**
 * Check if a link is navigable (returns 200 OK).
 * Opens link in a new page to avoid affecting the current test state.
 *
 * @param context - Playwright browser context
 * @param href - URL to check
 * @param options - Navigation options
 * @returns Navigation result
 */
export async function checkLinkNavigable(
  context: {newPage: () => Promise<Page>},
  href: string,
  options: NavigateWithRetryOptions = {},
): Promise<NavigationResult> {
  const newPage = await context.newPage();
  try {
    return await navigateWithRetry(newPage, href, options);
  } finally {
    await newPage.close();
  }
}

/**
 * Assert that navigation to a URL succeeds with status 200.
 *
 * @param page - Playwright page object
 * @param url - URL to navigate to
 * @param options - Navigation options
 *
 * @example
 * ```typescript
 * await assertNavigationSuccess(page, "/about");
 * ```
 */
export async function assertNavigationSuccess(page: Page, url: string, options: NavigateWithRetryOptions = {}): Promise<void> {
  const result = await navigateWithRetry(page, url, options);
  expect(result.success, `Navigation to ${url} should succeed (status: ${result.status}, attempts: ${result.attempts})`).toBe(true);
}

/**
 * Check external link attributes (href, target="_blank").
 *
 * @param page - Playwright page object
 * @param selector - CSS selector for the link
 * @param expectedHref - Expected href value
 */
export async function checkExternalLink(page: Page, selector: string, expectedHref: string): Promise<void> {
  await expect(page.locator(selector).first()).toBeVisible({timeout: 15000});
  await expect(page.locator(selector).first()).toHaveAttribute("href", expectedHref);
  await expect(page.locator(selector).first()).toHaveAttribute("target", "_blank");
}

/**
 * Check internal navigation link attributes.
 *
 * @param page - Playwright page object
 * @param selector - CSS selector for the link
 * @param expectedHref - Expected href value
 * @param expectedText - Optional expected text content
 */
export async function checkInternalLink(page: Page, selector: string, expectedHref: string, expectedText?: RegExp | string): Promise<void> {
  await expect(page.locator(selector).first()).toBeVisible({timeout: 15000});
  await expect(page.locator(selector).first()).toHaveAttribute("href", expectedHref);
  if (expectedText) {
    // eslint-disable-next-line security/detect-non-literal-regexp -- Expected text from test parameters is safe
    const pattern = typeof expectedText === "string" ? new RegExp(expectedText, "iu") : expectedText;
    await expect(page.locator(selector).first()).toHaveText(pattern);
  }
}

/**
 * Pre-warm a list of routes by navigating to them.
 * Useful in beforeAll hooks to trigger on-demand compilation.
 *
 * @param page - Playwright page object
 * @param routes - Array of routes to pre-warm
 * @param options - Navigation options for each route
 */
export async function warmupRoutes(page: Page, routes: string[], options: NavigateWithRetryOptions = {}): Promise<void> {
  const warmupOptions = {
    ...options,
    maxAttempts: 2,
    initialDelay: 500,
    maxTotalWait: 10000,
    navigationTimeout: 10000,
  };

  for (const route of routes) {
    try {
      await navigateWithRetry(page, route, warmupOptions);
    } catch {
      // Ignore warmup failures - the actual tests will handle errors
    }
  }
}

/**
 * Routes that commonly need warmup (pages that are slow to compile).
 */
export const WARMUP_ROUTES = ["/", "/about", "/domains", "/auth"];

/**
 * Default navigation options optimized for CI environments.
 */
export const CI_NAVIGATION_OPTIONS: NavigateWithRetryOptions = {
  maxAttempts: 3,
  initialDelay: 2000,
  maxTotalWait: 25000,
  waitUntil: "domcontentloaded",
  navigationTimeout: 15000,
};

/**
 * Default navigation options for local development.
 */
export const LOCAL_NAVIGATION_OPTIONS: NavigateWithRetryOptions = {
  maxAttempts: 2,
  initialDelay: 500,
  maxTotalWait: 10000,
  waitUntil: "domcontentloaded",
  navigationTimeout: 10000,
};

/**
 * Get appropriate navigation options based on environment.
 */
export function getNavigationOptions(): NavigateWithRetryOptions {
  return process.env["CI"] ? CI_NAVIGATION_OPTIONS : LOCAL_NAVIGATION_OPTIONS;
}
/* eslint-enable unicorn/numeric-separators-style, no-magic-numbers */
