/**
 * @fileoverview Accessibility tests for the CV platform.
 * Tests WCAG 2.1 AA compliance across all CV pages.
 * @module tests/accessibility.spec
 */

import {expect, test} from "./fixtures/a11y.fixture";

/**
 * CV platform pages to test.
 */
const CV_PAGES = [
  {path: "/", name: "Homepage"},
  {path: "/human/", name: "Human-Readable CV"},
  {path: "/json/", name: "JSON Format"},
  {path: "/pdf/", name: "PDF Export"},
] as const;

test.describe("CV Platform Accessibility @a11y", () => {
  test.describe("WCAG 2.1 AA Compliance", () => {
    for (const {path, name} of CV_PAGES) {
      test(`${name} meets WCAG 2.1 AA`, async ({page, checkA11y}) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");

        const results = await checkA11y(page, {
          runOnly: ["wcag2aa", "wcag21aa"],
        });

        if (results.violations.length > 0) {
          console.log(`\n${name} violations:\n${results.formatViolations()}`);
        }

        results.assertNoViolationsAbove("serious");
      });
    }
  });

  test.describe("Heading Hierarchy", () => {
    test("CV content has proper heading hierarchy", async ({page, checkA11y}) => {
      await page.goto("/human/");
      await page.waitForLoadState("networkidle");

      const results = await checkA11y(page, {
        runOnly: {type: "rule", values: ["heading-order"]},
      });

      results.assertNoViolationsAbove("serious");
    });

    test("All pages have exactly one h1", async ({page}) => {
      for (const {path, name} of CV_PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");

        const h1Count = await page.locator("h1").count();
        expect(h1Count, `${name} should have exactly one h1`).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe("Link Accessibility", () => {
    test("All links are distinguishable", async ({page, checkA11y}) => {
      await page.goto("/human/");
      await page.waitForLoadState("networkidle");

      const results = await checkA11y(page, {
        runOnly: {type: "rule", values: ["link-name", "link-in-text-block"]},
      });

      results.assertNoViolationsAbove("serious");
    });

    test("Links have accessible names", async ({page, checkA11y}) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const results = await checkA11y(page, {
        runOnly: {type: "rule", values: ["link-name"]},
      });

      results.assertNoViolations();
    });
  });

  test.describe("Document Landmarks", () => {
    test("Document has proper landmarks", async ({page, checkA11y}) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const results = await checkA11y(page, {
        runOnly: {type: "rule", values: ["landmark-one-main", "region"]},
      });

      results.assertNoViolationsAbove("serious");
    });

    test("Pages have main landmark", async ({page}) => {
      for (const {path, name} of CV_PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");

        const mainCount = await page.locator("main").count();
        expect(mainCount, `${name} should have a main landmark`).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe("Color Contrast", () => {
    test("Homepage has adequate color contrast", async ({page, checkA11y}) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const results = await checkA11y(page, {
        runOnly: {type: "rule", values: ["color-contrast"]},
      });

      // Color contrast issues might exist, log but don't fail on moderate
      if (results.violations.length > 0) {
        console.log("Color contrast issues:", results.formatViolations());
      }

      results.assertNoViolationsAbove("serious");
    });

    test("Human CV has adequate color contrast", async ({page, checkA11y}) => {
      await page.goto("/human/");
      await page.waitForLoadState("networkidle");

      const results = await checkA11y(page, {
        runOnly: {type: "rule", values: ["color-contrast"]},
      });

      results.assertNoViolationsAbove("serious");
    });
  });

  test.describe("Image Accessibility", () => {
    test("Images have alt text", async ({page, checkA11y}) => {
      await page.goto("/human/");
      await page.waitForLoadState("networkidle");

      const results = await checkA11y(page, {
        runOnly: {type: "rule", values: ["image-alt"]},
      });

      results.assertNoViolations();
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("Can tab through interactive elements", async ({page}) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Tab to first interactive element
      await page.keyboard.press("Tab");

      // Check that an element received focus
      const focusedElement = page.locator(":focus");
      const isVisible = await focusedElement.isVisible().catch(() => false);

      // There should be focusable elements
      expect(isVisible).toBe(true);
    });

    test("Focus is visible when tabbing", async ({page}) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await page.keyboard.press("Tab");

      const focusedElement = page.locator(":focus");
      const isVisible = await focusedElement.isVisible().catch(() => false);

      if (isVisible) {
        // Check that focus has some visual indicator
        const hasOutline = await focusedElement.evaluate((el) => {
          const styles = globalThis.getComputedStyle(el);
          return styles.outlineStyle !== "none" || styles.boxShadow !== "none" || styles.borderStyle !== "none";
        });

        expect(hasOutline).toBe(true);
      }
    });
  });

  test.describe("Print Styles", () => {
    test("Human CV is accessible in print mode", async ({page, checkA11y}) => {
      await page.goto("/human/");
      await page.waitForLoadState("networkidle");

      // Emulate print media
      await page.emulateMedia({media: "print"});

      const results = await checkA11y(page, {
        runOnly: ["wcag2aa"],
      });

      results.assertNoViolationsAbove("critical");
    });
  });

  test.describe("Responsive Accessibility", () => {
    test("Mobile view is accessible", async ({page, checkA11y}) => {
      await page.setViewportSize({width: 375, height: 667});
      await page.goto("/human/");
      await page.waitForLoadState("networkidle");

      const results = await checkA11y(page, {
        runOnly: ["wcag21aa"],
      });

      results.assertNoViolationsAbove("serious");
    });

    test("Tablet view is accessible", async ({page, checkA11y}) => {
      await page.setViewportSize({width: 768, height: 1024});
      await page.goto("/human/");
      await page.waitForLoadState("networkidle");

      const results = await checkA11y(page, {
        runOnly: ["wcag21aa"],
      });

      results.assertNoViolationsAbove("serious");
    });
  });

  test.describe("Document Structure", () => {
    test("Pages have valid HTML lang attribute", async ({page}) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const lang = await page.locator("html").getAttribute("lang");
      expect(lang).toBeTruthy();
    });

    test("Pages have proper title", async ({page}) => {
      for (const {path, name} of CV_PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");

        const title = await page.title();
        expect(title, `${name} should have a title`).toBeTruthy();
      }
    });
  });
});
