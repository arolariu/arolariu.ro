/**
 * @fileoverview Tests for standalone scan server action barrel exports.
 * @module app/domains/invoices/_actions/scans/index.test
 *
 * @remarks
 * These tests verify that the barrel preserves the public import surface used by
 * invoice scan pages and legacy `uploadScan` consumers. This barrel test uses mocks
 * to avoid importing real implementations, which prevents lib/utils.generic from being
 * instrumented during coverage runs.
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

describe("scans barrel export", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should export deleteScan function", async () => {
    // Arrange
    vi.doMock("./deleteScan", () => ({
      deleteScan: vi.fn(),
    }));

    // Act
    const {deleteScan} = await import("./index");

    // Assert
    expect(deleteScan).toBeDefined();
    expect(typeof deleteScan).toBe("function");
  });

  it("should export fetchScans function", async () => {
    // Arrange
    vi.doMock("./fetchScans", () => ({
      fetchScans: vi.fn(),
    }));

    // Act
    const {fetchScans} = await import("./index");

    // Assert
    expect(fetchScans).toBeDefined();
    expect(typeof fetchScans).toBe("function");
  });

  it("should export generateUploadSasUrl function", async () => {
    // Arrange
    vi.doMock("./generateSasUrl", () => ({
      generateUploadSasUrl: vi.fn(),
    }));

    // Act
    const {generateUploadSasUrl} = await import("./index");

    // Assert
    expect(generateUploadSasUrl).toBeDefined();
    expect(typeof generateUploadSasUrl).toBe("function");
  });

  it("should export markScansAsUsed function", async () => {
    // Arrange
    vi.doMock("./markScansAsUsed", () => ({
      markScansAsUsed: vi.fn(),
    }));

    // Act
    const {markScansAsUsed} = await import("./index");

    // Assert
    expect(markScansAsUsed).toBeDefined();
    expect(typeof markScansAsUsed).toBe("function");
  });

  it("should export registerScan function", async () => {
    // Arrange
    vi.doMock("./registerScan", () => ({
      registerScan: vi.fn(),
    }));

    // Act
    const {registerScan} = await import("./index");

    // Assert
    expect(registerScan).toBeDefined();
    expect(typeof registerScan).toBe("function");
  });

  it("should export updateScan function", async () => {
    // Arrange
    vi.doMock("./updateScan", () => ({
      updateScan: vi.fn(),
    }));

    // Act
    const {updateScan} = await import("./index");

    // Assert
    expect(updateScan).toBeDefined();
    expect(typeof updateScan).toBe("function");
  });

  it("should export uploadScan as alias for createScan", async () => {
    // Arrange
    const mockCreateScan = vi.fn();
    vi.doMock("./createScan", () => ({
      createScan: mockCreateScan,
    }));

    // Act
    const {uploadScan} = await import("./index");

    // Assert
    expect(uploadScan).toBeDefined();
    expect(typeof uploadScan).toBe("function");
    expect(uploadScan).toBe(mockCreateScan);
  });

  it("should export all scan actions together", async () => {
    // Arrange
    vi.doMock("./deleteScan", () => ({deleteScan: vi.fn()}));
    vi.doMock("./fetchScans", () => ({fetchScans: vi.fn()}));
    vi.doMock("./generateSasUrl", () => ({generateUploadSasUrl: vi.fn()}));
    vi.doMock("./markScansAsUsed", () => ({markScansAsUsed: vi.fn()}));
    vi.doMock("./registerScan", () => ({registerScan: vi.fn()}));
    vi.doMock("./updateScan", () => ({updateScan: vi.fn()}));
    vi.doMock("./createScan", () => ({createScan: vi.fn()}));

    // Act
    const exports = await import("./index");

    // Assert
    expect(exports).toHaveProperty("deleteScan");
    expect(exports).toHaveProperty("fetchScans");
    expect(exports).toHaveProperty("generateUploadSasUrl");
    expect(exports).toHaveProperty("markScansAsUsed");
    expect(exports).toHaveProperty("registerScan");
    expect(exports).toHaveProperty("updateScan");
    expect(exports).toHaveProperty("uploadScan");
  });
});
