/**
 * @fileoverview Tests for hooks barrel export.
 * @module hooks/index.test
 */

import {describe, expect, it, vi} from "vitest";

// Mock server action modules to prevent Vite from resolving "use server" dependency chain
vi.mock("@/lib/actions/user/fetchUser", () => ({fetchBFFUserFromAuthService: vi.fn(), fetchAaaSUserFromAuthService: vi.fn()}));

import {usePaginationWithSearch, useUserInformation} from "./index";

describe("hooks barrel export", () => {
  describe("data fetching hooks", () => {
    it("should export useUserInformation hook", () => {
      expect(useUserInformation).toBeDefined();
      expect(typeof useUserInformation).toBe("function");
    });
  });

  describe("utility hooks", () => {
    it("should export usePaginationWithSearch hook", () => {
      expect(usePaginationWithSearch).toBeDefined();
      expect(typeof usePaginationWithSearch).toBe("function");
    });
  });
});
