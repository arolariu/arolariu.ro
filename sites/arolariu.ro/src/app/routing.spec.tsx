/**
 * @fileoverview Routing E2E tests.
 * Verifies all main routes return 200 OK.
 * @module src/app/routing.spec
 */

import {expect, test} from "../../tests/fixtures";
import {PRIORITY_TAGS, tagged, TEST_TYPE_TAGS} from "../../tests/utils";

/**
 * All routes to test for accessibility.
 * Add new routes here as they are created.
 */
const ROUTES = [
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
] as const;

/**
 * Critical routes that must work (smoke test subset).
 */
const CRITICAL_ROUTES = ["/", "/about", "/auth", "/domains"] as const;

test.describe("Routing Tests @nav", () => {
  test.describe("All Routes @regression", () => {
    for (const route of ROUTES) {
      test(`should navigate to ${route} and return 200`, async ({safeNavigate}) => {
        const result = await safeNavigate(route);

        expect(result.response, `Navigation response should exist for ${route}`).not.toBeNull();
        expect(result.status, `Route ${route} should return 200 (got ${result.status} after ${result.attempts} attempts)`).toBe(200);
      });
    }
  });

  test.describe("Critical Routes @smoke @critical", () => {
    for (const route of CRITICAL_ROUTES) {
      test(tagged(`should navigate to ${route}`, TEST_TYPE_TAGS.SMOKE, PRIORITY_TAGS.CRITICAL), async ({safeNavigate}) => {
        const result = await safeNavigate(route);

        expect(result.success, `Critical route ${route} should be accessible`).toBe(true);
        expect(result.status).toBe(200);
      });
    }
  });
});
