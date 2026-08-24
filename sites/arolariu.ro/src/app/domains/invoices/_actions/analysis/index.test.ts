/**
 * @fileoverview Unit tests for analysis server actions barrel export.
 * @module app/domains/invoices/_actions/analysis/index.test
 */

import {describe, expect, it} from "vitest";
import * as analysisActions from "./index";

const expectedExports = ["analyzeMerchant", "searchClassifications"] as const;

describe("analysis actions index barrel", () => {
  it("exports the expected analysis action surface", () => {
    expect(Object.keys(analysisActions).sort()).toEqual([...expectedExports].sort());
    for (const exportName of expectedExports) {
      expect(typeof analysisActions[exportName]).toBe("function");
    }
  });
});