/**
 * @fileoverview Unit tests for useScanRotation hook.
 * @module app/domains/invoices/_hooks/useScanRotation.test
 *
 * @remarks
 * Only the synchronous, side-effect-free contract is covered here (init state
 * and PDF rejection). The full canvas/Image/FileReader pipeline cannot be
 * exercised reliably under happy-dom without monkey-patching globals that
 * break the test environment for other tests in the same run. Those paths
 * are intended to be covered by an integration/Playwright test instead.
 */

import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {toast} from "@arolariu/components";
import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useScanRotation} from "./useScanRotation";

// Mock dependencies
vi.mock("@/lib/actions/scans");
vi.mock("@/stores");
vi.mock("@arolariu/components", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockScan: CachedScan = {
  id: "scan-123",
  userIdentifier: "user_abc",
  name: "receipt-001.jpg",
  blobUrl: "https://cdn.arolariu.ro/scans/user_abc/scan-123.jpg",
  mimeType: "image/jpeg",
  sizeInBytes: 1048576,
  scanType: "JPEG",
  uploadedAt: new Date(),
  status: "ready",
  metadata: {},
  cachedAt: new Date(),
};

const mockPDFScan: CachedScan = {
  ...mockScan,
  mimeType: "application/pdf",
  scanType: "PDF",
};

describe("useScanRotation", () => {
  const mockUpdateScanBlobUrl = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useScansStore).mockReturnValue(mockUpdateScanBlobUrl);
  });

  it("should initialize with isRotating false", () => {
    const {result} = renderHook(() => useScanRotation(mockScan));

    expect(result.current.isRotating).toBe(false);
  });

  it("should reject rotation for PDF scans", async () => {
    const {result} = renderHook(() => useScanRotation(mockPDFScan));

    await act(async () => {
      await result.current.rotate("cw");
    });

    expect(toast.error).toHaveBeenCalledWith("actions.rotateUnsupported");
    expect(result.current.isRotating).toBe(false);
  });

  it("should reject rotation when blobUrl is empty", async () => {
    const {result} = renderHook(() => useScanRotation({...mockScan, blobUrl: ""}));

    await act(async () => {
      await result.current.rotate("cw");
    });

    expect(toast.error).toHaveBeenCalledWith("actions.rotateUnsupported");
    expect(result.current.isRotating).toBe(false);
  });
});
