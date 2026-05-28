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

describe("invoice hooks barrel", () => {
  it("exports useInvoice", async () => {
    const barrel = await import("./index");

    expect(barrel.useInvoice).toBeDefined();
    expect(typeof barrel.useInvoice).toBe("function");
  });

  it("exports useInvoices", async () => {
    const barrel = await import("./index");

    expect(barrel.useInvoices).toBeDefined();
    expect(typeof barrel.useInvoices).toBe("function");
  });

  it("exports useInvoiceDelete", async () => {
    const barrel = await import("./index");

    expect(barrel.useInvoiceDelete).toBeDefined();
    expect(typeof barrel.useInvoiceDelete).toBe("function");
  });

  it("exports useInvoiceMetadataAdd", async () => {
    const barrel = await import("./index");

    expect(barrel.useInvoiceMetadataAdd).toBeDefined();
    expect(typeof barrel.useInvoiceMetadataAdd).toBe("function");
  });

  it("exports useInvoiceMetadataRemove", async () => {
    const barrel = await import("./index");

    expect(barrel.useInvoiceMetadataRemove).toBeDefined();
    expect(typeof barrel.useInvoiceMetadataRemove).toBe("function");
  });

  it("exports useInvoiceShare", async () => {
    const barrel = await import("./index");

    expect(barrel.useInvoiceShare).toBeDefined();
    expect(typeof barrel.useInvoiceShare).toBe("function");
  });

  it("exports useRecipeAdd", async () => {
    const barrel = await import("./index");

    expect(barrel.useRecipeAdd).toBeDefined();
    expect(typeof barrel.useRecipeAdd).toBe("function");
  });

  it("exports useRecipeUpdate", async () => {
    const barrel = await import("./index");

    expect(barrel.useRecipeUpdate).toBeDefined();
    expect(typeof barrel.useRecipeUpdate).toBe("function");
  });

  it("exports useRecipeDelete", async () => {
    const barrel = await import("./index");

    expect(barrel.useRecipeDelete).toBeDefined();
    expect(typeof barrel.useRecipeDelete).toBe("function");
  });

  it("exports all expected hooks", async () => {
    const barrel = await import("./index");

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

    const actualExports = Object.keys(barrel);

    expectedExports.forEach((exportName) => {
      expect(actualExports).toContain(exportName);
    });

    expect(actualExports.length).toBe(expectedExports.length);
  });

  it("does not export any unexpected symbols", async () => {
    const barrel = await import("./index");

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

    const actualExports = Object.keys(barrel);

    actualExports.forEach((exportName) => {
      expect(allowedExports).toContain(exportName);
    });
  });
});
