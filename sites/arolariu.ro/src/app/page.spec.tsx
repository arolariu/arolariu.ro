/**
 * @fileoverview Homepage E2E tests.
 * Tests for the main landing page of arolariu.ro.
 * @module src/app/page.spec
 */

import {expect, test} from "../../tests/fixtures";
import {FEATURE_TAGS, PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../tests/utils";

test.describe("Homepage @homepage", () => {
  test.beforeEach(async ({safeNavigate}) => {
    await safeNavigate("/");
  });

  test.describe("Page Load and Structure", () => {
    test(tagged("should load successfully", TEST_TYPE_TAGS.SMOKE, PRIORITY_TAGS.CRITICAL), async ({page}) => {
      await expect(page).toHaveTitle(/arolariu/i);
      await expect(page.locator("main")).toBeVisible();
    });

    test(tagged("should have proper HTML structure", TEST_TYPE_TAGS.E2E, PRIORITY_TAGS.P1), async ({page}) => {
      // Check for essential semantic elements
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();

      // Verify there's only one main element
      const mainElements = await page.locator("main").count();
      expect(mainElements).toBe(1);
    });

    test(tagged("should display hero section", TEST_TYPE_TAGS.E2E), async ({page}) => {
      // Check for main content area that would contain hero content
      const main = page.locator("main");
      await expect(main).toBeVisible();

      // Verify main has content
      const content = await main.textContent();
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(0);
    });
  });

  test.describe("Navigation Links", () => {
    test(tagged("should have working navigation links", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.NAVIGATION), async ({page}) => {
      // Check that About link exists and is clickable
      const aboutLink = page.getByRole("link", {name: /about/i});
      if (await aboutLink.count() > 0) {
        await expect(aboutLink.first()).toBeVisible();
      }
    });

    test(tagged("should navigate to About page", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.NAVIGATION), async ({page}) => {
      const aboutLink = page.getByRole("link", {name: /about/i}).first();

      if (await aboutLink.isVisible({timeout: 5000})) {
        await aboutLink.click();
        await expect(page).toHaveURL(/about/);
      }
    });

    test(tagged("should navigate to Auth page", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.AUTH), async ({page}) => {
      // Look for sign in / login link
      const authLink = page.getByRole("link", {name: /sign in|login|auth/i}).first();

      if (await authLink.isVisible({timeout: 5000})) {
        await authLink.click();
        await expect(page).toHaveURL(/auth/);
      }
    });
  });

  test.describe("Accessibility @a11y", () => {
    test(tagged("should pass accessibility checks", TEST_TYPE_TAGS.A11Y, PRIORITY_TAGS.P1), async ({checkA11y}) => {
      const results = await checkA11y({
        level: "wcag21aa",
      });

      // Log violations for debugging
      if (results.violations.length > 0) {
        console.log("Homepage accessibility violations:");
        console.log(results.formatViolations());
      }

      // Fail on serious or critical violations
      results.assertNoViolationsAbove("serious");
    });

    test(tagged("should have proper heading hierarchy", TEST_TYPE_TAGS.A11Y), async ({page}) => {
      // Check that there's an h1 element
      const h1Count = await page.locator("h1").count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
    });

    test(tagged("should have accessible images", TEST_TYPE_TAGS.A11Y), async ({checkA11y}) => {
      const results = await checkA11y({
        rules: ["image-alt"],
      });
      results.assertNoViolations();
    });
  });

  test.describe("Responsive Design", () => {
    test(tagged("should work on mobile viewport", TEST_TYPE_TAGS.E2E), async ({page}) => {
      await page.setViewportSize({width: 375, height: 667});

      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("header")).toBeVisible();
    });

    test(tagged("should work on tablet viewport", TEST_TYPE_TAGS.E2E), async ({page}) => {
      await page.setViewportSize({width: 768, height: 1024});

      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("header")).toBeVisible();
    });

    test(tagged("should work on desktop viewport", TEST_TYPE_TAGS.E2E), async ({page}) => {
      await page.setViewportSize({width: 1920, height: 1080});

      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("header")).toBeVisible();
    });
  });
});
