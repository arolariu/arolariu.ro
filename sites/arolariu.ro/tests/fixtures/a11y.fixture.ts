/**
 * @fileoverview Accessibility testing fixtures using axe-core.
 * Provides easy-to-use a11y checking capabilities for tests.
 * @module tests/fixtures/a11y
 *
 * @remarks
 * Requires @axe-core/playwright package:
 * npm install -D @axe-core/playwright
 */

import type {Page} from "@playwright/test";

import {loggers} from "../utils/logger";
import {baseTest} from "./base.fixture";

const log = loggers.a11y;

/* eslint-disable no-magic-numbers -- Test utilities use explicit numeric values */

/**
 * WCAG conformance levels.
 */
export type WCAGLevel = "wcag2a" | "wcag2aa" | "wcag2aaa" | "wcag21a" | "wcag21aa" | "wcag21aaa" | "wcag22aa";

/**
 * Accessibility violation severity.
 */
export type ViolationImpact = "minor" | "moderate" | "serious" | "critical";

/**
 * Individual accessibility violation.
 */
export interface A11yViolation {
  /** Rule ID (e.g., "color-contrast") */
  id: string;
  /** Human-readable description */
  description: string;
  /** Help text for fixing */
  help: string;
  /** URL to more information */
  helpUrl: string;
  /** Severity of the violation */
  impact: ViolationImpact;
  /** Tags (WCAG criteria) */
  tags: string[];
  /** Affected elements */
  nodes: A11yViolationNode[];
}

/**
 * Element affected by a violation.
 */
export interface A11yViolationNode {
  /** HTML snippet of the element */
  html: string;
  /** CSS selector path to element */
  target: string[];
  /** Failure summary */
  failureSummary: string;
}

/**
 * Options for accessibility checks.
 */
export interface A11yCheckOptions {
  /** Only scan these selectors */
  include?: string[];
  /** Exclude these selectors from scan */
  exclude?: string[];
  /** Only include these rule IDs */
  rules?: string[];
  /** Disable specific rules */
  disableRules?: string[];
  /** WCAG conformance level */
  level?: WCAGLevel;
  /** Minimum impact level to report */
  minImpact?: ViolationImpact;
}

/**
 * Result of an accessibility check.
 */
export interface A11yResult {
  /** List of violations found */
  violations: A11yViolation[];
  /** Number of passing rules */
  passes: number;
  /** Number of incomplete checks (need manual review) */
  incomplete: number;
  /** Number of inapplicable rules */
  inapplicable: number;
  /** URL that was checked */
  url: string;
  /** Timestamp of the check */
  timestamp: string;

  /**
   * Assert that no violations were found.
   * Throws an error with detailed violation info if any exist.
   */
  assertNoViolations: () => void;

  /**
   * Assert no violations above a certain impact level.
   */
  assertNoViolationsAbove: (impact: ViolationImpact) => void;

  /**
   * Get violations formatted for logging.
   */
  formatViolations: () => string;
}

/** Impact level ordering for comparison */
const IMPACT_ORDER: Record<ViolationImpact, number> = {
  minor: 1,
  moderate: 2,
  serious: 3,
  critical: 4,
};

/**
 * Format violations into a readable string.
 */
