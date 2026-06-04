/**
 * @fileoverview Tests for standalone scan server action barrel exports.
 * @module app/domains/invoices/_actions/scans/index.test
 */

import {describe, expect, it} from "vitest";
import * as scanActions from "./index";

describe("scans barrel export", () => {
  it("exports only approved CRUD actions and upload preparation helper", () => {
    // CRUD actions
    expect(scanActions).toHaveProperty("createScan");
    expect(scanActions).toHaveProperty("fetchScans");
    expect(scanActions).toHaveProperty("updateScan");
    expect(scanActions).toHaveProperty("deleteScan");

    // Upload preparation helper (non-CRUD)
    expect(scanActions).toHaveProperty("createScanUploadTarget");

    // All exports are functions
    expect(typeof scanActions.createScan).toBe("function");
    expect(typeof scanActions.fetchScans).toBe("function");
    expect(typeof scanActions.updateScan).toBe("function");
    expect(typeof scanActions.deleteScan).toBe("function");
    expect(typeof scanActions.createScanUploadTarget).toBe("function");
  });

  it("does not export obsolete workflow actions", () => {
    expect(scanActions).not.toHaveProperty("registerScan");
    expect(scanActions).not.toHaveProperty("markScansAsUsed");
    expect(scanActions).not.toHaveProperty("uploadScan");
    expect(scanActions).not.toHaveProperty("generateUploadSasUrl");
  });
});
