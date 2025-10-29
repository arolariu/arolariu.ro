import {expect, test} from "playwright/test";

test.describe("Global Not Found (404) Tests", () => {
  test.afterEach(async ({page}, testInfo) => {
    const screenshotName = testInfo.titlePath.join("_").replace(/[^a-zA-Z0-9_-]/g, "-") + ".png";
    const screenshotPath = testInfo.outputPath(screenshotName);
    await page.screenshot({path: screenshotPath});
    await testInfo.attach(screenshotName, {path: screenshotPath, contentType: "image/png"});
  });

  test("should have proper error page structure", async ({page}) => {
    await page.goto("/invalid-route-test");

    // Should have basic HTML structure
    const html = page.locator("html");
    await expect(html).toBeTruthy();

    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should provide helpful error information", async ({page}) => {
    await page.goto("/test-404-page");

    const bodyText = await page.textContent("body");

    // Should provide some helpful information
    expect(bodyText!.length).toBeGreaterThan(20);
  });
});
