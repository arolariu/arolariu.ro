/**
 * @fileoverview ARIA snapshot tests for structural regression detection.
 * Validates landmark and heading structure of critical pages using Playwright's ARIA snapshot matching.
 * @module src/app/aria-snapshots.spec
 */

import {expect, test} from "../../tests/fixtures";
import {PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../tests/utils";

test.describe("ARIA Snapshot Tests @regression @a11y", () => {
  test(tagged("homepage has banner with navigation", TEST_TYPE_TAGS.A11Y, PRIORITY_TAGS.P1), async ({page, safeNavigate}) => {
    await safeNavigate("/");

    // Banner (header) should contain navigation
    const banner = page.getByRole("banner");
    await expect(banner).toBeVisible();

    // Main content should have at least one heading
    const main = page.locator("main");
    await expect(main).toBeVisible();
    const headingCount = await main.getByRole("heading").count();
    expect(headingCount).toBeGreaterThanOrEqual(1);

    // Footer (contentinfo) should have the brand link
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await expect(footer.locator("a[aria-label='Go home']")).toBeVisible();
  });

  test(tagged("about page has correct landmark structure", TEST_TYPE_TAGS.A11Y, PRIORITY_TAGS.P1), async ({page, safeNavigate}) => {
    await safeNavigate("/about/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    // About page should have at least one heading in main
    const headingCount = await page.locator("main").getByRole("heading").count();
    expect(headingCount).toBeGreaterThanOrEqual(1);
  });

  test(tagged("auth page has correct landmark structure", TEST_TYPE_TAGS.A11Y, PRIORITY_TAGS.P1), async ({page, safeNavigate}) => {
    await safeNavigate("/auth/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    // Auth page should have at least one heading
    const headingCount = await page.locator("main").getByRole("heading").count();
    expect(headingCount).toBeGreaterThanOrEqual(1);
  });

  test(tagged("domains page has correct landmark structure", TEST_TYPE_TAGS.A11Y), async ({page, safeNavigate}) => {
    await safeNavigate("/domains/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test(tagged("legal pages have correct landmark structure", TEST_TYPE_TAGS.A11Y), async ({page, safeNavigate}) => {
    const legalPages = ["/privacy-policy/", "/terms-of-service/", "/acknowledgements/"];

    for (const path of legalPages) {
      await safeNavigate(path);

      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
    }
  });
});
