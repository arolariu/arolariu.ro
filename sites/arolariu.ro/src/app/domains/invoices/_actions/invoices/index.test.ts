/**
 * @fileoverview Unit tests for invoice actions barrel exports.
 * @module app/domains/invoices/_actions/invoices/index.test
 */

import {describe, expect, it} from "vitest";
import * as invoiceActions from "./index";

const expectedExports = [
  "addInvoiceMetadata",
  "addInvoiceProduct",
  "analyzeInvoice",
  "attachInvoiceScan",
  "createInvoice",
  "createInvoiceScan",
  "deleteInvoice",
  "deleteInvoiceMetadata",
  "deleteInvoiceProduct",
  "deleteInvoiceScan",
  "fetchInvoice",
  "fetchInvoices",
  "patchInvoice",
  "updateInvoice",
  "updateInvoiceProduct",
] as const;

describe("invoice actions index barrel", () => {
  it("exports the expected invoice action surface", () => {
    expect(Object.keys(invoiceActions).sort()).toEqual([...expectedExports].sort());
    for (const exportName of expectedExports) {
      expect(typeof invoiceActions[exportName]).toBe("function");
    }
  });
});
