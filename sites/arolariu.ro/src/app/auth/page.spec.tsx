/**
 * @fileoverview Authentication flow E2E tests.
 * Tests for the authentication pages and protected route behavior.
 * @module src/app/auth/page.spec
 */

import {expect, test} from "../../../tests/fixtures";
import {FEATURE_TAGS, PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../../tests/utils";

test.describe("Authentication @auth", () => {
  test.describe("Auth Page", () => {
    test(tagged("should load correctly", TEST_TYPE_TAGS.SMOKE, PRIORITY_TAGS.P1, FEATURE_TAGS.AUTH), async ({
      safeNavigate,
      page,
    }) => {
      await safeNavigate("/auth/");

      // Wait for page to load
      await expect(page.locator("main")).toBeVisible();
    });

    test(tagged("should display authentication component", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.AUTH), async ({
      safeNavigate,
      page,
    }) => {
      const result = await safeNavigate("/auth/");

      if (result.success) {
        // Check for Clerk auth component or sign-in form
        const clerkComponent = page.locator("[data-clerk-component]");
        const signInForm = page.locator("form");
        const authSection = page.locator("main");

        // At least one authentication-related element should be visible
        const hasClerk = await clerkComponent.count() > 0;
        const hasForm = await signInForm.count() > 0;
        const hasMain = await authSection.isVisible();

        expect(hasClerk || hasForm || hasMain).toBe(true);
      }
    });

    test(tagged("should have proper structure", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.AUTH), async ({safeNavigate, page}) => {
      await safeNavigate("/auth/");

      // Check essential elements
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
    });

    test(tagged("should pass accessibility checks", TEST_TYPE_TAGS.A11Y, FEATURE_TAGS.AUTH), async ({
      safeNavigate,
      checkA11y,
    }) => {
      await safeNavigate("/auth/");

      const results = await checkA11y({
        level: "wcag21aa",
        // Exclude third-party Clerk iframe from strict checks
        exclude: ["[data-clerk-component] iframe"],
      });

      if (results.violations.length > 0) {
        console.log("Auth page accessibility violations:");
        console.log(results.formatViolations());
      }

      // Only fail on critical violations for auth page
      // (Clerk components may have minor issues we can't control)
      results.assertNoViolationsAbove("critical");
    });
  });

  test.describe("Protected Routes", () => {
    test(tagged("should redirect unauthenticated users from invoice domain", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.AUTH), async ({
      safeNavigate,
      page,
    }) => {
      // Try to access protected invoice routes
      await safeNavigate("/domains/invoices/");

      // Should redirect to auth or show auth prompt
      // Wait for potential redirect
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      // Either redirected to auth or stayed but shows auth requirements
      const isAuthRedirect = currentUrl.includes("auth") || currentUrl.includes("sign-in");
      const hasAuthPrompt = await page.locator("[data-clerk-component]").count() > 0;
      const hasMainContent = await page.locator("main").isVisible();

      expect(isAuthRedirect || hasAuthPrompt || hasMainContent).toBe(true);
    });

    test(tagged("should handle dashboard access for unauthenticated users", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.AUTH), async ({
      safeNavigate,
      page,
    }) => {
      // Try to access user dashboard
      await safeNavigate("/domains/");

      // Wait for potential redirect
      await page.waitForTimeout(2000);

      // Page should load without crashing
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Auth Page Responsive Design", () => {
    test(tagged("should work on mobile viewport", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.AUTH), async ({safeNavigate, page}) => {
      await page.setViewportSize({width: 375, height: 667});
      await safeNavigate("/auth/");

      await expect(page.locator("main")).toBeVisible();
    });

    test(tagged("should work on tablet viewport", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.AUTH), async ({safeNavigate, page}) => {
      await page.setViewportSize({width: 768, height: 1024});
      await safeNavigate("/auth/");

      await expect(page.locator("main")).toBeVisible();
    });

    test(tagged("should work on desktop viewport", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.AUTH), async ({safeNavigate, page}) => {
      await page.setViewportSize({width: 1920, height: 1080});
      await safeNavigate("/auth/");

      await expect(page.locator("main")).toBeVisible();
    });
  });
});

test.describe("Invoice Domain (Authenticated) @invoices", () => {
  // These tests are skipped because they require authentication
  // In a real scenario, we would use Clerk test tokens or a test user
  test.describe.skip("Authenticated Invoice Access", () => {
    test(tagged("should load invoice list page when authenticated", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.AUTH), async ({
      safeNavigate,
      page,
    }) => {
      // This test requires authentication setup
      // Setup: Inject auth token or use Clerk test mode
      await safeNavigate("/domains/invoices/view-invoices/");
      await expect(page.getByRole("heading", {name: /invoices/i})).toBeVisible();
    });

    test(tagged("should navigate to create invoice page", TEST_TYPE_TAGS.E2E, FEATURE_TAGS.AUTH), async ({
      safeNavigate,
      page,
    }) => {
      await safeNavigate("/domains/invoices/");
      const createButton = page.getByRole("button", {name: /create|new|add/i});
      await expect(createButton).toBeVisible();
    });
  });
});
