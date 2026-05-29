/**
 * @fileoverview Tests for standalone scan server action barrel exports.
 * @module app/domains/invoices/_actions/scans/index.test
 */

import {describe, expect, it} from "vitest";
import * as scanActions from "./index";

const expectedExports = [
  "deleteScan",
  "fetchScans",
  "generateUploadSasUrl",
  "markScansAsUsed",
  "registerScan",
  "updateScan",
  "uploadScan",
] as const;

describe("scans barrel export", () => {
  it("exports the expected scan action surface", () => {
    expect(Object.keys(scanActions).sort()).toEqual([...expectedExports].sort());
    for (const exportName of expectedExports) {
      expect(typeof scanActions[exportName]).toBe("function");
    }
  });
});
