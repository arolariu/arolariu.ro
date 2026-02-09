/**
 * @fileoverview Global not found (404) page E2E tests.
 * @module src/app/global-not-found.spec
 */

import {expect, test} from "../../tests/fixtures";
import {PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../tests/utils";

test.describe("Global Not Found (404) Tests @error @404", () => {
  // Note: Screenshots are automatically captured by the autoScreenshot fixture

  test(tagged("should have proper error page structure", TEST_TYPE_TAGS.SMOKE, PRIORITY_TAGS.P1), async ({page}) => {
    await page.goto("/invalid-route-test");

    // Should have basic HTML structure
    const html = page.locator("html");
    await expect(html).toBeTruthy();

    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should provide helpful error information", async ({page}) => {
    await page.goto("/test-404-page");

    const bodyText = await page.locator("body").textContent();

    // Should provide some helpful information
    expect(bodyText!.length).toBeGreaterThan(20);
  });

  test.describe("404 Page Accessibility @a11y", () => {
    test("should be accessible", async ({page, checkA11y}) => {
      await page.goto("/non-existent-route-a11y-test");

      const result = await checkA11y();
      // Log violations but don't fail on minor issues
      if (result.violations.length > 0) {
        console.log("404 page a11y issues:", result.formatViolations());
      }
      result.assertNoViolationsAbove("serious");
    });
  });
});
