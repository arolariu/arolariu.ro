/**
 * @fileoverview Base Playwright fixtures with auto-screenshot and common utilities.
 * Eliminates repetitive beforeEach/afterEach boilerplate from test files.
 * @module tests/fixtures/base
 */

import {test as base, type Page, type TestInfo} from "@playwright/test";

import {TIMEOUTS} from "../config";
import {loggers} from "../utils/logger";

const log = loggers.screenshot;

/* eslint-disable no-magic-numbers -- Test utilities use explicit numeric values */

/**
 * Screenshot options for test artifacts.
 */
export interface ScreenshotOptions {
  /** Include full page in screenshot */
  fullPage?: boolean;
  /** Custom screenshot name (default: generated from test title) */
  name?: string;
  /** Image type */
  type?: "png" | "jpeg";
  /** JPEG quality (0-100) */
  quality?: number;
}

/**
 * Base fixture types.
 */
export interface BaseFixtures {
  /**
   * Automatically takes a screenshot after each test.
   * Attached to test report for easy debugging.
   */
  autoScreenshot: void;

  /**
   * Takes a named screenshot and attaches it to the report.
   * Use for capturing specific states during a test.
   */
  takeScreenshot: (options?: ScreenshotOptions) => Promise<string>;

  /**
   * Waits for the page to be fully loaded and stable.
   * Useful before taking screenshots or making assertions.
   */
  waitForPageReady: () => Promise<void>;

  /**
   * Scrolls to an element and ensures it's in view.
   */
  scrollIntoView: (selector: string) => Promise<void>;
}

/**
 * Generates a filesystem-safe screenshot name from test info.
 */
function generateScreenshotName(testInfo: TestInfo, suffix?: string): string {
  const baseName = testInfo.titlePath.join("_").replace(/[^a-zA-Z0-9_-]/g, "-");

  const safeName = baseName.slice(0, 200); // Limit length for filesystem
  return suffix ? `${safeName}_${suffix}.png` : `${safeName}.png`;
}

/**
 * Takes a screenshot and attaches it to the test report.
 */
async function captureScreenshot(page: Page, testInfo: TestInfo, options?: ScreenshotOptions): Promise<string> {
  const screenshotName = options?.name ? `${options.name}.${options?.type ?? "png"}` : generateScreenshotName(testInfo);

  const screenshotPath = testInfo.outputPath(screenshotName);

  log.debug(`Capturing screenshot: ${screenshotName}`, {
    fullPage: options?.fullPage ?? false,
    type: options?.type ?? "png",
  });

  await page.screenshot({
    path: screenshotPath,
    fullPage: options?.fullPage ?? false,
    type: options?.type ?? "png",
    quality: options?.type === "jpeg" ? (options?.quality ?? 80) : undefined,
  });

  await testInfo.attach(screenshotName, {
    path: screenshotPath,
    contentType: options?.type === "jpeg" ? "image/jpeg" : "image/png",
  });

  log.debug(`Screenshot saved: ${screenshotPath}`);

  return screenshotPath;
}

/**
 * Base test fixture with automatic screenshot capture.
 *
 * @example
 * ```typescript
 * import { test } from '../fixtures';
 *
 * test('my test', async ({ page }) => {
 *   await page.goto('/');
 *   // Screenshot automatically taken after test
 * });
 * ```
 */
export const baseTest = base.extend<BaseFixtures>({
  /**
   * Auto-screenshot fixture - runs after every test automatically.
   * This eliminates the need for repetitive afterEach hooks.
   */
  autoScreenshot: [
    async ({page}, use, testInfo) => {
      await use();

      // After test: capture screenshot only on failure
      if (testInfo.status !== testInfo.expectedStatus) {
        try {
          await captureScreenshot(page, testInfo);
        } catch {
          // Ignore screenshot errors (page may be closed)
        }
      }
    },
    {auto: true}, // Automatically use this fixture in all tests
  ],

  /**
   * Manual screenshot capture for specific points in a test.
   */
  takeScreenshot: async ({page}, use, testInfo) => {
    await use(async (options?: ScreenshotOptions) => {
      return captureScreenshot(page, testInfo, options);
    });
  },

  /**
   * Wait for page to be fully ready for interaction.
   */
  waitForPageReady: async ({page}, use) => {
    await use(async () => {
      await page.waitForLoadState("domcontentloaded");
      // Wait for network to be mostly idle
      await page.waitForLoadState("networkidle").catch(() => {
        // Network idle may timeout on pages with continuous activity
      });
      // Small delay for any final renders
      await page.waitForTimeout(100);
    });
  },

  /**
   * Scroll element into view.
   */
  scrollIntoView: async ({page}, use) => {
    await use(async (selector: string) => {
      const element = page.locator(selector).first();
      await element.scrollIntoViewIfNeeded({timeout: TIMEOUTS.element});
    });
  },
});

/**
 * Extended expect configuration with custom timeout.
 */
export {expect} from "@playwright/test";

/* eslint-enable no-magic-numbers */
