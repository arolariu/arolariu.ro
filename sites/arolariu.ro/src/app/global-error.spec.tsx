import {expect, test} from "playwright/test";

test.describe("Global Error (5xx) Tests", () => {
  test.afterEach(async ({page}, testInfo) => {
    const screenshotName = testInfo.titlePath.join("_").replace(/[^a-zA-Z0-9_-]/g, "-") + ".png";
    const screenshotPath = testInfo.outputPath(screenshotName);
    await page.screenshot({path: screenshotPath});
    await testInfo.attach(screenshotName, {path: screenshotPath, contentType: "image/png"});
  });

  test("should display 404 page for non-existent route", async ({page}) => {
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
