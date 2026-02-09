/**
 * @fileoverview Test utilities index - exports all utility modules.
 * @module tests/utils
 */

// Tag system
export {
  COMPONENT_TAGS,
  FEATURE_TAGS,
  PLATFORM_TAGS,
  PRIORITY_TAGS,
  TAGS,
  TAG_PRESETS,
  TEST_TYPE_TAGS,
  extractTags,
  hasTag,
  tagged,
  tags,
  type Tag,
} from "./tags";

// Assertion helpers
export {
  assertContainsText,
  assertCssProperty,
  assertElementCount,
  assertExternalLink,
  assertFieldError,
  assertFieldValid,
  assertHasFocus,
  assertImageLoaded,
  assertInternalLink,
  assertLink,
  assertLinkByRole,
  assertNoConsoleErrors,
  assertPageTitle,
  assertPosition,
  assertUrlMatches,
  assertViewport,
  assertVisibleAndNotEmpty,
} from "./assertions";

// Logging utilities
export {
  createLogger,
  isDebugEnabled,
  isVerboseEnabled,
  logSummary,
  logTestEnd,
  logTestStart,
  loggers,
  type CategoryLogger,
  type LogCategory,
  type LogLevel,
} from "./logger";
