import {expect, test} from "@playwright/test";

const routes = [
  // Index page:
  "/",

  // About routes:
  "/about",
  "/about/the-author",
  "/about/the-platform",

  // Auth routes:
  "/auth",
  "/auth/sign-in",
  "/auth/sign-up",

  // Domain routes:
  "/domains",
  "/domains/invoices",
  "/domains/invoices/upload-scans",
  "/domains/invoices/view-scans",
  "/domains/invoices/view-invoices",

  // TOS & Privacy routes:
  "/acknowledgements",
  "/privacy-policy",
  "/terms-of-service",
];

test.describe("Routing tests", () => {
  // Warm up the server by loading the index page before running route tests
  test.beforeAll(async ({browser}) => {
    const page = await browser.newPage();
    try {
      // Wait for the index page to ensure server is ready
      await page.goto("/", {waitUntil: "domcontentloaded", timeout: 60000});
      // Give the server time to warm up
      await page.waitForTimeout(2000);
    } finally {
      await page.close();
    }
  });

  for (const route of routes) {
    test(`should navigate to ${route} and return 200`, async ({page}) => {
      // Retry navigation up to 5 times to handle server warmup issues in CI
      // Next.js dev server compiles pages on-demand, which can cause initial 500 errors
      const maxAttempts = 5;
      let lastError: Error | null = null;
      let response = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          response = await page.goto(route, {waitUntil: "domcontentloaded", timeout: 45000});
          const status = response?.status();

          // Accept 200 or retry on 5xx errors (server warmup/compilation)
          if (status === 200) {
            break;
          } else if (status && status >= 500) {
            // Server error - wait longer between retries (exponential backoff)
            const waitTime = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s, 32s
            await page.waitForTimeout(waitTime);
            continue;
          }
        } catch (error) {
          lastError = error as Error;
          const waitTime = 2000 * Math.pow(2, attempt);
          await page.waitForTimeout(waitTime);
        }
      }

      expect(response, `Navigation response should exist for ${route}`).not.toBeNull();
      expect(response?.status(), lastError?.message ?? `Route ${route} should return 200`).toBe(200);
    });
  }
});
