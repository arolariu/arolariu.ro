/**
 * @fileoverview Unit tests for useInvoiceDelete client hook.
 * @module app/domains/invoices/_hooks/invoice/useInvoiceDelete.test
 */

import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {actionFailure, actionSuccess, invokeHookCallback} from "../../../../../../tests/helpers";
import {useInvoiceDelete} from "./useInvoiceDelete";

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
  useTranslations: vi.fn(() => <T extends string>(fn: (m: {toasts: {invoices: {useInvoiceDelete: Record<string, string>}}}) => T, vars?: Record<string, string>): string => {
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
    return Object.entries(vars).reduce<string>((str, [key, value]) => str.replace(`{{${key}}}`, value), template);
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
    mockUseInvoicesStore.mockImplementation(((selector: (state: {removeEntity: typeof mockRemoveEntity}) => typeof mockRemoveEntity) =>
      selector({
        removeEntity: mockRemoveEntity,
      })) as never);
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
      mockDeleteInvoice.mockReturnValueOnce(actionSuccess<void>(undefined));

      const hookResult = renderHook(() => useInvoiceDelete());
      const {result} = hookResult;

      await invokeHookCallback(hookResult, (current) => current.deleteInvoiceCallback(testInvoiceId));

      expect(result.current.isDeleting).toBe(false);

      expect(mockDeleteInvoice).toHaveBeenCalledWith({invoiceId: testInvoiceId});
      expect(mockRemoveEntity).toHaveBeenCalledWith(testInvoiceId);
      expect(mockToast.success).toHaveBeenCalledWith("Invoice deleted successfully");
      expect(mockRouter.push).toHaveBeenCalledWith("/domains/invoices/view-invoices");
    });

    it("handles deletion failure with error toast", async () => {
      mockDeleteInvoice.mockReturnValueOnce(
        actionFailure({code: "NOT_FOUND", message: "Not found"}),
      );

      const hookResult = renderHook(() => useInvoiceDelete());
      const {result} = hookResult;

      await invokeHookCallback(hookResult, (current) => current.deleteInvoiceCallback(testInvoiceId));

      expect(result.current.isDeleting).toBe(false);

      expect(mockDeleteInvoice).toHaveBeenCalledWith({invoiceId: testInvoiceId});
      expect(mockRemoveEntity).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("handles thrown exception during deletion", async () => {
      const testError = new Error("Network error");
      mockDeleteInvoice.mockRejectedValue(testError);

      const hookResult = renderHook(() => useInvoiceDelete());
      const {result} = hookResult;

      await invokeHookCallback(hookResult, (current) => current.deleteInvoiceCallback(testInvoiceId));

      expect(result.current.isDeleting).toBe(false);

      expect(mockDeleteInvoice).toHaveBeenCalledWith({invoiceId: testInvoiceId});
      expect(mockRemoveEntity).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("handles non-error thrown values during deletion", async () => {
      mockDeleteInvoice.mockRejectedValue("literal failure");

      const hookResult = renderHook(() => useInvoiceDelete());
      const {result} = hookResult;

      await invokeHookCallback(hookResult, (current) => current.deleteInvoiceCallback(testInvoiceId));

      expect(result.current.isDeleting).toBe(false);

      expect(mockRemoveEntity).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith("Failed to delete invoice: literal failure");
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("resets isDeleting flag even on error", async () => {
      mockDeleteInvoice.mockRejectedValue(new Error("Test error"));

      const hookResult = renderHook(() => useInvoiceDelete());
      const {result} = hookResult;

      await invokeHookCallback(hookResult, (current) => current.deleteInvoiceCallback(testInvoiceId));

      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe("bulk deletion", () => {
    const invoiceIds = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ];

    it("successfully deletes all invoices", async () => {
      mockDeleteInvoice.mockReturnValue(actionSuccess<void>(undefined));

      const hookResult = renderHook(() => useInvoiceDelete());
      const {result} = hookResult;

      const bulkResult = await invokeHookCallback(hookResult, (current) => current.deleteInvoiceCallback(invoiceIds));

      expect(result.current.isDeleting).toBe(false);

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
      mockDeleteInvoice
        .mockReturnValueOnce(actionSuccess<void>(undefined))
        .mockReturnValueOnce(actionFailure({code: "UNKNOWN_ERROR", message: "Error"}))
        .mockReturnValueOnce(actionSuccess<void>(undefined));

      const hookResult = renderHook(() => useInvoiceDelete());
      const {result} = hookResult;

      const bulkResult = await invokeHookCallback(hookResult, (current) => current.deleteInvoiceCallback(invoiceIds));

      expect(result.current.isDeleting).toBe(false);

      expect(bulkResult).toEqual({
        successCount: 2,
        failureCount: 1,
        failedIds: [invoiceIds[1]],
      });
      expect(mockToast.info).toHaveBeenCalledWith("2 deleted, 1 failed");
    });

    it("handles all failures in bulk deletion", async () => {
      mockDeleteInvoice.mockReturnValue(
        actionFailure({code: "UNKNOWN_ERROR", message: "Error"}),
      );

      const hookResult = renderHook(() => useInvoiceDelete());
      const {result} = hookResult;

      const bulkResult = await invokeHookCallback(hookResult, (current) => current.deleteInvoiceCallback(invoiceIds));

      expect(result.current.isDeleting).toBe(false);

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
      mockDeleteInvoice
        .mockRejectedValueOnce(new Error("Network error"))
        .mockReturnValueOnce(actionSuccess<void>(undefined));

      const {result} = renderHook(() => useInvoiceDelete());

      const bulkResult = await result.current.deleteInvoiceCallback(invoiceIds.slice(0, 2));

      expect(bulkResult.successCount).toBe(1);
      expect(bulkResult.failureCount).toBe(1);
      expect(mockDeleteInvoice).toHaveBeenCalledTimes(2);
    });
  });

  describe("loading state management", () => {
    it("sets isDeleting true during single deletion", async () => {
      let resolveDelete: ((value: Awaited<ReturnType<typeof actionSuccess<void>>>) => void) | undefined;
      const deletePromise = new Promise<Awaited<ReturnType<typeof actionSuccess<void>>>>((resolve) => {
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
      let resolveDelete: ((value: Awaited<ReturnType<typeof actionSuccess<void>>>) => void) | undefined;
      const deletePromise = new Promise<Awaited<ReturnType<typeof actionSuccess<void>>>>((resolve) => {
        resolveDelete = resolve;
      });

      mockDeleteInvoice.mockReturnValue(deletePromise);

      const {result} = renderHook(() => useInvoiceDelete());

      let promise: Promise<Readonly<{successCount: number; failureCount: number; failedIds: readonly string[]}>> | undefined;
      act(() => {
        promise = result.current.deleteInvoiceCallback([testInvoiceId]);
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true);
      });

      await act(async () => {
        resolveDelete!({success: true, data: undefined});
        await promise;
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });
  });

  describe("store integration", () => {
    it("calls removeEntity for successful single deletion", async () => {
      mockDeleteInvoice.mockReturnValueOnce(actionSuccess<void>(undefined));

      const {result} = renderHook(() => useInvoiceDelete());

      await result.current.deleteInvoiceCallback(testInvoiceId);

      expect(mockRemoveEntity).toHaveBeenCalledWith(testInvoiceId);
      expect(mockRemoveEntity).toHaveBeenCalledTimes(1);
    });

    it("does not call removeEntity on deletion failure", async () => {
      mockDeleteInvoice.mockReturnValueOnce(
        actionFailure({code: "UNKNOWN_ERROR", message: "Error"}),
      );

      const {result} = renderHook(() => useInvoiceDelete());

      await result.current.deleteInvoiceCallback(testInvoiceId);

      expect(mockRemoveEntity).not.toHaveBeenCalled();
    });

    it("calls removeEntity for each successful bulk deletion", async () => {
      mockDeleteInvoice.mockReturnValue(actionSuccess<void>(undefined));

      const {result} = renderHook(() => useInvoiceDelete());

      await result.current.deleteInvoiceCallback([testInvoiceId, "22222222-2222-4222-8222-222222222222"]);

      expect(mockRemoveEntity).toHaveBeenCalledTimes(2);
    });
  });
});
