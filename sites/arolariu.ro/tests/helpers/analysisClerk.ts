/**
 * @fileoverview Clerk boundary controls for real-module analysis integration tests.
 * @module tests/helpers/analysisClerk
 */

import {vi} from "vitest";

/** Configurable Clerk SDK methods used by the real user-fetch server action. */
export const analysisClerk = {
  auth: vi.fn(),
  currentUser: vi.fn(),
} as const;
