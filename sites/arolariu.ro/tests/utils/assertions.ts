/**
 * @fileoverview Custom assertion helpers for Playwright tests.
 * Provides reusable assertion patterns for common scenarios.
 * @module tests/utils/assertions
 */

import {expect, type Locator, type Page} from "@playwright/test";

import {TIMEOUTS} from "../config";

/* eslint-disable no-magic-numbers -- Assertion utilities use explicit values */

/**
 * Assert that an element has valid href and optionally correct target.
 *
 * @param locator - Element locator
 * @param expectedHref - Expected href value
 * @param external - If true, checks for target="_blank"
 */
export async function assertLink(locator: Locator, expectedHref: string, external: boolean = false): Promise<void> {
  await expect(locator).toBeVisible({timeout: TIMEOUTS.element});
  await expect(locator).toHaveAttribute("href", expectedHref);

  if (external) {
    await expect(locator).toHaveAttribute("target", "_blank");
  }
}

/**
 * Assert that an internal link is visible and has correct href.
 *
 * @param page - Playwright page
 * @param selector - CSS selector for the link
 * @param expectedHref - Expected href value
 * @param expectedText - Optional expected text content
 */
export async function assertInternalLink(
  page: Page,
  selector: string,
  expectedHref: string,
  expectedText?: string | RegExp,
): Promise<void> {
  const locator = page.locator(selector).first();

  await expect(locator).toBeVisible({timeout: TIMEOUTS.element});
  await expect(locator).toHaveAttribute("href", expectedHref);

  if (expectedText) {
    const pattern = typeof expectedText === "string" ? new RegExp(expectedText, "iu") : expectedText;
    await expect(locator).toHaveText(pattern);
  }
}

/**
 * Assert that an external link has correct attributes.
 *
 * @param page - Playwright page
 * @param selector - CSS selector for the link
 * @param expectedHref - Expected href value
 */
export async function assertExternalLink(page: Page, selector: string, expectedHref: string): Promise<void> {
  const locator = page.locator(selector).first();

  await expect(locator).toBeVisible({timeout: TIMEOUTS.element});
  await expect(locator).toHaveAttribute("href", expectedHref);
  await expect(locator).toHaveAttribute("target", "_blank");
}

/**
 * Assert that an element contains specific text.
 *
 * @param locator - Element locator
 * @param text - Expected text (string or regex)
 */
export async function assertContainsText(locator: Locator, text: string | RegExp): Promise<void> {
  await expect(locator).toBeVisible({timeout: TIMEOUTS.element});
  await expect(locator).toContainText(text);
}

/**
 * Assert that an element is visible and not empty.
 *
 * @param locator - Element locator
 */
export async function assertVisibleAndNotEmpty(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible({timeout: TIMEOUTS.element});
  await expect(locator).not.toBeEmpty();
}

/**
 * Assert element count is within range.
 *
 * @param locator - Element locator
 * @param min - Minimum count (inclusive)
 * @param max - Optional maximum count (inclusive)
 */
export async function assertElementCount(locator: Locator, min: number, max?: number): Promise<void> {
  const count = await locator.count();
  expect(count).toBeGreaterThanOrEqual(min);

  if (max !== undefined) {
    expect(count).toBeLessThanOrEqual(max);
  }
}

/**
 * Assert that an image is loaded and visible.
 *
 * @param locator - Image element locator
 */
export async function assertImageLoaded(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible({timeout: TIMEOUTS.element});

  // Check that the image has loaded
  const isLoaded = await locator.evaluate((img: HTMLImageElement) => {
    return img.complete && img.naturalWidth > 0;
  });

  expect(isLoaded).toBe(true);
}

/**
 * Assert that URL matches expected pattern.
 *
 * @param page - Playwright page
 * @param pattern - URL pattern (string or regex)
 */
export async function assertUrlMatches(page: Page, pattern: string | RegExp): Promise<void> {
  if (typeof pattern === "string") {
    expect(page.url()).toContain(pattern);
  } else {
    expect(page.url()).toMatch(pattern);
  }
}

/**
 * Assert page title matches expected value.
 *
 * @param page - Playwright page
 * @param title - Expected title (string or regex)
 */
export async function assertPageTitle(page: Page, title: string | RegExp): Promise<void> {
  await expect(page).toHaveTitle(title);
}

/**
 * Assert that a form field has an error state.
 *
 * @param locator - Form field locator
 * @param errorMessage - Optional expected error message
 */
export async function assertFieldError(locator: Locator, errorMessage?: string | RegExp): Promise<void> {
  // Check for aria-invalid attribute
  await expect(locator).toHaveAttribute("aria-invalid", "true");

  if (errorMessage) {
    // Look for associated error message
    const errorId = await locator.getAttribute("aria-describedby");
    if (errorId) {
      const errorElement = locator.page().locator(`#${errorId}`);
      await expect(errorElement).toContainText(errorMessage);
    }
  }
}

/**
 * Assert that a form field is valid.
 *
 * @param locator - Form field locator
 */
export async function assertFieldValid(locator: Locator): Promise<void> {
  const ariaInvalid = await locator.getAttribute("aria-invalid");
  expect(ariaInvalid).not.toBe("true");
}

/**
 * Assert that an element has focus.
 *
 * @param locator - Element locator
 */
export async function assertHasFocus(locator: Locator): Promise<void> {
  await expect(locator).toBeFocused();
}

/**
 * Assert CSS property value.
 *
 * @param locator - Element locator
 * @param property - CSS property name
 * @param expectedValue - Expected value (or array of acceptable values)
 */
export async function assertCssProperty(locator: Locator, property: string, expectedValue: string | string[]): Promise<void> {
  const actualValue = await locator.evaluate((el, prop) => globalThis.getComputedStyle(el).getPropertyValue(prop), property);

  if (Array.isArray(expectedValue)) {
    expect(expectedValue).toContain(actualValue);
  } else {
    expect(actualValue).toBe(expectedValue);
  }
}

/**
 * Assert element position (sticky, fixed, etc.).
 *
 * @param locator - Element locator
 * @param validPositions - Array of acceptable position values
 */
export async function assertPosition(
  locator: Locator,
  validPositions: string[] = ["sticky", "fixed", "relative", "absolute", "static"],
): Promise<void> {
  const position = await locator.evaluate((el) => globalThis.getComputedStyle(el).position);
  expect(validPositions).toContain(position);
}

/**
 * Assert that no console errors occurred.
 *
 * @param page - Playwright page
 * @param ignorePatterns - Patterns to ignore in error messages
 */
export async function assertNoConsoleErrors(page: Page, ignorePatterns: RegExp[] = []): Promise<void> {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      const shouldIgnore = ignorePatterns.some((pattern) => pattern.test(text));
      if (!shouldIgnore) {
        errors.push(text);
      }
    }
  });

  // Give time for errors to be collected
  await page.waitForTimeout(100);

  expect(errors, `Console errors found: ${errors.join(", ")}`).toHaveLength(0);
}

/**
 * Assert viewport dimensions.
 *
 * @param page - Playwright page
 * @param width - Expected width
 * @param height - Expected height
 */
export async function assertViewport(page: Page, width: number, height: number): Promise<void> {
  const viewportSize = page.viewportSize();
  expect(viewportSize?.width).toBe(width);
  expect(viewportSize?.height).toBe(height);
}

/* eslint-enable no-magic-numbers */
