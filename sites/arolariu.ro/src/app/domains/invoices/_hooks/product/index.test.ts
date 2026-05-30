/**
 * @fileoverview Unit tests for product hooks barrel export.
 * @module app/domains/invoices/_hooks/product/index.test
 */

import {describe, expect, it} from "vitest";
import * as productHooks from "./index";

const expectedExports = ["useProductAdd", "useProductRemove"] as const;

describe("product hooks barrel", () => {
  it("exports the expected product hook surface", () => {
    expect(Object.keys(productHooks).sort()).toEqual([...expectedExports].sort());
    for (const exportName of expectedExports) {
      expect(typeof productHooks[exportName]).toBe("function");
    }
  });
});
