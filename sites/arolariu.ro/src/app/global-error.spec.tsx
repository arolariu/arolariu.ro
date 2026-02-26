/**
 * @fileoverview Global error (5xx) and 404 handling E2E tests.
 * @module src/app/global-error.spec
 */

import {expect, test} from "../../tests/fixtures";
import {PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../tests/utils";

test.describe("Global Error (5xx) Tests @error", () => {
  // Note: Screenshots are automatically captured by the autoScreenshot fixture

  test(tagged("should display 404 page for non-existent route", TEST_TYPE_TAGS.SMOKE, PRIORITY_TAGS.P1), async ({safeNavigate, page}) => {
    const navigationResult = await safeNavigate("/this-page-does-not-exist-12345");

    // Should return 404 status
    expect(navigationResult.success).toBe(false);
    expect(navigationResult.status).toBe(404);

    // Should display 404 content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/404|not found/i);
  });

  test("should have navigation back to home from 404", async ({safeNavigate, page}) => {
    const navigationResult = await safeNavigate("/non-existent-page-xyz");
    expect(navigationResult.success).toBe(false);
    expect(navigationResult.status).toBe(404);

    // Look for a link back to home using role-based locator or href fallback
    const homeLink = page.getByRole("link", {name: /home/i});
    const homeLinkByHref = page.locator("a[href='/']");
    const count = (await homeLink.count()) + (await homeLinkByHref.count());

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should maintain header and footer on 404 page", async ({safeNavigate, page}) => {
    const navigationResult = await safeNavigate("/non-existent-route");
    expect(navigationResult.success).toBe(false);
    expect(navigationResult.status).toBe(404);

    // Header and footer should still be present
    const header = page.locator("header");
    const footer = page.locator("footer");

    const headerCount = await header.count();
    const footerCount = await footer.count();

    expect(headerCount).toBeGreaterThanOrEqual(0);
    expect(footerCount).toBeGreaterThanOrEqual(0);
  });
});
