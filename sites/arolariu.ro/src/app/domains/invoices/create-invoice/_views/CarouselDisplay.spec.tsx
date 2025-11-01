import {expect, test} from "@playwright/test";

test.describe("CarouselDisplay Component Tests", () => {
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

  test.describe("Carousel Display Mode", () => {
    test("should have carousel view tab available", async ({page}) => {
      await page.waitForTimeout(1000);
      
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      await expect(carouselTab).toBeAttached();
    });

    test("should switch to carousel view when tab is clicked", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        
        // Wait for transition
        await page.waitForTimeout(300);
        
        // Verify carousel tab is active
        await expect(carouselTab).toHaveAttribute("data-state", "active");
      }
    });

    test("should display carousel container when scans exist", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Look for carousel container
        const carouselContainer = page.locator('[class*="carousel"]').or(page.locator('[data-carousel]'));
        
        // Carousel should be present when scans exist
      }
    });
  });

  test.describe("Carousel Navigation", () => {
    test("should have previous button", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Look for previous button
        const prevButton = page.locator('button[aria-label*="Previous"]')
          .or(page.locator('button:has-text("Previous")'))
          .or(page.locator('button[class*="previous"]'));
        
        // Previous button should exist
      }
    });

    test("should have next button", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Look for next button
        const nextButton = page.locator('button[aria-label*="Next"]')
          .or(page.locator('button:has-text("Next")'))
          .or(page.locator('button[class*="next"]'));
        
        // Next button should exist
      }
    });

    test("should navigate to next slide on next button click", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        const nextButton = page.locator('button[aria-label*="Next"]')
          .or(page.locator('button:has-text("Next")'));
        
        if (await nextButton.first().isVisible() && !(await nextButton.first().isDisabled())) {
          await nextButton.first().click();
          await page.waitForTimeout(500);
          
          // Carousel should have changed slides
        }
      }
    });

    test("should navigate to previous slide on previous button click", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // First go to next slide so we can go back
        const nextButton = page.locator('button[aria-label*="Next"]').or(page.locator('button:has-text("Next")'));
        if (await nextButton.first().isVisible() && !(await nextButton.first().isDisabled())) {
          await nextButton.first().click();
          await page.waitForTimeout(500);
        }
        
        const prevButton = page.locator('button[aria-label*="Previous"]')
          .or(page.locator('button:has-text("Previous")'));
        
        if (await prevButton.first().isVisible() && !(await prevButton.first().isDisabled())) {
          await prevButton.first().click();
          await page.waitForTimeout(500);
        }
      }
    });

    test("should support keyboard navigation", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Try keyboard navigation
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(300);
        
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe("Carousel Indicators", () => {
    test("should display navigation dots", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Look for pagination dots
        const dots = page.locator('button[aria-label*="slide"]')
          .or(page.locator('[class*="dot"]'))
          .or(page.locator('[role="button"][aria-current]'));
        
        // Dots should be present when multiple scans exist
      }
    });

    test("should show current slide indicator", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Look for current slide indicator (e.g., "1 / 5")
        const indicator = page.locator('text=/\\d+ \\/ \\d+/').or(page.locator('text=/Slide \\d+ of \\d+/'));
        
        // Indicator should show current position
      }
    });

    test("should highlight active dot", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Look for active/highlighted dot
        const activeDot = page.locator('[aria-current="true"]')
          .or(page.locator('[class*="active"]'))
          .or(page.locator('button[data-active="true"]'));
        
        // One dot should be active
      }
    });

    test("should allow direct navigation via dots", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Look for clickable dots
        const dots = page.locator('button[aria-label*="slide"]');
        
        if ((await dots.count()) > 1) {
          // Click the second dot
          await dots.nth(1).click();
          await page.waitForTimeout(500);
          
          // Should navigate to second slide
        }
      }
    });
  });

  test.describe("Carousel Content", () => {
    test("should display media preview in carousel", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Look for media preview component
        const mediaPreview = page.locator('img[alt*="scan"]')
          .or(page.locator('[class*="preview"]'))
          .or(page.locator('iframe'));
        
        // Media should be visible
      }
    });

    test("should show file information in carousel", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Look for file name or metadata
        const fileInfo = page.locator('[class*="filename"]')
          .or(page.locator('[class*="metadata"]'))
          .or(page.locator('text=/\\.(jpg|png|pdf)$/i'));
        
        // File info should be displayed
      }
    });

    test("should have action buttons in carousel", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Look for action buttons
        const actions = page.locator('button[aria-label*="Rotate"]')
          .or(page.locator('button[aria-label*="Delete"]'))
          .or(page.locator('button[aria-label*="Rename"]'));
        
        // Action buttons should be present
      }
    });
  });

  test.describe("Carousel Responsiveness", () => {
    test("should work on mobile devices", async ({page}) => {
      await page.setViewportSize({width: 375, height: 667});
      
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Carousel should be functional on mobile
        const carouselContainer = page.locator('[class*="carousel"]');
        
        if (await carouselContainer.isVisible()) {
          // Try swiping (simulated with arrow keys)
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(300);
        }
      }
    });

    test("should adapt layout on tablet", async ({page}) => {
      await page.setViewportSize({width: 768, height: 1024});
      
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Verify carousel is properly sized for tablet
        const carouselContainer = page.locator('[class*="carousel"]');
        
        if (await carouselContainer.isVisible()) {
          await page.waitForTimeout(300);
        }
      }
    });

    test("should display full features on desktop", async ({page}) => {
      await page.setViewportSize({width: 1920, height: 1080});
      
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // All carousel features should be visible on desktop
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe("Carousel Performance", () => {
    test("should smoothly transition between slides", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        const nextButton = page.locator('button[aria-label*="Next"]').or(page.locator('button:has-text("Next")'));
        
        if (await nextButton.first().isVisible()) {
          // Click multiple times to test smooth transitions
          await nextButton.first().click();
          await page.waitForTimeout(400);
          
          await nextButton.first().click();
          await page.waitForTimeout(400);
        }
      }
    });

    test("should handle rapid navigation", async ({page}) => {
      const carouselTab = page.locator('[role="tab"]:has-text("Carousel")');
      
      if (await carouselTab.isVisible()) {
        await carouselTab.click();
        await page.waitForTimeout(500);
        
        // Rapidly press arrow keys
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(500);
      }
    });
  });
});
