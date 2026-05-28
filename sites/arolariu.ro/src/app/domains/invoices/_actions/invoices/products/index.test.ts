/**
 * @fileoverview Unit tests for invoice products actions barrel exports.
 * @module app/domains/invoices/_actions/invoices/products/index.test
 */

import {describe, expect, it, vi} from "vitest";

// Mock the product action modules before importing the barrel to prevent pulling
// real action modules into this barrel test coverage calculation.
vi.mock("./addInvoiceProduct", () => ({
  addInvoiceProduct: vi.fn(),
}));
vi.mock("./deleteInvoiceProduct", () => ({
  deleteInvoiceProduct: vi.fn(),
}));
vi.mock("./updateInvoiceProduct", () => ({
  updateInvoiceProduct: vi.fn(),
}));

import * as productActions from "./index";

describe("invoice products actions index barrel", () => {
  it("exports addInvoiceProduct", () => {
    expect(productActions.addInvoiceProduct).toBeDefined();
    expect(typeof productActions.addInvoiceProduct).toBe("function");
  });

  it("exports deleteInvoiceProduct", () => {
    expect(productActions.deleteInvoiceProduct).toBeDefined();
    expect(typeof productActions.deleteInvoiceProduct).toBe("function");
  });

  it("exports updateInvoiceProduct", () => {
    expect(productActions.updateInvoiceProduct).toBeDefined();
    expect(typeof productActions.updateInvoiceProduct).toBe("function");
  });
});
