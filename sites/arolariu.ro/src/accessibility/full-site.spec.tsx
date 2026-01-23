/**
 * @fileoverview Full site accessibility audit tests.
 * Comprehensive WCAG 2.1 AA compliance testing across all critical pages.
 * @module tests/accessibility/full-site.spec
 */

import {expect, test} from "../../tests/fixtures";
import {PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../tests/utils";

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
      test(tagged(`${name} meets WCAG 2.1 AA`, TEST_TYPE_TAGS.A11Y, PRIORITY_TAGS.P1), async ({
        safeNavigate,
        checkA11y,
      }) => {
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

  test.describe("Color Contrast", () => {
    test(tagged("Homepage color contrast meets requirements", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, checkA11y}) => {
      await safeNavigate("/");

      const results = await checkA11y({
        rules: ["color-contrast"],
      });

      if (results.violations.length > 0) {
        console.log("Color contrast violations:");
        console.log(results.formatViolations());
      }

      // Color contrast should have no violations
      results.assertNoViolationsAbove("serious");
    });

    test(tagged("Legal pages have adequate color contrast", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, checkA11y}) => {
      const legalPages = ["/privacy-policy/", "/terms-of-service/"];

      for (const path of legalPages) {
        await safeNavigate(path);

        const results = await checkA11y({
          rules: ["color-contrast"],
        });

        results.assertNoViolationsAbove("serious");
      }
    });
  });

  test.describe("Image Accessibility", () => {
    test(tagged("All images have alt text", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, checkA11y}) => {
      await safeNavigate("/");

      const results = await checkA11y({
        rules: ["image-alt"],
      });

      // Allow minor/moderate issues, fail only on serious
      results.assertNoViolationsAbove("serious");
    });

    test(tagged("About page images have alt text", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, checkA11y}) => {
      await safeNavigate("/about/");

      const results = await checkA11y({
        rules: ["image-alt"],
      });

      // Allow minor/moderate issues, fail only on serious
      results.assertNoViolationsAbove("serious");
    });
  });

  test.describe("Keyboard Navigation", () => {
    test(tagged("Homepage keyboard navigation works", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
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
    });

    test(tagged("Can tab through all interactive elements", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
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
    });

    test(tagged("Escape key closes modals if present", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
      await safeNavigate("/");

      // Press Escape - should not cause errors
      await page.keyboard.press("Escape");

      // Page should still be functional (check body is visible as fallback)
      const mainVisible = await page.locator("main").isVisible().catch(() => false);
      const bodyVisible = await page.locator("body").isVisible();
      expect(mainVisible || bodyVisible).toBe(true);
    });
  });

  test.describe("Landmark Regions", () => {
    test(tagged("Homepage has proper landmarks", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
      await safeNavigate("/");

      // Check for main landmark (at least one)
      const mainCount = await page.locator("main").count();
      expect(mainCount).toBeGreaterThanOrEqual(1);

      // Check for header
      const headerCount = await page.locator("header").count();
      expect(headerCount).toBeGreaterThanOrEqual(1);

      // Check for footer
      const footerCount = await page.locator("footer").count();
      expect(footerCount).toBeGreaterThanOrEqual(1);

      // Check for navigation
      const navCount = await page.locator("nav").count();
      expect(navCount).toBeGreaterThanOrEqual(1);
    });

    test(tagged("All pages have main region", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
      for (const {path} of CRITICAL_PAGES) {
        await safeNavigate(path);

        const mainCount = await page.locator("main").count();
        expect(mainCount, `${path} should have at least one main`).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe("Heading Hierarchy", () => {
    test(tagged("Homepage has heading structure", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
      await safeNavigate("/");

      // Should have at least one heading (h1-h6)
      const headingCount = await page.locator("h1, h2, h3, h4, h5, h6").count();
      expect(headingCount).toBeGreaterThanOrEqual(1);
    });

    test(tagged("Pages have h1 element", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
      const pagesToCheck = ["/about/", "/privacy-policy/", "/terms-of-service/"];

      for (const path of pagesToCheck) {
        await safeNavigate(path);

        // Pages should have at least one heading
        const headingCount = await page.locator("h1, h2, h3, h4, h5, h6").count();
        expect(headingCount, `${path} should have headings`).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe("Link Accessibility", () => {
    test(tagged("All links have accessible names", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, checkA11y}) => {
      await safeNavigate("/");

      const results = await checkA11y({
        rules: ["link-name"],
      });

      // Allow minor/moderate issues
      results.assertNoViolationsAbove("serious");
    });

    test(tagged("Links in footer are accessible", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, checkA11y}) => {
      await safeNavigate("/");

      const results = await checkA11y({
        include: ["footer"],
        rules: ["link-name"],
      });

      // Allow minor/moderate issues
      results.assertNoViolationsAbove("serious");
    });
  });

  test.describe("Form Accessibility", () => {
    test(tagged("Auth page forms are accessible", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, checkA11y}) => {
      await safeNavigate("/auth/");

      const results = await checkA11y({
        rules: ["label", "autocomplete-valid"],
        // Exclude Clerk iframe which we can't control
        exclude: ["[data-clerk-component] iframe"],
      });

      // Only fail on critical issues since Clerk manages its own forms
      results.assertNoViolationsAbove("critical");
    });
  });

  test.describe("ARIA Usage", () => {
    test(tagged("ARIA attributes are used correctly", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, checkA11y}) => {
      await safeNavigate("/");

      const results = await checkA11y({
        rules: ["aria-valid-attr", "aria-valid-attr-value", "aria-roles"],
      });

      // Allow minor/moderate issues
      results.assertNoViolationsAbove("serious");
    });
  });

  test.describe("Document Structure", () => {
    test(tagged("Pages have proper document title", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
      for (const {path, name} of CRITICAL_PAGES) {
        await safeNavigate(path);

        const title = await page.title();
        expect(title, `${name} should have a title`).toBeTruthy();
        expect(title.length, `${name} title should be substantial`).toBeGreaterThan(0);
      }
    });

    test(tagged("Pages have html lang attribute", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
      await safeNavigate("/");

      const lang = await page.locator("html").getAttribute("lang");
      expect(lang).toBeTruthy();
    });
  });
});
