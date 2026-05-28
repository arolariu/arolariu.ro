/**
 * @fileoverview Unit tests for invoice scans actions barrel exports.
 * @module app/domains/invoices/_actions/invoices/scans/index.test
 */

import {describe, expect, it, vi} from "vitest";

// Mock the scan action modules before importing the barrel to prevent pulling
// real action modules into this barrel test coverage calculation.
vi.mock("./createInvoiceScan", () => ({
  createInvoiceScan: vi.fn(),
}));
vi.mock("./attachInvoiceScan", () => ({
  attachInvoiceScan: vi.fn(),
}));
vi.mock("./deleteInvoiceScan", () => ({
  deleteInvoiceScan: vi.fn(),
}));

import * as scanActions from "./index";

describe("invoice scans actions index barrel", () => {
  it("exports createInvoiceScan", () => {
    expect(scanActions.createInvoiceScan).toBeDefined();
    expect(typeof scanActions.createInvoiceScan).toBe("function");
  });

  it("exports attachInvoiceScan", () => {
    expect(scanActions.attachInvoiceScan).toBeDefined();
    expect(typeof scanActions.attachInvoiceScan).toBe("function");
  });

  it("exports deleteInvoiceScan", () => {
    expect(scanActions.deleteInvoiceScan).toBeDefined();
    expect(typeof scanActions.deleteInvoiceScan).toBe("function");
  });
});
