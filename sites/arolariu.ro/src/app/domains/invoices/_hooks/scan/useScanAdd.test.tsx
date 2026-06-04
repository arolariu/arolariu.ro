/**
 * @fileoverview Unit tests for useScanAdd client hook.
 * @module app/domains/invoices/_hooks/scan/useScanAdd.test
 */

import type {ServerActionResult} from "@/lib/utils.server";
import {InvoiceScanType} from "@/types/invoices";
import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {invokeHookCallback} from "../../../../../../tests/helpers";
import {useScanAdd} from "./useScanAdd";

vi.mock("../../_actions/invoices", () => ({
  createInvoiceScan: vi.fn(),
  attachInvoiceScan: vi.fn(),
}));

vi.mock("@arolariu/components", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next-intl-selector", () => ({
  useTranslations: vi.fn(
    () =>
      (
        fn: (m: {
          toasts: {
            invoices: {
              useScanAdd: {
                uploadFailed: string;
                addSuccess: string;
                addError: string;
              };
            };
          };
        }) => string,
        vars?: Record<string, string>,
      ) => {
        const template = fn({
          toasts: {
            invoices: {
              useScanAdd: {
                uploadFailed: "Upload failed with status {{status}}",
                addSuccess: "Scan added successfully",
                addError: "Failed to add scan",
              },
            },
          },
        });
        return Object.entries(vars ?? {}).reduce((message, [key, value]) => message.replace(`{{${key}}}`, value), template);
      },
  ),
}));

const {createInvoiceScan, attachInvoiceScan} = await import("../../_actions/invoices");
const {toast} = await import("@arolariu/components");

const mockCreateInvoiceScan = vi.mocked(createInvoiceScan);
const mockAttachInvoiceScan = vi.mocked(attachInvoiceScan);
const mockToast = vi.mocked(toast);

function dispatchStoredListener(listener: EventListenerOrEventListenerObject | undefined, event: Event): void {
  if (typeof listener === "function") {
    listener(event);
    return;
  }
  listener?.handleEvent(event);
}

function stubFileReader(mode: "load" | "error", result = "data:image/png;base64,c2Nhbi1kYXRh"): void {
  class MockFileReader {
    public result: string | ArrayBuffer | null = mode === "load" ? result : null;
    public error: DOMException | null = mode === "error" ? new DOMException("read failed") : null;
    private readonly listeners = new Map<string, EventListenerOrEventListenerObject>();

    public addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
      this.listeners.set(type, listener);
    }

    public readAsDataURL(): void {
      queueMicrotask(() => {
        dispatchStoredListener(this.listeners.get(mode), new Event(mode));
      });
    }
  }

  vi.stubGlobal("FileReader", MockFileReader as unknown as typeof FileReader);
}

