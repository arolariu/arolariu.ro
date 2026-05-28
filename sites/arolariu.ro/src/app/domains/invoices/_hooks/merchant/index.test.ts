/**
 * @fileoverview Unit tests for merchant hooks barrel export.
 * @module app/domains/invoices/_hooks/merchant/index.test
 */

import {describe, expect, it, vi} from "vitest";

vi.mock("./useMerchant", () => ({
  useMerchant: vi.fn(() => ({merchant: null, isLoading: false, isError: false})),
}));

vi.mock("./useMerchants", () => ({
  useMerchants: vi.fn(() => ({merchants: [], isLoading: false, isError: false})),
}));

import * as merchantHooks from "./index";

describe("merchant hooks barrel", () => {
  it("exports useMerchant", () => {
    expect(merchantHooks.useMerchant).toBeDefined();
    expect(typeof merchantHooks.useMerchant).toBe("function");
  });

  it("exports useMerchants", () => {
    expect(merchantHooks.useMerchants).toBeDefined();
    expect(typeof merchantHooks.useMerchants).toBe("function");
  });

  it("exports all expected hooks", () => {
    const expectedExports = ["useMerchant", "useMerchants"];

    expect(Object.keys(merchantHooks)).toEqual(expect.arrayContaining(expectedExports));
    expect(Object.keys(merchantHooks)).toHaveLength(expectedExports.length);
  });

  it("does not export unexpected symbols", () => {
    const allowedExports = ["useMerchant", "useMerchants"];

    Object.keys(merchantHooks).forEach((exportName) => {
      expect(allowedExports).toContain(exportName);
    });
  });
});

