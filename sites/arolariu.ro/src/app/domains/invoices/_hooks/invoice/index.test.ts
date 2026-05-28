/**
 * @fileoverview Unit tests for invoice hooks barrel export.
 * @module app/domains/invoices/_hooks/invoice/index.test
 */

import {describe, expect, it, vi} from "vitest";

// Mock all re-exported hook modules before importing the barrel
vi.mock("./useInvoice", () => ({
  useInvoice: vi.fn(() => ({invoice: null, isLoading: false, isError: false})),
}));

vi.mock("./useInvoices", () => ({
  useInvoices: vi.fn(() => ({invoices: [], isLoading: false, isError: false})),
}));

vi.mock("./useInvoiceDelete", () => ({
  useInvoiceDelete: vi.fn(() => ({
    isDeleting: false,
    deleteInvoiceCallback: vi.fn(),
  })),
}));

vi.mock("./useInvoiceMetadataAdd", () => ({
  useInvoiceMetadataAdd: vi.fn(() => ({
    isAdding: false,
    addMetadataCallback: vi.fn(),
  })),
}));

vi.mock("./useInvoiceMetadataRemove", () => ({
  useInvoiceMetadataRemove: vi.fn(() => ({
    isRemoving: false,
    removeMetadataCallback: vi.fn(),
  })),
}));

vi.mock("./useInvoiceShare", () => ({
  useInvoiceShare: vi.fn(() => ({
    isSharing: false,
    shareInvoiceCallback: vi.fn(),
  })),
}));

vi.mock("./useRecipeAdd", () => ({
  useRecipeAdd: vi.fn(() => ({
    isAdding: false,
    addRecipeCallback: vi.fn(),
  })),
}));

vi.mock("./useRecipeUpdate", () => ({
  useRecipeUpdate: vi.fn(() => ({
    isUpdating: false,
    updateRecipeCallback: vi.fn(),
  })),
}));

vi.mock("./useRecipeDelete", () => ({
  useRecipeDelete: vi.fn(() => ({
    isDeleting: false,
    removeRecipeCallback: vi.fn(),
  })),
}));

import * as invoiceHooks from "./index";

describe("invoice hooks barrel", () => {
  it("exports useInvoice", () => {
    expect(invoiceHooks.useInvoice).toBeDefined();
    expect(typeof invoiceHooks.useInvoice).toBe("function");
  });

  it("exports useInvoices", () => {
    expect(invoiceHooks.useInvoices).toBeDefined();
    expect(typeof invoiceHooks.useInvoices).toBe("function");
  });

  it("exports useInvoiceDelete", () => {
    expect(invoiceHooks.useInvoiceDelete).toBeDefined();
    expect(typeof invoiceHooks.useInvoiceDelete).toBe("function");
  });

  it("exports useInvoiceMetadataAdd", () => {
    expect(invoiceHooks.useInvoiceMetadataAdd).toBeDefined();
    expect(typeof invoiceHooks.useInvoiceMetadataAdd).toBe("function");
  });

  it("exports useInvoiceMetadataRemove", () => {
    expect(invoiceHooks.useInvoiceMetadataRemove).toBeDefined();
    expect(typeof invoiceHooks.useInvoiceMetadataRemove).toBe("function");
  });

  it("exports useInvoiceShare", () => {
    expect(invoiceHooks.useInvoiceShare).toBeDefined();
    expect(typeof invoiceHooks.useInvoiceShare).toBe("function");
  });

  it("exports useRecipeAdd", () => {
    expect(invoiceHooks.useRecipeAdd).toBeDefined();
    expect(typeof invoiceHooks.useRecipeAdd).toBe("function");
  });

  it("exports useRecipeUpdate", () => {
    expect(invoiceHooks.useRecipeUpdate).toBeDefined();
    expect(typeof invoiceHooks.useRecipeUpdate).toBe("function");
  });

  it("exports useRecipeDelete", () => {
    expect(invoiceHooks.useRecipeDelete).toBeDefined();
    expect(typeof invoiceHooks.useRecipeDelete).toBe("function");
  });

  it("exports all expected hooks", () => {
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
    ];

    const actualExports = Object.keys(invoiceHooks);

    expectedExports.forEach((exportName) => {
      expect(actualExports).toContain(exportName);
    });

    expect(actualExports.length).toBe(expectedExports.length);
  });

  it("does not export any unexpected symbols", () => {
    const allowedExports = [
      "useInvoice",
      "useInvoices",
      "useInvoiceDelete",
      "useInvoiceMetadataAdd",
      "useInvoiceMetadataRemove",
      "useInvoiceShare",
      "useRecipeAdd",
      "useRecipeUpdate",
      "useRecipeDelete",
    ];

    const actualExports = Object.keys(invoiceHooks);

    actualExports.forEach((exportName) => {
      expect(allowedExports).toContain(exportName);
    });
  });
});
