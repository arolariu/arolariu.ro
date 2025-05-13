/** @format */

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
  "/domains/invoices/create-invoice",
  "/domains/invoices/view-invoices",

  // TOS & Privacy routes:
  "/acknowledgements",
  "/privacy-policy",
  "/terms-of-service",
];

test.describe("Routing tests", () => {
  for (const route of routes) {
    test(`should navigate to ${route} and return 200`, async ({page}) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
    });
  }
});
