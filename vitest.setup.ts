/**
 * Base Vitest setup file for the arolariu.ro monorepo
 * Provides common testing utilities and global configurations
 * Individual packages can extend this with their own setup files
 */

import "@testing-library/jest-dom/vitest";
import {cleanup} from "@testing-library/react";
import {afterEach, vi} from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