function formatViolationsForOutput(violations: A11yViolation[]): string {
  if (violations.length === 0) {
    return "No accessibility violations found.";
  }

  const lines: string[] = [`Found ${violations.length} accessibility violation(s):`, ""];

  for (const violation of violations) {
    lines.push(`[${violation.impact.toUpperCase()}] ${violation.id}`);
    lines.push(`  Description: ${violation.description}`);
    lines.push(`  Help: ${violation.help}`);
    lines.push(`  Info: ${violation.helpUrl}`);
    lines.push(`  Affected elements (${violation.nodes.length}):`);

    for (const node of violation.nodes.slice(0, 3)) {
      // Limit to 3 examples
      lines.push(`    - ${node.target.join(" > ")}`);
      lines.push(`      ${node.html.slice(0, 100)}${node.html.length > 100 ? "..." : ""}`);
    }

    if (violation.nodes.length > 3) {
      lines.push(`    ... and ${violation.nodes.length - 3} more elements`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Create an A11yResult object from raw axe results.
 */
function createA11yResult(violations: A11yViolation[], passes: number, incomplete: number, inapplicable: number, url: string): A11yResult {
  return {
    violations,
    passes,
    incomplete,
    inapplicable,
    url,
    timestamp: new Date().toISOString(),

    assertNoViolations() {
      if (violations.length > 0) {
        throw new Error(`Accessibility violations found:\n${formatViolationsForOutput(violations)}`);
      }
    },

    assertNoViolationsAbove(impact: ViolationImpact) {
      const threshold = IMPACT_ORDER[impact];
      const serious = violations.filter((v) => IMPACT_ORDER[v.impact] >= threshold);
      if (serious.length > 0) {
        throw new Error(
          `Found ${serious.length} accessibility violation(s) at or above '${impact}' level:\n${formatViolationsForOutput(serious)}`,
        );
      }
    },

    formatViolations() {
      return formatViolationsForOutput(violations);
    },
  };
}

/**
 * Run accessibility check using browser-injected axe-core.
 * This approach doesn't require @axe-core/playwright package.
 */
async function runA11yCheck(page: Page, options: A11yCheckOptions = {}): Promise<A11yResult> {
  const startTime = performance.now();
  const url = page.url();
  log.debug(`Starting a11y check on ${url}`, {
    include: options.include,
    exclude: options.exclude,
    level: options.level,
  });

  // Inject axe-core from CDN if not already present
  const axeInjected = await page.evaluate(() => {
    return typeof (globalThis as unknown as {axe?: unknown}).axe !== "undefined";
  });

  if (!axeInjected) {
    log.debug("Injecting axe-core from CDN");
    await page.addScriptTag({
      url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js",
    });
    // Wait for axe to be available
    await page.waitForFunction(() => typeof (globalThis as unknown as {axe?: unknown}).axe !== "undefined", {timeout: 10000});
    log.debug("axe-core injected successfully");
  }

  // Build axe configuration
  const axeConfig = {
    include: options.include,
    exclude: options.exclude,
    rules: options.rules?.reduce(
      (acc, rule) => {
        acc[rule] = {enabled: true};
        return acc;
      },
      {} as Record<string, {enabled: boolean}>,
    ),
    disableRules: options.disableRules,
    tags: options.level ? [options.level] : undefined,
  };

  // Run axe analysis
  interface AxeResults {
    violations: A11yViolation[];
    passes: {id: string}[];
    incomplete: {id: string}[];
    inapplicable: {id: string}[];
    url: string;
  }

  const results = await page.evaluate((config) => {
    interface AxeRunOptions {
      include?: string[];
      exclude?: string[];
      rules?: Record<string, {enabled: boolean}>;
      runOnly?: {type: string; values: string[]};
    }

    const runOptions: AxeRunOptions = {};

    if (config.include) {
      runOptions.include = config.include;
    }
    if (config.exclude) {
      runOptions.exclude = config.exclude;
    }
    if (config.rules) {
      runOptions.rules = config.rules;
    }
    if (config.tags) {
      runOptions.runOnly = {type: "tag", values: config.tags};
    }

    return (globalThis as unknown as {axe: {run: (options: AxeRunOptions) => Promise<AxeResults>}}).axe.run(runOptions);
  }, axeConfig);

  // Filter by minimum impact if specified
  let violations = results.violations as A11yViolation[];
  if (options.minImpact) {
    const threshold = IMPACT_ORDER[options.minImpact];
    const originalCount = violations.length;
    violations = violations.filter((v) => IMPACT_ORDER[v.impact] >= threshold);
    log.debug(`Filtered violations by impact >= ${options.minImpact}`, {
      original: originalCount,
      filtered: violations.length,
    });
  }

  const duration = performance.now() - startTime;

  // Log summary
  if (violations.length === 0) {
    log.debug(`✅ A11y check passed on ${url}`, {
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      durationMs: duration.toFixed(2),
    });
  } else {
    const bySeverity = {
      critical: violations.filter((v) => v.impact === "critical").length,
      serious: violations.filter((v) => v.impact === "serious").length,
      moderate: violations.filter((v) => v.impact === "moderate").length,
      minor: violations.filter((v) => v.impact === "minor").length,
    };
    log.warn(`⚠️  A11y violations found on ${url}`, {
      total: violations.length,
      ...bySeverity,
      durationMs: duration.toFixed(2),
    });
  }

  return createA11yResult(violations, results.passes.length, results.incomplete.length, results.inapplicable.length, results.url);
}

/**
 * Accessibility fixture types.
 */
export interface A11yFixtures {
  /**
   * Run accessibility check on current page.
   */
  checkA11y: (options?: A11yCheckOptions) => Promise<A11yResult>;

  /**
   * Run accessibility check on a specific element.
   */
  checkElementA11y: (selector: string, options?: Omit<A11yCheckOptions, "include">) => Promise<A11yResult>;

  /**
   * Quick check that asserts no violations.
   * Throws immediately if violations found.
   */
  assertAccessible: (options?: A11yCheckOptions) => Promise<void>;
}

/**
 * Accessibility test fixture.
 *
 * @example
 * ```typescript
 * import { test } from '../fixtures';
 *
 * test('page should be accessible @a11y', async ({ page, checkA11y }) => {
 *   await page.goto('/');
 *   const result = await checkA11y();
 *   result.assertNoViolations();
 * });
 * ```
 */
export const a11yTest = baseTest.extend<A11yFixtures>({
  /**
   * Check page accessibility.
   */
  checkA11y: async ({page}, use) => {
    await use(async (options?: A11yCheckOptions) => {
      return runA11yCheck(page, options);
    });
  },

  /**
   * Check element accessibility.
   */
  checkElementA11y: async ({page}, use) => {
    await use(async (selector: string, options?: Omit<A11yCheckOptions, "include">) => {
      return runA11yCheck(page, {...options, include: [selector]});
    });
  },

  /**
   * Assert page is accessible (throws on violations).
   */
  assertAccessible: async ({page}, use) => {
    await use(async (options?: A11yCheckOptions) => {
      const result = await runA11yCheck(page, options);
      result.assertNoViolations();
    });
  },
});

/**
 * Common rules to disable for specific scenarios.
 */
export const A11Y_RULE_SETS = {
  /** Rules that often have false positives */
  relaxed: ["color-contrast", "link-in-text-block"],

  /** Minimum viable accessibility */
  critical: ["document-title", "html-has-lang", "image-alt", "link-name", "button-name"],

  /** Full WCAG 2.1 AA compliance */
  wcag21aa: [] as string[], // Empty = all rules
} as const;

/* eslint-enable no-magic-numbers */
