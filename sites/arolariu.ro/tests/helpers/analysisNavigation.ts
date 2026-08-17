/**
 * @fileoverview Shared Next.js navigation boundary for analysis integration tests.
 * @module tests/helpers/analysisNavigation
 */

import {vi} from "vitest";

/** External Next.js router calls observed by real-module integration tests. */
export const analysisRouter = {
  push: vi.fn(),
  replace: vi.fn(),
} as const;
