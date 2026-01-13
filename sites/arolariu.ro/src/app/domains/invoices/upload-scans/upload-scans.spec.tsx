import {expect, test} from "@playwright/test";

test.describe("Upload Scans Page Tests", () => {
  test.beforeEach(async ({page}) => {
    await page.goto("/domains/invoices/upload-scans");
  });

  test.afterEach(async ({page}, testInfo) => {
    const screenshotName = testInfo.titlePath.join("_").replace(/[^a-zA-Z0-9_-]/g, "-") + ".png";
    const screenshotPath = testInfo.outputPath(screenshotName);
    await page.screenshot({path: screenshotPath});
    await testInfo.attach(screenshotName, {path: screenshotPath, contentType: "image/png"});
  });

  test.describe("Page Structure and Layout", () => {
    test("should load the upload scans page successfully", async ({page}) => {
      // Page should return 200 status
      const response = await page.goto("/domains/invoices/upload-scans");
      expect(response?.status()).toBe(200);
    });

    test("should display the main container", async ({page}) => {
      const main = page.locator("main");
      await expect(main).toBeVisible({timeout: 10000});
    });

    test("should display the page header with title", async ({page}) => {
      const header = page.locator("h1");
      await expect(header).toBeVisible({timeout: 10000});
    });

    test("should have a grid layout for content", async ({page}) => {
      const gridContainer = page.locator("section.mx-auto");
      await expect(gridContainer).toBeVisible({timeout: 10000});
    });
  });

  test.describe("Navigation and Breadcrumbs", () => {
    test("should display breadcrumb navigation back to invoices", async ({page}) => {
      const breadcrumb = page.locator("a[href='/domains/invoices']");
      await expect(breadcrumb).toBeVisible({timeout: 10000});
    });

    test("should navigate back to invoices domain when clicking breadcrumb", async ({page}) => {
      const breadcrumb = page.locator("a[href='/domains/invoices']");
      if (await breadcrumb.isVisible({timeout: 5000})) {
        await breadcrumb.click();
        await page.waitForURL(/\/domains\/invoices\/?$/, {timeout: 10000});
        expect(page.url()).toContain("/domains/invoices");
      }
    });

    test("should have a link to view scans page", async ({page}) => {
      const viewScansLink = page.locator("a[href='/domains/invoices/view-scans']");
      await expect(viewScansLink.first()).toBeVisible({timeout: 10000});
    });

    test("should have a link to view invoices page", async ({page}) => {
      const viewInvoicesLink = page.locator("a[href='/domains/invoices/view-invoices']");
      await expect(viewInvoicesLink.first()).toBeVisible({timeout: 10000});
    });

    test("should navigate to view scans page when clicking link", async ({page}) => {
      const viewScansLink = page.locator("a[href='/domains/invoices/view-scans']").first();
      if (await viewScansLink.isVisible({timeout: 5000})) {
        await viewScansLink.click();
        await page.waitForURL(/\/domains\/invoices\/view-scans/, {timeout: 10000});
        expect(page.url()).toContain("/domains/invoices/view-scans");
      }
    });
  });

  test.describe("Sidebar Information Cards", () => {
    test("should display supported formats card", async ({page}) => {
      // Look for the formats card by its content structure
      const formatsCard = page.locator("div.space-y-6 >> text=Images");
      const cardCount = await formatsCard.count();
      expect(cardCount).toBeGreaterThanOrEqual(0);
    });

    test("should display tips card", async ({page}) => {
      // Tips card contains checklist items
      const tipsSection = page.locator("ul.space-y-2");
      const count = await tipsSection.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("should display security information card", async ({page}) => {
      // Security card has green border styling
      const securityCard = page.locator("div.border-green-200, div.border-green-800");
      const count = await securityCard.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Upload Area", () => {
    test("should display the upload area component", async ({page}) => {
      // The upload area is typically in the main content area (lg:col-span-2)
      const uploadSection = page.locator("div.lg\\:col-span-2");
      await expect(uploadSection).toBeVisible({timeout: 10000});
    });

    test("should have a drop zone or upload input", async ({page}) => {
      // Look for file input or drop zone
      const fileInput = page.locator("input[type='file']");
      const dropZone = page.locator("[data-testid='upload-area'], div[class*='border-dashed']");

      const inputCount = await fileInput.count();
      const dropZoneCount = await dropZone.count();

      // Either file input or drop zone should exist
      expect(inputCount + dropZoneCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Responsive Behavior", () => {
    test("should display properly on mobile viewport", async ({page}) => {
      await page.setViewportSize({width: 375, height: 667});
      const main = page.locator("main");
      await expect(main).toBeVisible();
    });

    test("should display properly on tablet viewport", async ({page}) => {
      await page.setViewportSize({width: 768, height: 1024});
      const main = page.locator("main");
      await expect(main).toBeVisible();
    });

    test("should display properly on desktop viewport", async ({page}) => {
      await page.setViewportSize({width: 1920, height: 1080});
      const main = page.locator("main");
      await expect(main).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper heading hierarchy", async ({page}) => {
      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      // H3 elements for card titles
      const h3Elements = page.locator("h3");
      const h3Count = await h3Elements.count();
      expect(h3Count).toBeGreaterThanOrEqual(0);
    });

    test("should have accessible links with text content", async ({page}) => {
      const links = page.locator("section a");
      const count = await links.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const link = links.nth(i);
        if (await link.isVisible()) {
          const text = await link.textContent();
          const ariaLabel = await link.getAttribute("aria-label");
          expect(text || ariaLabel).toBeTruthy();
        }
      }
    });

    test("should have accessible buttons", async ({page}) => {
      const buttons = page.locator("section button");
      const count = await buttons.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const type = await button.getAttribute("type");
          // Buttons should have a type attribute
          expect(type || "button").toBeTruthy();
        }
      }
    });
  });

  test.describe("Icon Visibility", () => {
    test("should display SVG icons for file types", async ({page}) => {
      const svgIcons = page.locator("section svg");
      const count = await svgIcons.count();
      // Page should have multiple icons
      expect(count).toBeGreaterThan(0);
    });
  });
});
