/**
 * @fileoverview Unit tests for invoice hooks barrel export.
 * @module app/domains/invoices/_hooks/invoice/index.test
 */

import {describe, expect, it} from "vitest";
import * as invoiceHooks from "./index";

const expectedExports = [
  "useInvoice",
  "useInvoices",
  "useInvoiceDelete",
  "useInvoiceMetadataAdd",
  "useInvoiceMetadataRemove",
  "useInvoiceShare",
  "useRecipeAdd",
  "useRecipeUpdate",
  "useRecipeDelete",
] as const;

describe("invoice hooks barrel", () => {
  it("exports the expected invoice hook surface", () => {
    expect(Object.keys(invoiceHooks).sort()).toEqual([...expectedExports].sort());
    for (const exportName of expectedExports) {
      expect(typeof invoiceHooks[exportName]).toBe("function");
    }
  });
});
