/** @format */

import {expect, Page, test} from "@playwright/test";

const DESKTOP_VIEWPORT = {width: 1280, height: 720};
const MOBILE_VIEWPORT = {width: 360, height: 640};

async function checkCommonElements(page: Page) {
  await expect(page.locator("header")).toBeVisible({timeout: 15000});
  await expect(page.locator("header nav.navbar")).toBeVisible({timeout: 15000});

  // Logo and site name link
  const navBar = page.locator("header nav.navbar");
  const homeLink = navBar.locator("a[href='/']").filter({has: page.locator("span:has-text('arolariu.ro')")});
  await expect(homeLink.first()).toBeVisible({timeout: 15000});
  await expect(homeLink.locator("span:has-text('arolariu.ro')").first()).toBeVisible({timeout: 15000});

  // Action buttons
  const navbarEnd = navBar.locator(".navbar-end");

  const authButton = navbarEnd.getByRole("button", {name: /Sign In/i}).first();
  await expect(authButton).toBeVisible({timeout: 15000});

  const themeButton = navbarEnd.getByRole("button", {name: /Toggle theme/i}).first();
  await expect(themeButton).toBeVisible({timeout: 15000});
}

test.describe("Header Component Tests", () => {
  test.beforeEach(async ({page}) => {
    await page.goto("/");
  });

  test.describe("Desktop View (width: 1280px)", () => {
    test.beforeEach(async ({page}) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
    });

    test("should display common elements correctly on desktop", async ({page}) => {
      await checkCommonElements(page);
    });
  });

  test.describe("Mobile View (width: 360px)", () => {
    test.beforeEach(async ({page}) => {
      await page.setViewportSize(MOBILE_VIEWPORT);
    });

    // fixme: this test is skipped because the mobile view is not fully implemented yet
    test.skip("should display common elements correctly on mobile", async ({page}) => {
      await checkCommonElements(page);
    });
  });

  test("navbar should have correct positioning based on viewport", async ({page}) => {
    const navBar = page.locator("header > nav.navbar");

    // Desktop
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.waitForTimeout(250);
    expect(await navBar.evaluate((el) => getComputedStyle(el).position)).toBe("relative");

    // Mobile
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(250);
    expect(await navBar.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
  });

  test("clicking site logo/name navigates to home", async ({page}) => {
    await page.goto("/about"); // Navigate away from home as an example
    await expect(page).not.toHaveURL("/");

    const homeLink = page.locator("nav.navbar a[href='/']").filter({has: page.locator("span:has-text('arolariu.ro')")});
    await homeLink.first().click();
    await expect(page).toHaveURL("/");
  });
});
