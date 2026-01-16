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
  for (const route of routes) {
    test(`should navigate to ${route} and return 200`, async ({page}) => {
      // Retry navigation up to 3 times to handle server warmup issues in CI
      let lastError: Error | null = null;
      let response = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await page.goto(route, {waitUntil: "commit", timeout: 30000});
          const status = response?.status();

          // Accept 200 or retry on 5xx errors (server warmup)
          if (status === 200) {
            break;
          } else if (status && status >= 500) {
            // Server error - wait and retry
            await page.waitForTimeout(1000 * (attempt + 1));
            continue;
          }
        } catch (error) {
          lastError = error as Error;
          await page.waitForTimeout(1000 * (attempt + 1));
        }
      }

      expect(response, `Navigation response should exist for ${route}`).not.toBeNull();
      expect(response?.status(), lastError?.message ?? `Route ${route} should return 200`).toBe(200);
    });
  }
});
