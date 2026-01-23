/**
 * @fileoverview Legal pages E2E tests.
 * Tests for privacy policy, terms of service, and acknowledgements pages.
 * @module src/app/(privacy-and-terms)/legal.spec
 */

import {expect, test} from "../../../tests/fixtures";
import {PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../../tests/utils";

const LEGAL_PAGES = [
  {path: "/privacy-policy/", name: "Privacy Policy"},
  {path: "/terms-of-service/", name: "Terms of Service"},
  {path: "/acknowledgements/", name: "Acknowledgements"},
] as const;

test.describe("Legal Pages @legal", () => {
  test.describe("Page Load Tests", () => {
    for (const {path, name} of LEGAL_PAGES) {
      test(tagged(`${name} page should load correctly`, TEST_TYPE_TAGS.SMOKE), async ({safeNavigate, page}) => {
        await safeNavigate(path);

        await expect(page.locator("main")).toBeVisible();
        await expect(page.locator("h1")).toBeVisible();
      });
    }
  });

  test.describe("Content Structure", () => {
    for (const {path, name} of LEGAL_PAGES) {
      test(tagged(`${name} should have proper structure`, TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
        await safeNavigate(path);

        // Check essential elements
        await expect(page.locator("header")).toBeVisible();
        await expect(page.locator("main")).toBeVisible();
        await expect(page.locator("footer")).toBeVisible();

        // Check for heading
        const h1 = page.locator("h1");
        await expect(h1).toBeVisible();
        const title = await h1.textContent();
        expect(title).toBeTruthy();
      });
    }

    for (const {path, name} of LEGAL_PAGES) {
      test(tagged(`${name} should have readable content`, TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
        await safeNavigate(path);

        // Check for substantial content
        const main = page.locator("main");
        const content = await main.textContent();
        expect(content).toBeTruthy();
        // Legal pages should have substantial content (at least 100 characters)
        expect(content!.length).toBeGreaterThan(100);
      });
    }
  });

  test.describe("Accessibility Tests @a11y", () => {
    for (const {path, name} of LEGAL_PAGES) {
      test(tagged(`${name} should be accessible`, TEST_TYPE_TAGS.A11Y, PRIORITY_TAGS.P2), async ({
        safeNavigate,
        checkA11y,
      }) => {
        await safeNavigate(path);

        const results = await checkA11y({
          level: "wcag21aa",
        });

        if (results.violations.length > 0) {
          console.log(`${name} accessibility violations:`);
          console.log(results.formatViolations());
        }

        results.assertNoViolationsAbove("serious");
      });
    }

    test(tagged("legal pages should have proper heading hierarchy", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, page}) => {
      for (const {path} of LEGAL_PAGES) {
        await safeNavigate(path);

        // Check that there's exactly one h1 element
        const h1Count = await page.locator("h1").count();
        expect(h1Count).toBe(1);
      }
    });

    test(tagged("legal pages should have accessible links", TEST_TYPE_TAGS.A11Y), async ({safeNavigate, checkA11y}) => {
      for (const {path} of LEGAL_PAGES) {
        await safeNavigate(path);

        const results = await checkA11y({
          rules: ["link-name"],
        });

        results.assertNoViolations();
      }
    });
  });

  test.describe("Navigation", () => {
    test(tagged("should be able to navigate from footer links", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await safeNavigate("/");

      // Check if privacy policy link exists in footer
      const privacyLink = page.locator("footer").getByRole("link", {name: /privacy/i}).first();
      if (await privacyLink.isVisible({timeout: 3000})) {
        await privacyLink.click();
        await expect(page).toHaveURL(/privacy-policy/);
      }
    });

    test(tagged("should be able to navigate between legal pages", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await safeNavigate("/privacy-policy/");

      // Try to find terms of service link
      const termsLink = page.getByRole("link", {name: /terms/i}).first();
      if (await termsLink.isVisible({timeout: 3000})) {
        await termsLink.click();
        await expect(page).toHaveURL(/terms-of-service/);
      }
    });
  });

  test.describe("Responsive Design", () => {
    test(tagged("privacy policy should work on mobile", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await page.setViewportSize({width: 375, height: 667});
      await safeNavigate("/privacy-policy/");

      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1")).toBeVisible();
    });

    test(tagged("terms of service should work on mobile", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await page.setViewportSize({width: 375, height: 667});
      await safeNavigate("/terms-of-service/");

      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1")).toBeVisible();
    });

    test(tagged("legal pages should work on desktop", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await page.setViewportSize({width: 1920, height: 1080});

      for (const {path} of LEGAL_PAGES) {
        await safeNavigate(path);
        await expect(page.locator("main")).toBeVisible();
      }
    });
  });

  test.describe("Print Styles", () => {
    test(tagged("privacy policy should be printable", TEST_TYPE_TAGS.E2E), async ({safeNavigate, page}) => {
      await safeNavigate("/privacy-policy/");

      // Emulate print media
      await page.emulateMedia({media: "print"});

      // Content should still be visible in print mode
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1")).toBeVisible();
    });
  });
});
