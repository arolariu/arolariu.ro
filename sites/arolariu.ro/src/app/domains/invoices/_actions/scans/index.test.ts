/**
 * @fileoverview Tests for standalone scan server action barrel exports.
 * @module app/domains/invoices/_actions/scans/index.test
 *
 * @remarks
 * These tests verify that the barrel preserves the public import surface used by
 * invoice scan pages and legacy `uploadScan` consumers.
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
