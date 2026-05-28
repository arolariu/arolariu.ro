/**
 * @fileoverview Unit tests for scan hooks barrel export.
 * @module app/domains/invoices/_hooks/scan/index.test
 */

import {describe, expect, it, vi} from "vitest";

vi.mock("./useScanAdd", () => ({
  useScanAdd: vi.fn(() => ({
    isAdding: false,
    addScanCallback: vi.fn(),
  })),
}));

vi.mock("./useScanDelete", () => ({
  useScanDelete: vi.fn(() => ({
    isDeleting: false,
    deleteScanCallback: vi.fn(),
  })),
}));

vi.mock("./useScanRename", () => ({
  useScanRename: vi.fn(() => ({
    value: "",
    isEditing: false,
    isCommitting: false,
    justRenamed: false,
    inputRef: {current: null},
    start: vi.fn(),
    cancel: vi.fn(),
    change: vi.fn(),
    commit: vi.fn(),
  })),
}));

vi.mock("./useScanRotation", () => ({
  useScanRotation: vi.fn(() => ({
    isRotating: false,
    rotateScanCallback: vi.fn(),
  })),
}));

import * as scanHooks from "./index";

describe("scan hooks barrel", () => {
  it("exports useScanAdd", () => {
    expect(scanHooks.useScanAdd).toBeDefined();
    expect(typeof scanHooks.useScanAdd).toBe("function");
  });

  it("exports useScanDelete", () => {
    expect(scanHooks.useScanDelete).toBeDefined();
    expect(typeof scanHooks.useScanDelete).toBe("function");
  });

  it("exports useScanRename", () => {
    expect(scanHooks.useScanRename).toBeDefined();
    expect(typeof scanHooks.useScanRename).toBe("function");
  });

  it("exports useScanRotation", () => {
    expect(scanHooks.useScanRotation).toBeDefined();
    expect(typeof scanHooks.useScanRotation).toBe("function");
  });

  it("exports all expected hooks", () => {
    const expectedExports = [
      "useScanAdd",
      "useScanDelete",
      "useScanRename",
      "useScanRotation",
    ];

    const actualExports = Object.keys(scanHooks);

    expectedExports.forEach((exportName) => {
      expect(actualExports).toContain(exportName);
    });
    expect(actualExports.length).toBe(expectedExports.length);
  });

  it("does not export unexpected symbols", () => {
    const allowedExports = [
      "useScanAdd",
      "useScanDelete",
      "useScanRename",
      "useScanRotation",
    ];

    Object.keys(scanHooks).forEach((exportName) => {
      expect(allowedExports).toContain(exportName);
    });
  });
});

