/**
 * @fileoverview Test tagging system for selective test execution.
 * Tags enable running specific subsets of tests via CLI grep.
 * @module tests/utils/tags
 *
 * @example CLI Usage:
 * ```bash
 * # Run only smoke tests
 * npx playwright test --grep @smoke
 *
 * # Run accessibility tests
 * npx playwright test --grep @a11y
 *
 * # Skip performance tests
 * npx playwright test --grep-invert @perf
 *
 * # Combine filters
 * npx playwright test --grep "@smoke|@critical"
 * ```
 */

/**
 * Test type tags.
 * Categorize tests by their purpose.
 */
export const TEST_TYPE_TAGS = {
  /** Quick critical path tests - run on every PR */
  SMOKE: "@smoke",
  /** Full regression suite - run nightly */
  REGRESSION: "@regression",
  /** Visual comparison tests */
  VISUAL: "@visual",
  /** Accessibility tests using axe-core */
  A11Y: "@a11y",
  /** Performance-focused tests */
  PERF: "@perf",
  /** End-to-end user flow tests */
  E2E: "@e2e",
  /** Integration tests */
  INTEGRATION: "@integration",
} as const;

/**
 * Feature area tags.
 * Categorize tests by the feature they test.
 */
export const FEATURE_TAGS = {
  /** Authentication and authorization */
  AUTH: "@auth",
  /** Navigation and routing */
  NAVIGATION: "@nav",
  /** Form interactions */
  FORMS: "@forms",
  /** API integration */
  API: "@api",
  /** Invoice management */
  INVOICES: "@invoices",
  /** User profile */
  PROFILE: "@profile",
  /** Settings */
  SETTINGS: "@settings",
} as const;

/**
 * Component tags.
 * Categorize tests by UI component.
 */
export const COMPONENT_TAGS = {
  /** Header component tests */
  HEADER: "@header",
  /** Footer component tests */
  FOOTER: "@footer",
  /** Sidebar component tests */
  SIDEBAR: "@sidebar",
  /** Modal/dialog tests */
  MODAL: "@modal",
  /** Table component tests */
  TABLE: "@table",
  /** Form component tests */
  FORM: "@form",
} as const;

/**
 * Priority tags.
 * Categorize tests by importance.
 */
export const PRIORITY_TAGS = {
  /** Critical tests - must pass */
  CRITICAL: "@critical",
  /** High priority */
  P1: "@p1",
  /** Medium priority */
  P2: "@p2",
  /** Low priority */
  P3: "@p3",
} as const;

/**
 * Platform tags.
 * Categorize tests by target platform.
 */
export const PLATFORM_TAGS = {
  /** Desktop-specific tests */
  DESKTOP: "@desktop",
  /** Mobile-specific tests */
  MOBILE: "@mobile",
  /** Tablet-specific tests */
  TABLET: "@tablet",
} as const;

/**
 * All available tags combined.
 */
export const TAGS = {
  ...TEST_TYPE_TAGS,
  ...FEATURE_TAGS,
  ...COMPONENT_TAGS,
  ...PRIORITY_TAGS,
  ...PLATFORM_TAGS,
} as const;

/**
 * Tag type for type safety.
 */
export type Tag = (typeof TAGS)[keyof typeof TAGS];

/**
 * Combine multiple tags into a space-separated string.
 * Use this to add multiple tags to a test title.
 *
 * @param tags - Tags to combine
 * @returns Space-separated tag string
 *
 * @example
 * ```typescript
 * test(`should work ${tags(TAGS.SMOKE, TAGS.NAVIGATION)}`, async () => {});
 * // Result: "should work @smoke @nav"
 * ```
 */
export function tags(...tagList: Tag[]): string {
  return tagList.join(" ");
}

/**
 * Create a tagged test title.
 *
 * @param title - Test title
 * @param tagList - Tags to add
 * @returns Title with tags appended
 *
 * @example
 * ```typescript
 * test(tagged('should navigate home', TAGS.SMOKE, TAGS.NAVIGATION), async () => {});
 * ```
 */
export function tagged(title: string, ...tagList: Tag[]): string {
  return `${title} ${tags(...tagList)}`;
}

/**
 * Predefined tag combinations for common scenarios.
 */
export const TAG_PRESETS = {
  /** Quick smoke test for CI */
  ciSmoke: tags(TEST_TYPE_TAGS.SMOKE, PRIORITY_TAGS.CRITICAL),

  /** Navigation smoke test */
  navSmoke: tags(TEST_TYPE_TAGS.SMOKE, FEATURE_TAGS.NAVIGATION),

  /** Auth smoke test */
  authSmoke: tags(TEST_TYPE_TAGS.SMOKE, FEATURE_TAGS.AUTH),

  /** Full accessibility check */
  fullA11y: tags(TEST_TYPE_TAGS.A11Y, PRIORITY_TAGS.P1),

  /** Header component test */
  headerTest: tags(COMPONENT_TAGS.HEADER, TEST_TYPE_TAGS.E2E),

  /** Footer component test */
  footerTest: tags(COMPONENT_TAGS.FOOTER, TEST_TYPE_TAGS.E2E),

  /** Mobile navigation test */
  mobileNav: tags(PLATFORM_TAGS.MOBILE, FEATURE_TAGS.NAVIGATION),
} as const;

/**
 * Check if a test title contains a specific tag.
 *
 * @param title - Test title to check
 * @param tag - Tag to look for
 * @returns True if tag is present
 */
export function hasTag(title: string, tag: Tag): boolean {
  return title.includes(tag);
}

/**
 * Extract all tags from a test title.
 *
 * @param title - Test title
 * @returns Array of found tags
 */
export function extractTags(title: string): Tag[] {
  const allTags = Object.values(TAGS);
  return allTags.filter((tag) => title.includes(tag));
}
