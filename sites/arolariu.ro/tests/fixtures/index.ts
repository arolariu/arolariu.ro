/**
 * @fileoverview Combined test fixture export.
 * Merges all fixtures into a single test function for use in spec files.
 * @module tests/fixtures
 *
 * @example
 * ```typescript
 * import { test, expect } from '../fixtures';
 *
 * test('my test @smoke', async ({ page, header, safeNavigate, checkA11y }) => {
 *   await safeNavigate('/');
 *   await header.shouldBeVisible();
 *
 *   const a11yResult = await checkA11y();
 *   a11yResult.assertNoViolations();
 * });
 * ```
 */

import {mergeTests} from "@playwright/test";

import {a11yTest, type A11yFixtures} from "./a11y.fixture";
import {baseTest, type BaseFixtures} from "./base.fixture";
import {navigationTest, type NavigationFixtures} from "./navigation.fixture";

// Re-export expect for convenience
export {expect} from "@playwright/test";

// Re-export individual fixtures for selective use
export {
  A11Y_RULE_SETS,
  a11yTest,
  type A11yCheckOptions,
  type A11yFixtures,
  type A11yResult,
  type A11yViolation,
  type WCAGLevel,
} from "./a11y.fixture";
export {baseTest, type BaseFixtures, type ScreenshotOptions} from "./base.fixture";
export {
  getDefaultNavigationOptions,
  navigateWithRetry,
  NAVIGATION_DEFAULTS,
  navigationTest,
  WARMUP_ROUTES,
  type NavigateOptions,
  type NavigationFixtures,
  type NavigationResult,
} from "./navigation.fixture";

/**
 * Combined fixture type including all custom fixtures.
 */
export type AllFixtures = BaseFixtures & NavigationFixtures & A11yFixtures;

/**
 * Combined test function with all fixtures.
 * Use this in test files for full functionality.
 *
 * @example
 * ```typescript
 * import { test, expect } from '../../tests/fixtures';
 *
 * test.describe('My Feature @smoke', () => {
 *   test('should work', async ({ page, safeNavigate }) => {
 *     const result = await safeNavigate('/my-page');
 *     expect(result.success).toBe(true);
 *   });
 * });
 * ```
 */
export const test = mergeTests(baseTest, navigationTest, a11yTest);

/**
 * Test function with only base fixtures (for simple tests).
 */
export const simpleTest = baseTest;

/**
 * Test function with navigation fixtures.
 */
export const navTest = mergeTests(baseTest, navigationTest);

/**
 * Test function with accessibility fixtures.
 */
export const accessibilityTest = mergeTests(baseTest, a11yTest);
