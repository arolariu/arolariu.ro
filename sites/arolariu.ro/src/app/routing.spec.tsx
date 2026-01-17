import {expect, test} from "@playwright/test";
import {getNavigationOptions, navigateWithRetry} from "../../tests/playwright-helpers";

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
      const options = getNavigationOptions();
      const result = await navigateWithRetry(page, route, options);

      expect(result.response, `Navigation response should exist for ${route}`).not.toBeNull();
      expect(result.status, `Route ${route} should return 200 (got ${result.status} after ${result.attempts} attempts)`).toBe(200);
    });
  }
});
