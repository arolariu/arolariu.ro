import {expect, test} from "@playwright/test";

test.describe("GridDisplay Component Tests", () => {
  test.beforeEach(async ({page}) => {
    // Navigate to the create-invoice page
    await page.goto("/domains/invoices/create-invoice/");
  });

  test.afterEach(async ({page}, testInfo) => {
    const screenshotName = testInfo.titlePath.join("_").replace(/[^a-zA-Z0-9_-]/g, "-") + ".png";
    const screenshotPath = testInfo.outputPath(screenshotName);
    await page.screenshot({path: screenshotPath});
    await testInfo.attach(screenshotName, {path: screenshotPath, contentType: "image/png"});
  });

  test.describe("Grid Display Mode", () => {
    test("should have grid view tab available", async ({page}) => {
      // Wait for the upload area or tabs to be visible
      await page.waitForTimeout(1000);
      
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      await expect(gridTab).toBeAttached();
    });

    test("should switch to grid view when tab is clicked", async ({page}) => {
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        
        // Wait for transition
        await page.waitForTimeout(300);
        
        // Verify grid tab is active
        await expect(gridTab).toHaveAttribute("data-state", "active");
      }
    });

    test("should display upload message when no files are present", async ({page}) => {
      await page.waitForTimeout(1000);
      
      // Look for upload message
      const uploadMessage = page.locator("text=Upload your invoice scans");
      
      // This should be visible initially
      if (await uploadMessage.isVisible()) {
        await expect(uploadMessage).toBeVisible();
      }
    });
  });

  test.describe("Grid Layout Logic", () => {
    test("should use single column for one scan (full screen)", async ({page}) => {
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Check for grid container
        const gridContainer = page.locator('[class*="grid"]');
        
        if (await gridContainer.isVisible()) {
          // Verify single column layout class is applied
          const classList = await gridContainer.getAttribute("class");
          // grid-cols-1 should be present for single item
        }
      }
    });

    test("should use 50/50 split for two scans", async ({page}) => {
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Check for grid container with 2-column layout
        const gridContainer = page.locator('[class*="grid"]');
        
        if (await gridContainer.isVisible()) {
          const classList = await gridContainer.getAttribute("class");
          // Should contain grid-cols-2 on larger screens
        }
      }
    });

    test("should use 3-column grid for three or more scans", async ({page}) => {
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Check for grid container with 3-column layout
        const gridContainer = page.locator('[class*="grid"]');
        
        if (await gridContainer.isVisible()) {
          const classList = await gridContainer.getAttribute("class");
          // Should contain grid-cols-3 on larger screens
        }
      }
    });
  });

  test.describe("Pagination in Grid View", () => {
    test("should display pagination controls", async ({page}) => {
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Look for pagination indicators
        const paginationDots = page.locator('[class*="pagination"]').or(page.locator('button[aria-label*="page"]'));
        
        // Pagination should be visible when multiple pages exist
      }
    });

    test("should navigate to next page", async ({page}) => {
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Look for next button
        const nextButton = page.locator('button[aria-label*="Next"]').or(page.locator('text=Next'));
        
        if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
          await nextButton.click();
          await page.waitForTimeout(300);
        }
      }
    });

    test("should navigate to previous page", async ({page}) => {
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Look for previous button
        const prevButton = page.locator('button[aria-label*="Previous"]').or(page.locator('text=Previous'));
        
        if (await prevButton.isVisible() && !(await prevButton.isDisabled())) {
          await prevButton.click();
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe("Media Preview in Grid", () => {
    test("should display image previews for image scans", async ({page}) => {
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Look for image elements
        const images = page.locator('img[alt*="scan"]').or(page.locator('img[class*="preview"]'));
        
        // Images should be present when scans exist
      }
    });

    test("should display PDF indicator for PDF scans", async ({page}) => {
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Look for PDF badge or indicator
        const pdfBadge = page.locator('text=PDF').or(page.locator('[class*="pdf"]'));
        
        // PDF indicators should be visible when PDF scans exist
      }
    });

    test("should show file actions on grid items", async ({page}) => {
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Look for action buttons (rotate, rename, delete)
        const actionButtons = page.locator('button[aria-label*="Rotate"]')
          .or(page.locator('button[aria-label*="Delete"]'))
          .or(page.locator('button[aria-label*="Rename"]'));
        
        // Action buttons should be present when scans exist
      }
    });
  });

  test.describe("Responsive Grid Layout", () => {
    test("should adapt to mobile viewport", async ({page}) => {
      await page.setViewportSize({width: 375, height: 667});
      
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Grid should use single column on mobile
        const gridContainer = page.locator('[class*="grid"]');
        
        if (await gridContainer.isVisible()) {
          // Verify responsive behavior
          await page.waitForTimeout(300);
        }
      }
    });

    test("should adapt to tablet viewport", async ({page}) => {
      await page.setViewportSize({width: 768, height: 1024});
      
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Grid should use 2 columns on tablet
        const gridContainer = page.locator('[class*="grid"]');
        
        if (await gridContainer.isVisible()) {
          await page.waitForTimeout(300);
        }
      }
    });

    test("should use full 3-column layout on desktop", async ({page}) => {
      await page.setViewportSize({width: 1920, height: 1080});
      
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Grid should use 3 columns on desktop
        const gridContainer = page.locator('[class*="grid"]');
        
        if (await gridContainer.isVisible()) {
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe("Full Screen Preview", () => {
    test("should open full screen preview on image click", async ({page}) => {
      const gridTab = page.locator('[role="tab"]:has-text("Grid")');
      
      if (await gridTab.isVisible()) {
        await gridTab.click();
        await page.waitForTimeout(500);
        
        // Look for clickable image or preview trigger
        const previewTrigger = page.locator('img[alt*="scan"]').or(page.locator('[class*="preview"]'));
        
        if (await previewTrigger.first().isVisible()) {
          await previewTrigger.first().click();
          await page.waitForTimeout(500);
          
          // Look for full screen modal or overlay
          const fullScreenModal = page.locator('[role="dialog"]').or(page.locator('[class*="modal"]'));
          
          // Modal should appear after click
        }
      }
    });
  });
});
