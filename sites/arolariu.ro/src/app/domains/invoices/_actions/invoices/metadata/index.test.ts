/**
 * @fileoverview Unit tests for invoice metadata actions barrel exports.
 * @module app/domains/invoices/_actions/invoices/metadata/index.test
 */

import {describe, expect, it} from "vitest";
import * as metadataActions from "./index";

const expectedExports = ["addInvoiceMetadata", "deleteInvoiceMetadata"] as const;

describe("invoice metadata actions index barrel", () => {
  it("exports the expected metadata action surface", () => {
    expect(Object.keys(metadataActions).sort()).toEqual([...expectedExports].sort());
    for (const exportName of expectedExports) {
      expect(typeof metadataActions[exportName]).toBe("function");
    }
  });
});
