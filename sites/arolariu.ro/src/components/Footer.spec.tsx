/**
 * @fileoverview Footer component E2E tests.
 * Uses the enhanced Playwright fixture system with page objects.
 * @module src/components/Footer.spec
 */

import {expect, test} from "../../tests/fixtures";
import {FooterComponent} from "../../tests/page-objects";
import {COMPONENT_TAGS, PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../tests/utils";

test.describe("Footer Component Tests @footer", () => {
  let footer: FooterComponent;

  test.beforeEach(async ({page}) => {
    footer = new FooterComponent(page);
    await page.goto("/");
  });

  // Note: Screenshots are automatically captured by the autoScreenshot fixture
  // No need for repetitive afterEach hooks!

  test.describe("Footer Hero Section", () => {
    test(tagged("should display the site logo and name, linking to home", TEST_TYPE_TAGS.SMOKE, PRIORITY_TAGS.CRITICAL), async () => {
      await footer.shouldHaveLogo();
    });

    test("should display the footer description text", async () => {
      await footer.shouldHaveDescription();
    });
  });

  test.describe("Footer Navigation Links", () => {
    test(tagged("should display and correctly link Subdomains", TEST_TYPE_TAGS.SMOKE), async () => {
      await footer.shouldHaveSubdomainsSection();
      await footer.shouldHaveApiLink();
      await footer.shouldHaveDocsLink();
    });

    test("should display and correctly link About section links", async ({page}) => {
      await footer.shouldHaveAboutSection();

      // Check specific about section links via href (locale-independent)
      const footerEl = page.locator("footer");
      await expect(footerEl.locator("a[href='/about/']")).toBeVisible({timeout: 15000});
      await expect(footerEl.locator("a[href='/acknowledgements/']")).toBeVisible({timeout: 15000});
      await expect(footerEl.locator("a[href='/terms-of-service/']")).toBeVisible({timeout: 15000});
      await expect(footerEl.locator("a[href='/privacy-policy/']")).toBeVisible({timeout: 15000});
    });
  });

  test.describe("Footer Metadata and Social Links", () => {
    test(tagged("should display copyright information with current year", TEST_TYPE_TAGS.SMOKE), async () => {
      await footer.shouldHaveCopyright();
    });

    test("should have a link to the source code repository with correct attributes", async () => {
      await footer.shouldHaveGithubRepoLink();
    });

    test("should have links to the author's social profiles with correct attributes and icons", async ({page}) => {
      await footer.shouldHaveSocialLinks();

      // Verify icons are present
      await expect(page.locator("footer a[href='https://github.com/arolariu'] svg").first()).toBeVisible();
      await expect(page.locator("footer a[href='https://linkedin.com/in/olariu-alexandru'] svg").first()).toBeVisible();
    });

    test("should display build information including date and commit SHA", async () => {
      await footer.shouldHaveBuildInfo();
    });
  });

  test(
    tagged("should ensure all internal footer links are navigable and return 200 OK", TEST_TYPE_TAGS.REGRESSION, COMPONENT_TAGS.FOOTER),
    async () => {
      await footer.shouldHaveAllLinksNavigable();
    },
  );

  test("should have the SVG wave decoration at the top of the footer", async () => {
    await footer.shouldHaveSvgWave();
  });

  test.describe("Footer Accessibility @a11y", () => {
    test("should pass accessibility checks", async ({checkA11y}) => {
      await footer.scrollIntoView();

      const result = await checkA11y({include: ["footer"]});
      // Log violations but don't fail on minor issues
      if (result.violations.length > 0) {
        console.log("Footer a11y issues:", result.formatViolations());
      }
      result.assertNoViolationsAbove("serious");
    });
  });
});
