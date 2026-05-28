/**
 * @fileoverview Unit tests for product hooks barrel export.
 * @module app/domains/invoices/_hooks/product/index.test
 */

import {describe, expect, it, vi} from "vitest";

vi.mock("./useProductAdd", () => ({
  useProductAdd: vi.fn(() => ({isAdding: false, addProductCallback: vi.fn()})),
}));

vi.mock("./useProductRemove", () => ({
  useProductRemove: vi.fn(() => ({isRemoving: false, removeProductCallback: vi.fn()})),
}));

import * as productHooks from "./index";

describe("product hooks barrel", () => {
  it("exports useProductAdd", () => {
    expect(productHooks.useProductAdd).toBeDefined();
    expect(typeof productHooks.useProductAdd).toBe("function");
  });

  it("exports useProductRemove", () => {
    expect(productHooks.useProductRemove).toBeDefined();
    expect(typeof productHooks.useProductRemove).toBe("function");
  });

  it("exports all expected hooks", () => {
    const expectedExports = ["useProductAdd", "useProductRemove"];

    expect(Object.keys(productHooks)).toEqual(expect.arrayContaining(expectedExports));
    expect(Object.keys(productHooks)).toHaveLength(expectedExports.length);
  });

  it("does not export unexpected symbols", () => {
    const allowedExports = ["useProductAdd", "useProductRemove"];

    Object.keys(productHooks).forEach((exportName) => {
      expect(allowedExports).toContain(exportName);
    });
  });
});

