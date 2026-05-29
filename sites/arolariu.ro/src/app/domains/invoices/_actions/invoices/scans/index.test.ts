/**
 * @fileoverview Unit tests for invoice scans actions barrel exports.
 * @module app/domains/invoices/_actions/invoices/scans/index.test
 */

import {describe, expect, it} from "vitest";
import * as scanActions from "./index";

const expectedExports = ["attachInvoiceScan", "createInvoiceScan", "deleteInvoiceScan"] as const;

describe("invoice scans actions index barrel", () => {
  it("exports the expected invoice scan action surface", () => {
    expect(Object.keys(scanActions).sort()).toEqual([...expectedExports].sort());
    for (const exportName of expectedExports) {
      expect(typeof scanActions[exportName]).toBe("function");
    }
  });
});
