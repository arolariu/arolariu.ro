/**
 * @fileoverview Unit tests for invoice metadata actions barrel exports.
 * @module app/domains/invoices/_actions/invoices/metadata/index.test
 */

import {describe, expect, it, vi} from "vitest";

// Mock the metadata action modules before importing the barrel to prevent pulling
// real action modules into this barrel test coverage calculation.
vi.mock("./addInvoiceMetadata", () => ({
  addInvoiceMetadata: vi.fn(),
}));
vi.mock("./deleteInvoiceMetadata", () => ({
  deleteInvoiceMetadata: vi.fn(),
}));

import * as metadataActions from "./index";

describe("invoice metadata actions index barrel", () => {
  it("exports addInvoiceMetadata", () => {
    expect(metadataActions.addInvoiceMetadata).toBeDefined();
    expect(typeof metadataActions.addInvoiceMetadata).toBe("function");
  });

  it("exports deleteInvoiceMetadata", () => {
    expect(metadataActions.deleteInvoiceMetadata).toBeDefined();
    expect(typeof metadataActions.deleteInvoiceMetadata).toBe("function");
  });
});