describe("useScanAdd", () => {
  const invoiceId = "11111111-1111-4111-8111-111111111111";
  const scanBlobUrl = "https://storage.test/invoices/scans/user-1/scan.png";
  const uploadSuccess: Awaited<ServerActionResult<{status: number; blobUrl: string}>> = {
    success: true,
    data: {status: 201, blobUrl: scanBlobUrl},
  };
  const attachSuccess: Awaited<ServerActionResult<void>> = {success: true, data: undefined};
  const addArgs = {
    file: new Blob(["scan"], {type: "image/png"}),
    fileName: "receipt.png",
    userIdentifier: "user-1",
    type: InvoiceScanType.PNG,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    stubFileReader("load");
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "99999999-9999-4999-8999-999999999999"),
    });
    mockCreateInvoiceScan.mockResolvedValue(uploadSuccess);
    mockAttachInvoiceScan.mockResolvedValue(attachSuccess);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("returns idle state and callback", () => {
      const {result} = renderHook(() => useScanAdd(invoiceId));

      expect(result.current.isAdding).toBe(false);
      expect(typeof result.current.addScanCallback).toBe("function");
    });
  });

  describe("scan addition", () => {
    it("uploads the blob and attaches the returned location to the invoice", async () => {
      const hookResult = renderHook(() => useScanAdd(invoiceId));
      const {result} = hookResult;

      await invokeHookCallback(hookResult, (current) => current.addScanCallback(addArgs));

      const createInvoiceScanCall = mockCreateInvoiceScan.mock.calls[0]?.[0];
      expect(createInvoiceScanCall?.base64Data).toBe("data:image/png;base64,c2Nhbi1kYXRh");
      expect(createInvoiceScanCall?.blobName).toBe("user-1/11111111-1111-4111-8111-111111111111/99999999-9999-4999-8999-999999999999.png");
      
      // Assert canonical blob metadata
      const metadata = createInvoiceScanCall?.metadata;
      expect(metadata).toMatchObject({
        scanId: "99999999-9999-4999-8999-999999999999",
        ownerId: "user-1",
        displayName: "receipt.png",
        documentKind: "receipt",
        documentRole: "supplement",
        status: "attached",
        uploadedBy: "user-1",
        attachedBy: "user-1",
        attachedTo: invoiceId,
      });
      expect(metadata?.uploadedAt).toBeDefined();
      expect(metadata?.attachedAt).toBeDefined();

      const attachCall = mockAttachInvoiceScan.mock.calls[0]?.[0];
      expect(attachCall).toMatchObject({
        invoiceId,
        payload: {
          type: InvoiceScanType.PNG,
          location: scanBlobUrl,
          additionalMetadata: {
            displayName: "receipt.png",
            documentKind: "receipt",
            documentRole: "supplement",
            attachedBy: "user-1",
            attachedTo: invoiceId,
          },
        },
      });
      expect(attachCall?.payload.additionalMetadata.attachedAt).toBeDefined();
      expect(mockToast.success).toHaveBeenCalledWith("Scan added successfully");
      expect(result.current.isAdding).toBe(false);
    });

    it("defaults to jpg extension when the file name has no extension", async () => {
      const hookResult = renderHook(() => useScanAdd(invoiceId));

      await invokeHookCallback(hookResult, (current) =>
        current.addScanCallback({
          ...addArgs,
          fileName: "receipt",
        }),
      );

      expect(mockCreateInvoiceScan).toHaveBeenCalledWith(
        expect.objectContaining({
          blobName: "user-1/11111111-1111-4111-8111-111111111111/99999999-9999-4999-8999-999999999999.jpg",
        }),
      );
    });

    it("defaults to jpg extension when the file name ends with a dot", async () => {
      const hookResult = renderHook(() => useScanAdd(invoiceId));

      await invokeHookCallback(hookResult, (current) =>
        current.addScanCallback({
          ...addArgs,
          fileName: "receipt.",
        }),
      );

      expect(mockCreateInvoiceScan).toHaveBeenCalledWith(
        expect.objectContaining({
          blobName: "user-1/11111111-1111-4111-8111-111111111111/99999999-9999-4999-8999-999999999999.jpg",
        }),
      );
    });

    it("sets isAdding true while upload is pending", async () => {
      let resolveUpload: ((value: Awaited<ServerActionResult<{status: number; blobUrl: string}>>) => void) | undefined;
      mockCreateInvoiceScan.mockReturnValue(
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
      );
      const {result} = renderHook(() => useScanAdd(invoiceId));

      let pendingAdd: Promise<void> | undefined;
      act(() => {
        pendingAdd = result.current.addScanCallback(addArgs);
      });

      await waitFor(() => {
        expect(result.current.isAdding).toBe(true);
      });

      await act(async () => {
        resolveUpload?.({success: true, data: {status: 201, blobUrl: scanBlobUrl}});
        await pendingAdd;
      });

      expect(result.current.isAdding).toBe(false);
    });
  });

  describe("error handling", () => {
    it("throws and skips attachment when upload returns an error result", async () => {
      mockCreateInvoiceScan.mockResolvedValue({
        success: false,
        error: {code: "SERVER_ERROR", message: "Upload failed", status: 500},
      });
      const hookResult = renderHook(() => useScanAdd(invoiceId));

      await expect(invokeHookCallback(hookResult, (current) => current.addScanCallback(addArgs))).rejects.toThrow(
        "Upload failed with status 500",
      );

      expect(mockAttachInvoiceScan).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith("Failed to add scan", {
        description: "Upload failed with status 500",
      });
      expect(hookResult.result.current.isAdding).toBe(false);
    });

    it("throws when upload returns invalid data without status", async () => {
      mockCreateInvoiceScan.mockResolvedValue({
        success: false,
        error: {code: "SERVER_ERROR", message: "Invalid response"},
      });
      const hookResult = renderHook(() => useScanAdd(invoiceId));

      await expect(invokeHookCallback(hookResult, (current) => current.addScanCallback(addArgs))).rejects.toThrow(
        "Upload failed with status unknown",
      );

      expect(mockAttachInvoiceScan).not.toHaveBeenCalled();
    });

    it("uses unknown upload status when the error result has no status", async () => {
      mockCreateInvoiceScan.mockResolvedValue({
        success: false,
        error: {code: "SERVER_ERROR", message: "Upload failed"},
      });
      const hookResult = renderHook(() => useScanAdd(invoiceId));

      await expect(invokeHookCallback(hookResult, (current) => current.addScanCallback(addArgs))).rejects.toThrow(
        "Upload failed with status unknown",
      );

      expect(mockAttachInvoiceScan).not.toHaveBeenCalled();
    });

    it("surfaces FileReader errors and resets loading state", async () => {
      stubFileReader("error");
      const hookResult = renderHook(() => useScanAdd(invoiceId));

      await expect(invokeHookCallback(hookResult, (current) => current.addScanCallback(addArgs))).rejects.toThrow("read failed");

      expect(mockCreateInvoiceScan).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith("Failed to add scan", {
        description: "read failed",
      });
      expect(hookResult.result.current.isAdding).toBe(false);
    });

    it("surfaces non-Error failures from attachment", async () => {
      mockAttachInvoiceScan.mockRejectedValue("attach failed");
      const hookResult = renderHook(() => useScanAdd(invoiceId));
      const {result} = hookResult;

      await expect(invokeHookCallback(hookResult, (current) => current.addScanCallback(addArgs))).rejects.toBe("attach failed");

      expect(mockToast.error).toHaveBeenCalledWith("Failed to add scan", {
        description: "attach failed",
      });
      expect(result.current.isAdding).toBe(false);
    });
  });
});
