/**
 * @fileoverview Tests for scans barrel export.
 * @module lib/actions/scans/index.test
 */

import {describe, expect, it} from "vitest";
import {deleteScan, fetchScans, prepareScanUpload, recordBulkUploadTelemetry, uploadScan} from "./index";

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

  it("should export prepareScanUpload function", () => {
    expect(prepareScanUpload).toBeDefined();
    expect(typeof prepareScanUpload).toBe("function");
  });

  it("should export recordBulkUploadTelemetry function", () => {
    expect(recordBulkUploadTelemetry).toBeDefined();
    expect(typeof recordBulkUploadTelemetry).toBe("function");
  });
});
