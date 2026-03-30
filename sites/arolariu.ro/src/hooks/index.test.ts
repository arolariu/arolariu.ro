/**
 * @fileoverview Tests for hooks barrel export.
 * @module hooks/index.test
 */

import {describe, expect, it, vi} from "vitest";

// Mock server action modules to prevent Vite from resolving "use server" dependency chain
vi.mock("@/lib/actions/invoices/fetchInvoice", () => ({default: vi.fn()}));
vi.mock("@/lib/actions/invoices/fetchInvoices", () => ({default: vi.fn()}));
vi.mock("@/lib/actions/invoices/fetchMerchant", () => ({default: vi.fn()}));
vi.mock("@/lib/actions/invoices/fetchMerchants", () => ({default: vi.fn()}));
vi.mock("@/lib/actions/user/fetchUser", () => ({fetchBFFUserFromAuthService: vi.fn(), fetchAaaSUserFromAuthService: vi.fn()}));

import {useInvoice, useInvoices, useMerchant, useMerchants, usePaginationWithSearch, useUserInformation} from "./index";

describe("hooks barrel export", () => {
  describe("data fetching hooks", () => {
    it("should export useInvoice hook", () => {
      expect(useInvoice).toBeDefined();
      expect(typeof useInvoice).toBe("function");
    });

    it("should export useInvoices hook", () => {
      expect(useInvoices).toBeDefined();
      expect(typeof useInvoices).toBe("function");
    });

    it("should export useMerchant hook", () => {
      expect(useMerchant).toBeDefined();
      expect(typeof useMerchant).toBe("function");
    });

    it("should export useMerchants hook", () => {
      expect(useMerchants).toBeDefined();
      expect(typeof useMerchants).toBe("function");
    });

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
