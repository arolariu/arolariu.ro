/**
 * @fileoverview Tests for scans barrel export.
 * @module lib/actions/scans/index.test
 */

import {describe, expect, it} from "vitest";
import {deleteScan, fetchScans, uploadScan} from "./index";

describe("scans barrel export", () => {
  it("should export deleteScan function", () => {
    expect(deleteScan).toBeDefined();
    expect(typeof deleteScan).toBe("function");
  });

  it("should export fetchScans function", () => {
    expect(fetchScans).toBeDefined();
    expect(typeof fetchScans).toBe("function");
  });

  it("should export uploadScan function", () => {
    expect(uploadScan).toBeDefined();
    expect(typeof uploadScan).toBe("function");
  });
});
