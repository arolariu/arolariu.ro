/**
 * @fileoverview Unit tests for invoice products actions barrel exports.
 * @module app/domains/invoices/_actions/invoices/products/index.test
 */

import {describe, expect, it} from "vitest";
import * as productActions from "./index";

const expectedExports = ["addInvoiceProduct", "deleteInvoiceProduct", "updateInvoiceProduct"] as const;

describe("invoice products actions index barrel", () => {
  it("exports the expected product action surface", () => {
    expect(Object.keys(productActions).sort()).toEqual([...expectedExports].sort());
    for (const exportName of expectedExports) {
      expect(typeof productActions[exportName]).toBe("function");
    }
  });
});
