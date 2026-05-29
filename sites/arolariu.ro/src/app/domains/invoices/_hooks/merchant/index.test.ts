/**
 * @fileoverview Unit tests for merchant hooks barrel export.
 * @module app/domains/invoices/_hooks/merchant/index.test
 */

import {describe, expect, it} from "vitest";
import * as merchantHooks from "./index";

const expectedExports = ["useMerchant", "useMerchants"] as const;

describe("merchant hooks barrel", () => {
  it("exports the expected merchant hook surface", () => {
    expect(Object.keys(merchantHooks).sort()).toEqual([...expectedExports].sort());
    for (const exportName of expectedExports) {
      expect(typeof merchantHooks[exportName]).toBe("function");
    }
  });
});
