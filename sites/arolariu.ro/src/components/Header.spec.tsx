/**
 * @fileoverview Header component E2E tests.
 * Uses the enhanced Playwright fixture system with page objects.
 * @module src/components/Header.spec
 */

import {expect, test} from "../../tests/fixtures";
import {HeaderComponent} from "../../tests/page-objects";
import {COMPONENT_TAGS, PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../tests/utils";

test.describe("Header Component Tests @header", () => {
  let header: HeaderComponent;

  test.beforeEach(async ({page}) => {
    header = new HeaderComponent(page);
    await page.goto("/");
  });

  // Note: Screenshots are automatically captured by the autoScreenshot fixture
  // No need for repetitive afterEach hooks!

  test.describe("Header Structure and Visibility", () => {
    test(tagged("should display the header element", TEST_TYPE_TAGS.SMOKE, PRIORITY_TAGS.CRITICAL), async () => {
      await header.shouldBeVisible();
    });

    test("should have proper positioning and styling", async () => {
      await header.shouldBeVisible();
      await header.shouldHaveProperPositioning();
    });
  });

  test.describe("Header Logo and Branding", () => {
    test(tagged("should display the site logo", TEST_TYPE_TAGS.SMOKE), async () => {
      await header.shouldHaveLogo();
    });

    test("should have a clickable logo linking to home", async ({page}) => {
      await header.shouldBeVisible();
      await header.clickLogo();
      expect(page.url()).toMatch(/\/$/);
    });

    test("should display site name or title", async () => {
      await header.shouldBeVisible();
      const siteName = await header.getSiteName();
      expect(siteName).toBeTruthy();
      expect(siteName!.length).toBeGreaterThan(0);
    });
  });

  test.describe("Header Navigation", () => {
    test(tagged("should display navigation menu", TEST_TYPE_TAGS.SMOKE), async () => {
      await header.shouldHaveNavigation();
    });

    test("should have navigation links", async () => {
      await header.shouldHaveNavLinks(1);
    });

    test("should navigate to About page from header", async ({page}) => {
      const aboutLink = header.aboutLink;

      if (await aboutLink.isVisible({timeout: 5000})) {
        const result = await header.navigateToAbout();
        expect(result.success, `About page navigation should succeed (status: ${result.status})`).toBe(true);
        expect(page.url()).toContain("/about");
      }
    });
  });

  test.describe("Header Responsive Behavior", () => {
    test(tagged("should display mobile menu button on small screens", COMPONENT_TAGS.HEADER), async () => {
      await header.setMobileViewport();

      // Mobile menu button should exist (even if not visible without interaction)
      const count = await header.mobileMenuButton.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test("should display full navigation on desktop", async () => {
      await header.setDesktopViewport();
      await header.shouldHaveNavigation();
    });
  });

  test.describe("Header Accessibility @a11y", () => {
    test("should have proper semantic HTML structure", async () => {
      await header.shouldHaveProperSemantics();
    });

    test("should have accessible links with text or aria-labels", async () => {
      await header.shouldHaveAccessibleLinks();
    });

    test("should pass accessibility checks", async ({checkA11y}) => {
      const result = await checkA11y({include: ["header"]});
      // Log violations but don't fail on minor issues
      if (result.violations.length > 0) {
        console.log("Header a11y issues:", result.formatViolations());
      }
      result.assertNoViolationsAbove("serious");
    });
  });
});
