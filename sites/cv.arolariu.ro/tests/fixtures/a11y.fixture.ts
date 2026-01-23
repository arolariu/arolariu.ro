/**
 * @fileoverview Accessibility testing fixtures using axe-core.
 * Provides accessibility checking capabilities for CV platform E2E tests.
 * @module tests/fixtures/a11y.fixture
 */

import {test as base, expect, Page} from "@playwright/test";

// CDN URL for axe-core
const AXE_CDN_URL = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js";

/**
 * Violation severity levels.
 */
type ViolationImpact = "minor" | "moderate" | "serious" | "critical";

/**
 * Accessibility violation node.
 */
interface A11yViolationNode {
  html: string;
  target: string[];
}

/**
 * Accessibility violation.
 */
interface A11yViolation {
  id: string;
  impact: ViolationImpact;
  description: string;
  help: string;
  helpUrl: string;
  nodes: A11yViolationNode[];
}

/**
 * Result of an accessibility check.
 */
interface A11yResult {
  violations: A11yViolation[];
  passes: Array<{id: string}>;
  assertNoViolations: () => void;
  assertNoViolationsAbove: (level: ViolationImpact) => void;
  formatViolations: () => string;
}

/**
 * Options for accessibility checks.
 */
interface A11yCheckOptions {
  runOnly?: string[] | {type: "rule" | "tag"; values: string[]};
  exclude?: string[][];
}

/** Impact level ordering for comparison */
const IMPACT_ORDER: Record<ViolationImpact, number> = {
  minor: 1,
  moderate: 2,
  serious: 3,
  critical: 4,
};

/**
 * A11y fixtures.
 */
interface A11yFixtures {
  checkA11y: (page: Page, options?: A11yCheckOptions) => Promise<A11yResult>;
}

/**
 * Test fixture with accessibility support.
 */
export const test = base.extend<A11yFixtures>({
  checkA11y: async ({}, use) => {
    const checkA11y = async (page: Page, options?: A11yCheckOptions): Promise<A11yResult> => {
      // Check if axe is already loaded
      const axeInjected = await page.evaluate(() => {
        return typeof (globalThis as unknown as {axe?: unknown}).axe !== "undefined";
      });

      // Inject axe-core if not present
      if (!axeInjected) {
        await page.addScriptTag({url: AXE_CDN_URL});
        await page.waitForFunction(() => typeof (globalThis as unknown as {axe?: unknown}).axe !== "undefined", {timeout: 10000});
      }

      // Run axe analysis
      interface AxeResults {
        violations: A11yViolation[];
        passes: Array<{id: string}>;
        incomplete: Array<{id: string}>;
        inapplicable: Array<{id: string}>;
      }

      const results = await page.evaluate((opts) => {
        interface AxeRunOptions {
          runOnly?: string[] | {type: "rule" | "tag"; values: string[]};
          exclude?: string[][];
        }

        const runOptions: AxeRunOptions = {};

        if (opts?.runOnly) {
          runOptions.runOnly = opts.runOnly;
        }
        if (opts?.exclude) {
          runOptions.exclude = opts.exclude;
        }

        return (globalThis as unknown as {axe: {run: (options: AxeRunOptions) => Promise<AxeResults>}}).axe.run(runOptions);
      }, options);

      return {
        violations: results.violations,
        passes: results.passes,
        assertNoViolations: () => {
          if (results.violations.length > 0) {
            const formatted = results.violations.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join("\n");
            throw new Error(`Found ${results.violations.length} accessibility violations:\n${formatted}`);
          }
        },
        assertNoViolationsAbove: (level: ViolationImpact) => {
          const threshold = IMPACT_ORDER[level];
          const severe = results.violations.filter((v) => IMPACT_ORDER[v.impact] >= threshold);
          if (severe.length > 0) {
            const formatted = severe.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join("\n");
            throw new Error(`Found ${severe.length} ${level}+ accessibility violations:\n${formatted}`);
          }
        },
        formatViolations: () => {
          return results.violations.map((v) => `[${v.impact}] ${v.id}: ${v.description}`).join("\n");
        },
      };
    };

    await use(checkA11y);
  },
});

export {expect};
