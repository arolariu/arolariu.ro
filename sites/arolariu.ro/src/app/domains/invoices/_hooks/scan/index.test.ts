/**
 * @fileoverview Unit tests for scan hooks barrel export.
 * @module app/domains/invoices/_hooks/scan/index.test
 */

import {describe, expect, it} from "vitest";
import * as scanHooks from "./index";

const expectedExports = ["useScanAdd", "useScanDelete", "useScanRename", "useScanRotation"] as const;

describe("scan hooks barrel", () => {
  it("exports the expected scan hook surface", () => {
    expect(Object.keys(scanHooks).sort()).toEqual([...expectedExports].sort());
    for (const exportName of expectedExports) {
      expect(typeof scanHooks[exportName]).toBe("function");
    }
  });
});
