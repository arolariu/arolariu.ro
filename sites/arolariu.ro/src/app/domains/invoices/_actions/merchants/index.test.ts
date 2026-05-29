/**
 * @fileoverview Unit tests for merchant server actions barrel export.
 * @module app/domains/invoices/_actions/merchants/index.test
 */

import {describe, expect, it} from "vitest";
import * as merchantActions from "./index";

const expectedExports = ["fetchMerchant", "fetchMerchants"] as const;

describe("merchant server actions barrel", () => {
  it("exports the expected merchant action surface", () => {
    expect(Object.keys(merchantActions).sort()).toEqual([...expectedExports].sort());
    for (const exportName of expectedExports) {
      expect(typeof merchantActions[exportName]).toBe("function");
    }
  });
});
