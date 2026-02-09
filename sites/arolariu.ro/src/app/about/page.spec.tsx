/**
 * @fileoverview About section E2E tests.
 * Tests for all about-related pages.
 * @module src/app/about/page.spec
 */

import {expect, test} from "../../../tests/fixtures";
import {PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../../tests/utils";

test.describe("About Section @about", () => {
  test.describe("Main About Page", () => {
    test(tagged("should load correctly", TEST_TYPE_TAGS.SMOKE, PRIORITY_TAGS.P1), async ({safeNavigate, page}) => {
      await safeNavigate("/about/");

      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByRole("heading", {level: 1})).toBeVisible();
    });

    test(tagged("should have proper structure", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await safeNavigate("/about/");

      // Check essential elements
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
    });

    test(tagged("should pass accessibility checks", TEST_TYPE_TAGS.A11Y, PRIORITY_TAGS.P1), async ({safeNavigate, checkA11y}) => {
      await safeNavigate("/about/");

      const results = await checkA11y({
        level: "wcag21aa",
      });

      if (results.violations.length > 0) {
        console.log("About page accessibility violations:");
        console.log(results.formatViolations());
      }

      results.assertNoViolationsAbove("serious");
    });
  });

  test.describe("The Author Page", () => {
    test(tagged("should load correctly", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await safeNavigate("/about/the-author/");

      await expect(page.locator("main")).toBeVisible();
    });

    test(tagged("should display author information", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await safeNavigate("/about/the-author/");

      // Check for content presence
      const main = page.locator("main");
      const content = await main.textContent();
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(0);
    });

    test(tagged("should pass accessibility checks", TEST_TYPE_TAGS.A11Y, PRIORITY_TAGS.P2), async ({safeNavigate, checkA11y}) => {
      await safeNavigate("/about/the-author/");

      const results = await checkA11y({
        level: "wcag21aa",
      });

      results.assertNoViolationsAbove("serious");
    });
  });

  test.describe("The Platform Page", () => {
    test(tagged("should load correctly", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await safeNavigate("/about/the-platform/");

      await expect(page.locator("main")).toBeVisible();
    });

    test(tagged("should display platform information", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await safeNavigate("/about/the-platform/");

      // Check for content presence
      const main = page.locator("main");
      const content = await main.textContent();
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(0);
    });

    test(tagged("should pass accessibility checks", TEST_TYPE_TAGS.A11Y, PRIORITY_TAGS.P2), async ({safeNavigate, checkA11y}) => {
      await safeNavigate("/about/the-platform/");

      const results = await checkA11y({
        level: "wcag21aa",
      });

      results.assertNoViolationsAbove("serious");
    });
  });

  test.describe("About Pages Navigation", () => {
    test(tagged("should navigate between about subpages", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await safeNavigate("/about/");

      // Try to find and click on author link if present
      const authorLink = page.getByRole("link", {name: /author/i}).first();
      if (await authorLink.isVisible({timeout: 3000})) {
        await authorLink.click();
        await expect(page).toHaveURL(/the-author/);
      }
    });

    test(tagged("should have consistent layout across about pages", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      const aboutPages = ["/about/", "/about/the-author/", "/about/the-platform/"];

      for (const pagePath of aboutPages) {
        await safeNavigate(pagePath);

        // Verify consistent structure
        await expect(page.locator("header")).toBeVisible();
        await expect(page.locator("main")).toBeVisible();
        await expect(page.locator("footer")).toBeVisible();
      }
    });
  });

  test.describe("About Pages Responsive Design", () => {
    test(tagged("should work on mobile viewport", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await page.setViewportSize({width: 375, height: 667});
      await safeNavigate("/about/");

      await expect(page.locator("main")).toBeVisible();
    });

    test(tagged("should work on desktop viewport", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await page.setViewportSize({width: 1920, height: 1080});
      await safeNavigate("/about/");

      await expect(page.locator("main")).toBeVisible();
    });
  });
});
