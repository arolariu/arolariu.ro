/**
 * @fileoverview Unit tests for invoice actions barrel exports.
 * @module app/domains/invoices/_actions/invoices/index.test
 */

import {describe, expect, it} from "vitest";
import * as invoiceActions from "./index";

describe("invoice actions index barrel", () => {
  it("exports analyzeInvoice", () => {
    expect(invoiceActions.analyzeInvoice).toBeDefined();
    expect(typeof invoiceActions.analyzeInvoice).toBe("function");
  });

  it("exports createInvoice", () => {
    expect(invoiceActions.createInvoice).toBeDefined();
    expect(typeof invoiceActions.createInvoice).toBe("function");
  });

  it("exports deleteInvoice", () => {
    expect(invoiceActions.deleteInvoice).toBeDefined();
    expect(typeof invoiceActions.deleteInvoice).toBe("function");
  });

  it("exports fetchInvoice", () => {
    expect(invoiceActions.fetchInvoice).toBeDefined();
    expect(typeof invoiceActions.fetchInvoice).toBe("function");
  });

  it("exports fetchInvoices", () => {
    expect(invoiceActions.fetchInvoices).toBeDefined();
    expect(typeof invoiceActions.fetchInvoices).toBe("function");
  });

  it("exports patchInvoice", () => {
    expect(invoiceActions.patchInvoice).toBeDefined();
    expect(typeof invoiceActions.patchInvoice).toBe("function");
  });

  it("exports updateInvoice", () => {
    expect(invoiceActions.updateInvoice).toBeDefined();
    expect(typeof invoiceActions.updateInvoice).toBe("function");
  });
});
