/** @format */

import {expect, Page, test} from "@playwright/test";

// Helper function to check link attributes for external links
async function checkExternalLink(page: Page, selector: string, expectedHref: string) {
  const link = page.locator(selector);
  await expect(link.first()).toBeVisible();
  await expect(link.first()).toHaveAttribute("href", expectedHref);
  await expect(link.first()).toHaveAttribute("target", "_blank");
}

// Helper function to check internal navigation links
async function checkInternalLink(page: Page, selector: string, expectedHref: string, expectedText?: RegExp | string) {
  const link = page.locator(selector);
  await expect(link.first()).toBeVisible();
  await expect(link.first()).toHaveAttribute("href", expectedHref);
  if (expectedText) {
    if (typeof expectedText === "string") {
      await expect(link.first()).toHaveText(new RegExp(expectedText, "i"));
    } else {
      await expect(link.first()).toHaveText(expectedText);
    }
  }
}

test.describe("Footer Component Tests", () => {
  test.beforeEach(async ({page}) => {
    await page.goto("/"); // Navigate to a page where the Footer is present
  });

  test.describe("Footer Hero Section", () => {
    test("should display the site logo and name, linking to home", async ({page}) => {
      const footerHeroLink = page.locator("footer a[title='AROLARIU.RO']");
      await expect(footerHeroLink).toBeVisible();
      await expect(footerHeroLink).toHaveAttribute("href", "/");

      const logoImage = footerHeroLink.locator("img");
      await expect(logoImage).toBeVisible();

      const siteNameSpan = footerHeroLink.locator("span");
      await expect(siteNameSpan).toBeVisible();
    });

    test("should display the footer description text", async ({page}) => {
      const description = page.locator("footer div[class*='md:col-span-1'] div[class*='mt-4'] p.prose");
      await expect(description.first()).toBeVisible();
      await expect(description.first()).not.toBeEmpty();
    });
  });

  test.describe("Footer Navigation Links", () => {
    test("should display and correctly link Subdomains", async ({page}) => {
      await expect(page.locator("footer div > p:has-text('Subdomains')").first()).toBeVisible();
      await checkInternalLink(page, "footer a[href='https://dev.arolariu.ro']", "https://dev.arolariu.ro", /dev\.arolariu\.ro/i);
      await checkInternalLink(page, "footer a[href='https://api.arolariu.ro']", "https://api.arolariu.ro", /api\.arolariu\.ro/i);
      await checkInternalLink(page, "footer a[href='https://docs.arolariu.ro']", "https://docs.arolariu.ro", /docs\.arolariu\.ro/i);
    });

    test("should display and correctly link About section links", async ({page}) => {
      await expect(page.locator("footer div > p:has-text('About')").first()).toBeVisible();
      await checkInternalLink(page, "footer a[href='/about/']", "/about/");
      await checkInternalLink(page, "footer a[href='/acknowledgements/']", "/acknowledgements/");
      await checkInternalLink(page, "footer a[href='/terms-of-service/']", "/terms-of-service/");
      await checkInternalLink(page, "footer a[href='/privacy-policy/']", "/privacy-policy/");
    });
  });

  test.describe("Footer Metadata and Social Links", () => {
    test("should display copyright information with current year", async ({page}) => {
      const currentYear = new Date().getFullYear();
      const copyrightText = page.locator(`footer p:has-text('Alexandru-Razvan Olariu')`);
      await expect(copyrightText.first()).toBeVisible();
      await expect(copyrightText.first()).toContainText(`2022-${currentYear} Alexandru-Razvan Olariu`);
    });

    test("should have a link to the source code repository with correct attributes", async ({page}) => {
      await checkExternalLink(
        page,
        "footer a[href='https://github.com/arolariu/arolariu.ro/']",
        "https://github.com/arolariu/arolariu.ro/",
      );
    });

    test("should have links to the author's social profiles with correct attributes and icons", async ({page}) => {
      await checkExternalLink(page, "footer a[href='https://github.com/arolariu']", "https://github.com/arolariu");
      await expect(page.locator("footer a[href='https://github.com/arolariu'] svg").first()).toBeVisible();

      await checkExternalLink(
        page,
        "footer a[href='https://linkedin.com/in/olariu-alexandru']",
        "https://linkedin.com/in/olariu-alexandru",
      );
      await expect(page.locator("footer a[href='https://linkedin.com/in/olariu-alexandru'] svg").first()).toBeVisible();
    });

    test("should display build information including date and commit SHA", async ({page}) => {
      const buildInfoParagraph = page.locator("footer div.mx-auto > p.text-slate-300");
      await expect(buildInfoParagraph.first()).toBeVisible();
      await expect(buildInfoParagraph.first()).toContainText(/Built on/i);

      const buildDateCode = buildInfoParagraph.locator("code[data-tip]");
      await expect(buildDateCode.first()).toBeVisible();
      await expect(buildDateCode.first()).toHaveText(/\d{4}-\d{2}-\d{2}/);
      await expect(buildDateCode.first()).toHaveAttribute("data-tip", /\w{3} \w{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT[+-]\d{4} \(.*\)/i);

      const commitShaSpan = buildInfoParagraph.locator("span:has-text('Commit SHA:')");
      await expect(commitShaSpan.first()).toBeVisible();
      const commitShaCode = commitShaSpan.locator("code");
      await expect(commitShaCode.first()).toBeVisible();
      await expect(commitShaCode.first()).toHaveText(/[a-f0-9]{7,40}/i);
    });
  });

  test("should ensure all internal footer links are navigable and return 200 OK", async ({page, context}) => {
    const footer = page.locator("footer");
    const internalLinksLocators = footer.locator("a[href^='/']:not([href*='#'])");
    const count = await internalLinksLocators.count();

    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const linkLocator = internalLinksLocators.nth(i);
      const href = await linkLocator.getAttribute("href");
      if (href) {
        const newPage = await context.newPage();
        try {
          const response = await newPage.goto(href);
          expect(response?.status(), `Link ${href} should return 200 OK.`).toBe(200);
        } finally {
          await newPage.close();
        }
      }
    }
  });

  test("should have the SVG wave decoration at the top of the footer", async ({page}) => {
    const svgWave = page.locator("footer > svg[preserveAspectRatio='none']");
    await expect(svgWave.first()).toBeVisible();
  });
});
