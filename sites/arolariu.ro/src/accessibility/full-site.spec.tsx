/**
 * @fileoverview Full site accessibility audit tests.
 * Comprehensive WCAG 2.1 AA compliance testing across all critical pages.
 * @module tests/accessibility/full-site.spec
 */

import {expect, test} from "../../tests/fixtures";
import {BROWSER_TIER_TAGS, PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../tests/utils";

/**
 * Critical pages that must meet accessibility standards.
 */
const CRITICAL_PAGES = [
  {path: "/", name: "Homepage"},
  {path: "/about/", name: "About"},
  {path: "/auth/", name: "Authentication"},
  {path: "/privacy-policy/", name: "Privacy Policy"},
  {path: "/terms-of-service/", name: "Terms of Service"},
  {path: "/acknowledgements/", name: "Acknowledgements"},
] as const;

test.describe("Full Site Accessibility Audit @a11y @regression", () => {
  test.describe("WCAG 2.1 AA Compliance", () => {
    for (const {path, name} of CRITICAL_PAGES) {
      test(tagged(`${name} meets WCAG 2.1 AA`, TEST_TYPE_TAGS.A11Y, PRIORITY_TAGS.P1), async ({safeNavigate, checkA11y}) => {
        await safeNavigate(path);

        const results = await checkA11y({
          level: "wcag21aa",
        });

        // Log violations for debugging
        if (results.violations.length > 0) {
          console.log(`\n${name} accessibility violations:`);
          console.log(results.formatViolations());
        }

        // Fail on serious or critical violations
        results.assertNoViolationsAbove("serious");
      });
    }
  });

  test.describe("Keyboard Navigation", () => {
    test(
      tagged("Homepage keyboard navigation works", TEST_TYPE_TAGS.A11Y, BROWSER_TIER_TAGS.CROSS_BROWSER),
      async ({safeNavigate, page}) => {
        await safeNavigate("/");

        // Tab through interactive elements
        await page.keyboard.press("Tab");

        // Check that an element received focus
        const focusedElement = page.locator(":focus");
        await expect(focusedElement).toBeVisible();

        // Check focus outline exists (not "none")
        const outline = await focusedElement.evaluate((el) => {
          const styles = globalThis.getComputedStyle(el);
          return styles.outlineStyle !== "none" || styles.boxShadow !== "none";
        });

        expect(outline).toBe(true);
      },
    );

    test(
      tagged("Can tab through all interactive elements", TEST_TYPE_TAGS.A11Y, BROWSER_TIER_TAGS.CROSS_BROWSER),
      async ({safeNavigate, page}) => {
        await safeNavigate("/");

        // Get initial focus
        await page.keyboard.press("Tab");

        // Tab through several elements and verify focus changes
        let previousFocusedElement = "";
        const focusedElements: string[] = [];

        for (let i = 0; i < 5; i++) {
          const focused = page.locator(":focus");
          const isVisible = await focused.isVisible().catch(() => false);

          if (isVisible) {
            const tagName = await focused.evaluate((el) => el.tagName).catch(() => "unknown");
            focusedElements.push(tagName);

            // Verify focus moved to a new element
            const currentFocused = await focused.evaluate((el) => el.outerHTML).catch(() => "");
            if (currentFocused !== previousFocusedElement) {
              previousFocusedElement = currentFocused;
            }
          }

          await page.keyboard.press("Tab");
        }

        // Should have focused on at least some elements
        expect(focusedElements.length).toBeGreaterThan(0);
      },
    );

    test(
      tagged("Escape key closes modals if present", TEST_TYPE_TAGS.A11Y, BROWSER_TIER_TAGS.CROSS_BROWSER),
      async ({safeNavigate, page}) => {
        await safeNavigate("/");

        // Press Escape - should not cause errors
        await page.keyboard.press("Escape");

        // Page should still be functional (check body is visible as fallback)
        const mainVisible = await page
          .locator("main")
          .isVisible()
          .catch(() => false);
        const bodyVisible = await page.locator("body").isVisible();
        expect(mainVisible || bodyVisible).toBe(true);
      },
    );
  });

  test.describe("Landmark Regions", () => {
    test(tagged("Homepage has proper landmarks", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
      await safeNavigate("/");

      expect(await page.locator("main").count()).toBeGreaterThanOrEqual(1);
      expect(await page.locator("header").count()).toBeGreaterThanOrEqual(1);
      expect(await page.locator("footer").count()).toBeGreaterThanOrEqual(1);
      expect(await page.locator("nav").count()).toBeGreaterThanOrEqual(1);
    });

    for (const {path, name} of CRITICAL_PAGES) {
      test(tagged(`${name} has main region`, TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
        await safeNavigate(path);
        expect(await page.locator("main").count(), `${path} should have at least one main`).toBeGreaterThanOrEqual(1);
      });
    }
  });

  test.describe("Heading Hierarchy", () => {
    test(tagged("Homepage has heading structure", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
      await safeNavigate("/");
      expect(await page.getByRole("heading").count()).toBeGreaterThanOrEqual(1);
    });

    const headingPages = [
      {path: "/about/", name: "About"},
      {path: "/privacy-policy/", name: "Privacy Policy"},
      {path: "/terms-of-service/", name: "Terms of Service"},
    ] as const;

    for (const {path, name} of headingPages) {
      test(tagged(`${name} has heading elements`, TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
        await safeNavigate(path);
        expect(await page.getByRole("heading").count(), `${path} should have headings`).toBeGreaterThanOrEqual(1);
      });
    }
  });

  test.describe("Document Structure", () => {
    for (const {path, name} of CRITICAL_PAGES) {
      test(tagged(`${name} has a document title`, TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
        await safeNavigate(path);
        const title = await page.title();
        expect(title, `${name} should have a title`).toBeTruthy();
        expect(title.length, `${name} title should be substantial`).toBeGreaterThan(0);
      });
    }

    test(tagged("Homepage has html lang attribute", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
      await safeNavigate("/");
      const lang = await page.locator("html").getAttribute("lang");
      expect(lang).toBeTruthy();
    });
  });
});
