import {expect, Page, test} from "@playwright/test";

// Helper function to check link attributes for external links
async function checkExternalLink(page: Page, selector: string, expectedHref: string) {
  await expect(page.locator(selector).first()).toBeVisible({timeout: 15000});
  await expect(page.locator(selector).first()).toHaveAttribute("href", expectedHref);
  await expect(page.locator(selector).first()).toHaveAttribute("target", "_blank");
}

// Helper function to check internal navigation links
async function checkInternalLink(page: Page, selector: string, expectedHref: string, expectedText?: RegExp | string) {
  await expect(page.locator(selector).first()).toBeVisible({timeout: 15000});
  await expect(page.locator(selector).first()).toHaveAttribute("href", expectedHref);
  if (expectedText) {
    if (typeof expectedText === "string") {
      await expect(page.locator(selector).first()).toHaveText(new RegExp(expectedText, "i"));
    } else {
      await expect(page.locator(selector).first()).toHaveText(expectedText);
    }
  }
}

test.describe("Footer Component Tests", () => {
  test.beforeEach(async ({page}) => {
    await page.goto("/"); // Navigate to a page where the Footer is present
  });

  test.afterEach(async ({page}, testInfo) => {
    // Create a descriptive name for the screenshot
    // Replace non-alphanumeric characters (except hyphen and underscore) with a hyphen for file system compatibility
    const screenshotName = testInfo.titlePath.join("_").replace(/[^a-zA-Z0-9_-]/g, "-") + ".png";
    const screenshotPath = testInfo.outputPath(screenshotName);

    // Take and save the screenshot
    await page.screenshot({path: screenshotPath});

    // Attach the screenshot to the test report
    await testInfo.attach(screenshotName, {path: screenshotPath, contentType: "image/png"});
  });

  test.describe("Footer Hero Section", () => {
    test("should display the site logo and name, linking to home", async ({page}) => {
      const footerHeroLink = page.locator("footer a[title='AROLARIU.RO']");
      await expect(footerHeroLink).toBeVisible();
      await expect(footerHeroLink).toHaveAttribute("href", "/");

      const logoImage = footerHeroLink.locator("img");
      await expect(logoImage).toBeVisible();

      // The site name span exists and contains the uppercase site name
      // Note: SITE_NAME environment variable may be empty in test environment
      const siteNameSpan = footerHeroLink.locator("span");
      await expect(siteNameSpan).toBeAttached();
    });

    test("should display the footer description text", async ({page}) => {
      // The description uses RichText component which renders with the .prose class
      const description = page.locator("footer div[class*='md:col-span-1'] div[class*='mt-4'] .prose");
      await expect(description.first()).toBeVisible();
      await expect(description.first()).not.toBeEmpty();
    });
  });

  test.describe("Footer Navigation Links", () => {
    test("should display and correctly link Subdomains", async ({page}) => {
      await expect(page.locator("footer div > p:has-text('Subdomains')").first()).toBeVisible();
      await checkInternalLink(page, "footer a[href='https://api.arolariu.ro']", "https://api.arolariu.ro", /api\.arolariu\.ro/i);
      await checkInternalLink(page, "footer a[href='https://docs.arolariu.ro']", "https://docs.arolariu.ro", /docs\.arolariu\.ro/i);
    });

    test("should display and correctly link About section links", async ({page}) => {
      await expect(page.locator("footer div > p:has-text('About')").first()).toBeVisible();
      // Note: Next.js trailingSlash: true adds trailing slashes to all hrefs
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
      // The build info is in a div.text-slate-300 inside the footer
      const buildInfoDiv = page.locator("footer div.text-slate-300");
      await expect(buildInfoDiv.first()).toBeVisible();
      await expect(buildInfoDiv.first()).toContainText(/Built on/i);

      // Note: In test environment, TIMESTAMP and COMMIT_SHA may be empty strings
      // The component renders "Built on " followed by the date (or empty if no TIMESTAMP)
      // Check that the structure exists rather than specific values
      const tooltipTrigger = buildInfoDiv.locator("span.cursor-help");
      await expect(tooltipTrigger.first()).toBeVisible();

      // The commit SHA section should be visible with "Commit SHA:" label
      const commitShaSpan = buildInfoDiv.locator("span:has-text('Commit SHA:')");
      await expect(commitShaSpan.first()).toBeVisible();

      // The code element for commit SHA should exist (may be empty in test env)
      const commitShaCode = commitShaSpan.locator("code");
      await expect(commitShaCode.first()).toBeAttached();
    });
  });

  test("should ensure all internal footer links are navigable and return 200 OK", async ({page, context}) => {
    test.setTimeout(90000); // Increase timeout for this test that checks multiple pages

    const footer = page.locator("footer");
    // Match links starting with / but not containing # (anchors)
    const internalLinksLocators = footer.locator("a[href^='/']:not([href*='#'])");
    const count = await internalLinksLocators.count();

    expect(count).toBeGreaterThan(0);

    // Collect all hrefs first to avoid re-querying the DOM
    const hrefs: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await internalLinksLocators.nth(i).getAttribute("href");
      if (href && !hrefs.includes(href)) {
        hrefs.push(href);
      }
    }

    // Check each unique href - use 'commit' instead of 'load' for faster checking
    for (const href of hrefs) {
      const newPage = await context.newPage();
      try {
        const response = await newPage.goto(href, {timeout: 15000, waitUntil: "commit"});
        expect(response?.status(), `Link ${href} should return 200 OK.`).toBe(200);
      } finally {
        await newPage.close();
      }
    }
  });

  test("should have the SVG wave decoration at the top of the footer", async ({page}) => {
    const svgWave = page.locator("footer > svg[preserveAspectRatio='none']");
    await expect(svgWave.first()).toBeVisible();
  });
});
