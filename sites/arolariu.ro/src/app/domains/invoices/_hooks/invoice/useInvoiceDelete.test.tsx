/**
 * @fileoverview Unit tests for useInvoiceDelete client hook.
 * @module app/domains/invoices/_hooks/invoice/useInvoiceDelete.test
 */

import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useInvoiceDelete} from "./useInvoiceDelete";
import type {ServerActionResult} from "@/lib/utils.server";

// Mock dependencies
vi.mock("@/stores", () => ({
  useInvoicesStore: vi.fn(),
}));

vi.mock("../../_actions/invoices", () => ({
  deleteInvoice: vi.fn(),
}));

vi.mock("@arolariu/components", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("next-intl-selector", () => ({
  useTranslations: vi.fn(() => (fn: (m: Record<string, Record<string, string>>) => string, vars?: Record<string, string>) => {
    const template = fn({
      toasts: {
        invoices: {
          useInvoiceDelete: {
            deleteSuccess: "Invoice deleted successfully",
            deleteError: "Failed to delete invoice: {{error}}",
            bulkDeleteSuccess: "{{count}} invoices deleted successfully",
            bulkDeleteError: "Failed to delete {{count}} invoices",
            bulkDeletePartial: "{{successCount}} deleted, {{failureCount}} failed",
          },
        },
      },
    });
    if (!vars) return template;
    return Object.entries(vars).reduce((str, [key, value]) => str.replace(`{{${key}}}`, value), template);
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Import mocked modules
const {useInvoicesStore} = await import("@/stores");
const {deleteInvoice} = await import("../../_actions/invoices");
const {toast} = await import("@arolariu/components");
const {useRouter} = await import("next/navigation");

const mockUseInvoicesStore = vi.mocked(useInvoicesStore);
const mockDeleteInvoice = vi.mocked(deleteInvoice);
const mockToast = vi.mocked(toast);
const mockUseRouter = vi.mocked(useRouter);

describe("useInvoiceDelete", () => {
  const testInvoiceId = "11111111-1111-4111-8111-111111111111";
  const mockRouter = {push: vi.fn(), replace: vi.fn(), refresh: vi.fn()};
  const mockRemoveEntity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup router mock
    mockUseRouter.mockReturnValue(mockRouter as never);

    // Setup store mock
    mockUseInvoicesStore.mockReturnValue(mockRemoveEntity);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("returns isDeleting false initially", () => {
      const {result} = renderHook(() => useInvoiceDelete());

      expect(result.current.isDeleting).toBe(false);
      expect(result.current.deleteInvoiceCallback).toBeDefined();
    });

    it("returns deleteInvoiceCallback function", () => {
      const {result} = renderHook(() => useInvoiceDelete());

      expect(typeof result.current.deleteInvoiceCallback).toBe("function");
    });
  });

  describe("single deletion", () => {
    it("successfully deletes an invoice", async () => {
      const successResult: ServerActionResult<void> = {success: true, data: undefined};
      mockDeleteInvoice.mockResolvedValue(successResult);

      const {result} = renderHook(() => useInvoiceDelete());

      const promise = result.current.deleteInvoiceCallback(testInvoiceId);

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true);
      });

      await promise;

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(mockDeleteInvoice).toHaveBeenCalledWith({invoiceId: testInvoiceId});
      expect(mockRemoveEntity).toHaveBeenCalledWith(testInvoiceId);
      expect(mockToast.success).toHaveBeenCalledWith("Invoice deleted successfully");
      expect(mockRouter.push).toHaveBeenCalledWith("/domains/invoices/view-invoices");
    });

    it("handles deletion failure with error toast", async () => {
      const errorResult: ServerActionResult<void> = {
        success: false,
        error: {message: "Not found", userMessage: "Invoice not found"},
      };
      mockDeleteInvoice.mockResolvedValue(errorResult);

      const {result} = renderHook(() => useInvoiceDelete());

      await result.current.deleteInvoiceCallback(testInvoiceId);

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(mockDeleteInvoice).toHaveBeenCalledWith({invoiceId: testInvoiceId});
      expect(mockRemoveEntity).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("handles thrown exception during deletion", async () => {
      const testError = new Error("Network error");
      mockDeleteInvoice.mockRejectedValue(testError);

      const {result} = renderHook(() => useInvoiceDelete());

      await result.current.deleteInvoiceCallback(testInvoiceId);

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(mockDeleteInvoice).toHaveBeenCalledWith({invoiceId: testInvoiceId});
      expect(mockRemoveEntity).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("resets isDeleting flag even on error", async () => {
      mockDeleteInvoice.mockRejectedValue(new Error("Test error"));

      const {result} = renderHook(() => useInvoiceDelete());

      await result.current.deleteInvoiceCallback(testInvoiceId);

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });
  });

  describe("bulk deletion", () => {
    const invoiceIds = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ];

    it("successfully deletes all invoices", async () => {
      const successResult: ServerActionResult<void> = {success: true, data: undefined};
      mockDeleteInvoice.mockResolvedValue(successResult);

      const {result} = renderHook(() => useInvoiceDelete());

      const bulkResult = await result.current.deleteInvoiceCallback(invoiceIds);

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(mockDeleteInvoice).toHaveBeenCalledTimes(3);
      expect(mockRemoveEntity).toHaveBeenCalledTimes(3);
      expect(bulkResult).toEqual({
        successCount: 3,
        failureCount: 0,
        failedIds: [],
      });
      expect(mockToast.success).toHaveBeenCalledWith("3 invoices deleted successfully");
    });

    it("handles partial failure in bulk deletion", async () => {
      const successResult: ServerActionResult<void> = {success: true, data: undefined};
      const errorResult: ServerActionResult<void> = {
        success: false,
        error: {message: "Error", userMessage: "Error"},
      };

      mockDeleteInvoice
        .mockResolvedValueOnce(successResult)
        .mockResolvedValueOnce(errorResult)
        .mockResolvedValueOnce(successResult);

      const {result} = renderHook(() => useInvoiceDelete());

      const bulkResult = await result.current.deleteInvoiceCallback(invoiceIds);

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(bulkResult).toEqual({
        successCount: 2,
        failureCount: 1,
        failedIds: [invoiceIds[1]],
      });
      expect(mockToast.info).toHaveBeenCalledWith("2 deleted, 1 failed");
    });

    it("handles all failures in bulk deletion", async () => {
      const errorResult: ServerActionResult<void> = {
        success: false,
        error: {message: "Error", userMessage: "Error"},
      };
      mockDeleteInvoice.mockResolvedValue(errorResult);

      const {result} = renderHook(() => useInvoiceDelete());

      const bulkResult = await result.current.deleteInvoiceCallback(invoiceIds);

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(bulkResult).toEqual({
        successCount: 0,
        failureCount: 3,
        failedIds: invoiceIds,
      });
      expect(mockToast.error).toHaveBeenCalledWith("Failed to delete 3 invoices");
    });

    it("handles empty invoice array", async () => {
      const {result} = renderHook(() => useInvoiceDelete());

      const bulkResult = await result.current.deleteInvoiceCallback([]);

      expect(bulkResult).toEqual({
        successCount: 0,
        failureCount: 0,
        failedIds: [],
      });
      expect(mockDeleteInvoice).not.toHaveBeenCalled();
    });

    it("continues processing after individual failure", async () => {
      const successResult: ServerActionResult<void> = {success: true, data: undefined};
      mockDeleteInvoice
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(successResult);

      const {result} = renderHook(() => useInvoiceDelete());

      const bulkResult = await result.current.deleteInvoiceCallback(invoiceIds.slice(0, 2));

      expect(bulkResult.successCount).toBe(1);
      expect(bulkResult.failureCount).toBe(1);
      expect(mockDeleteInvoice).toHaveBeenCalledTimes(2);
    });
  });

  describe("loading state management", () => {
    it("sets isDeleting true during single deletion", async () => {
      let resolveDelete: ((value: ServerActionResult<void>) => void) | undefined;
      const deletePromise = new Promise<ServerActionResult<void>>((resolve) => {
        resolveDelete = resolve;
      });

      mockDeleteInvoice.mockReturnValue(deletePromise);

      const {result} = renderHook(() => useInvoiceDelete());

      const promise = result.current.deleteInvoiceCallback(testInvoiceId);

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true);
      });

      resolveDelete!({success: true, data: undefined});
      await promise;

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });

    it("sets isDeleting true during bulk deletion", async () => {
      const successResult: ServerActionResult<void> = {success: true, data: undefined};
      mockDeleteInvoice.mockResolvedValue(successResult);

      const {result} = renderHook(() => useInvoiceDelete());

      const promise = result.current.deleteInvoiceCallback([testInvoiceId]);

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true);
      });

      await promise;

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });
  });

  describe("store integration", () => {
    it("calls removeEntity for successful single deletion", async () => {
      const successResult: ServerActionResult<void> = {success: true, data: undefined};
      mockDeleteInvoice.mockResolvedValue(successResult);

      const {result} = renderHook(() => useInvoiceDelete());

      await result.current.deleteInvoiceCallback(testInvoiceId);

      expect(mockRemoveEntity).toHaveBeenCalledWith(testInvoiceId);
      expect(mockRemoveEntity).toHaveBeenCalledTimes(1);
    });

    it("does not call removeEntity on deletion failure", async () => {
      const errorResult: ServerActionResult<void> = {
        success: false,
        error: {message: "Error", userMessage: "Error"},
      };
      mockDeleteInvoice.mockResolvedValue(errorResult);

      const {result} = renderHook(() => useInvoiceDelete());

      await result.current.deleteInvoiceCallback(testInvoiceId);

      expect(mockRemoveEntity).not.toHaveBeenCalled();
    });

    it("calls removeEntity for each successful bulk deletion", async () => {
      const successResult: ServerActionResult<void> = {success: true, data: undefined};
      mockDeleteInvoice.mockResolvedValue(successResult);

      const {result} = renderHook(() => useInvoiceDelete());

      await result.current.deleteInvoiceCallback([
        testInvoiceId,
        "22222222-2222-4222-8222-222222222222",
      ]);

      expect(mockRemoveEntity).toHaveBeenCalledTimes(2);
    });
  });
});
