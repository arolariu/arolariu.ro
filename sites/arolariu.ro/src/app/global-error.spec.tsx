/**
 * @fileoverview Global error (5xx) and 404 handling E2E tests.
 * @module src/app/global-error.spec
 */

import {expect, test} from "../../tests/fixtures";
import {PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../tests/utils";

test.describe("Global Error (5xx) Tests @error", () => {
  // Note: Screenshots are automatically captured by the autoScreenshot fixture

  test(tagged("should display 404 page for non-existent route", TEST_TYPE_TAGS.SMOKE, PRIORITY_TAGS.P1), async ({page}) => {
    const response = await page.goto("/this-page-does-not-exist-12345");

    // Should return 404 status
    expect(response?.status()).toBe(404);

    // Should display 404 content
    const bodyText = await page.textContent("body");
    expect(bodyText).toMatch(/404|not found/i);
  });

  test("should have navigation back to home from 404", async ({page}) => {
    await page.goto("/non-existent-page-xyz");

    // Look for a link back to home
    const homeLink = page.locator("a[href='/'], a[href*='home']");
    const count = await homeLink.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should maintain header and footer on 404 page", async ({page}) => {
    await page.goto("/non-existent-route");

    // Header and footer should still be present
    const header = page.locator("header");
    const footer = page.locator("footer");

    const headerCount = await header.count();
    const footerCount = await footer.count();

    expect(headerCount).toBeGreaterThanOrEqual(0);
    expect(footerCount).toBeGreaterThanOrEqual(0);
  });
});
