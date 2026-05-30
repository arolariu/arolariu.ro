/**
 * @fileoverview Unit tests for useInvoiceMetadataRemove client hook.
 * @module app/domains/invoices/_hooks/invoice/useInvoiceMetadataRemove.test
 */

import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder, invokeHookCallback} from "../../../../../../tests/helpers";
import {useInvoiceMetadataRemove} from "./useInvoiceMetadataRemove";

// Mock dependencies
vi.mock("@/stores", () => ({
  useInvoicesStore: vi.fn(),
}));

vi.mock("../../_actions/invoices", () => ({
  deleteInvoiceMetadata: vi.fn(),
}));

// Import mocked modules
const {useInvoicesStore} = await import("@/stores");
const {deleteInvoiceMetadata} = await import("../../_actions/invoices");

const mockUseInvoicesStore = vi.mocked(useInvoicesStore);
const mockDeleteInvoiceMetadata = vi.mocked(deleteInvoiceMetadata);

describe("useInvoiceMetadataRemove", () => {
  const testInvoice = TestDataBuilder.build("invoice", {
    id: "11111111-1111-4111-8111-111111111111",
    additionalMetadata: {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    },
  });
  const mockUpdateEntity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInvoicesStore.mockImplementation(((selector: (state: {updateEntity: typeof mockUpdateEntity}) => typeof mockUpdateEntity) =>
      selector({
        updateEntity: mockUpdateEntity,
      })) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("returns isRemoving false initially", () => {
      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      expect(result.current.isRemoving).toBe(false);
      expect(result.current.removeMetadataCallback).toBeDefined();
    });

    it("returns removeMetadataCallback function", () => {
      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      expect(typeof result.current.removeMetadataCallback).toBe("function");
    });
  });

  describe("single metadata removal", () => {
    it("successfully removes a metadata field", async () => {
      mockDeleteInvoiceMetadata.mockReturnValueOnce(TestDataBuilder.actionSuccess<void>(undefined));

      const hookResult = renderHook(() => useInvoiceMetadataRemove(testInvoice));
      const {result} = hookResult;

      await invokeHookCallback(hookResult, (current) => current.removeMetadataCallback("key1"));

      expect(result.current.isRemoving).toBe(false);

      expect(mockDeleteInvoiceMetadata).toHaveBeenCalledWith({
        invoiceId: testInvoice.id,
        key: "key1",
      });

      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        additionalMetadata: {
          key1: undefined,
          key2: "value2",
          key3: "value3",
        },
      });
    });

    it("removes non-existent key without error", async () => {
      mockDeleteInvoiceMetadata.mockReturnValueOnce(TestDataBuilder.actionSuccess<void>(undefined));

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      await result.current.removeMetadataCallback("nonExistentKey");

      expect(mockDeleteInvoiceMetadata).toHaveBeenCalledWith({
        invoiceId: testInvoice.id,
        key: "nonExistentKey",
      });

      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        additionalMetadata: {
          ...testInvoice.additionalMetadata,
          nonExistentKey: undefined,
        },
      });
    });

    it("handles server action failure", async () => {
      mockDeleteInvoiceMetadata.mockReturnValueOnce(
        TestDataBuilder.actionFailure({code: "SERVER_ERROR", message: "Server error"}),
      );

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      await expect(async () => {
        await result.current.removeMetadataCallback("key1");
      }).rejects.toThrow("Server error");

      await waitFor(() => {
        expect(result.current.isRemoving).toBe(false);
      });

      expect(mockUpdateEntity).not.toHaveBeenCalled();
    });

    it("handles thrown exception", async () => {
      const testError = new Error("Network error");
      mockDeleteInvoiceMetadata.mockRejectedValue(testError);

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      await expect(async () => {
        await result.current.removeMetadataCallback("key1");
      }).rejects.toThrow("Network error");

      expect(mockUpdateEntity).not.toHaveBeenCalled();
    });

    it("resets isRemoving flag even on error", async () => {
      mockDeleteInvoiceMetadata.mockReturnValueOnce(
        TestDataBuilder.actionFailure({code: "UNKNOWN_ERROR", message: "Error"}),
      );

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      await expect(async () => {
        await result.current.removeMetadataCallback("key1");
      }).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.isRemoving).toBe(false);
      });
    });
  });

  describe("bulk metadata removal", () => {
    it("successfully removes multiple metadata fields", async () => {
      mockDeleteInvoiceMetadata.mockReturnValue(TestDataBuilder.actionSuccess<void>(undefined));

      const hookResult = renderHook(() => useInvoiceMetadataRemove(testInvoice));
      const {result} = hookResult;

      const bulkResult = await invokeHookCallback(hookResult, (current) => current.removeMetadataCallback(["key1", "key2", "key3"]));

      expect(result.current.isRemoving).toBe(false);

      expect(mockDeleteInvoiceMetadata).toHaveBeenCalledTimes(3);
      expect(mockUpdateEntity).toHaveBeenCalledTimes(3);
      expect(bulkResult).toEqual({
        successCount: 3,
        failureCount: 0,
        failedKeys: [],
      });
    });

    it("handles partial failure in bulk removal", async () => {
      const successResult = TestDataBuilder.actionSuccess<void>(undefined);
      const errorResult = TestDataBuilder.actionFailure({code: "UNKNOWN_ERROR", message: "Error"});

      mockDeleteInvoiceMetadata
        .mockReturnValueOnce(successResult)
        .mockReturnValueOnce(errorResult)
        .mockReturnValueOnce(successResult);

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      const bulkResult = await result.current.removeMetadataCallback(["key1", "key2", "key3"]);

      expect(bulkResult).toEqual({
        successCount: 2,
        failureCount: 1,
        failedKeys: ["key2"],
      });
    });

    it("handles all failures in bulk removal", async () => {
      mockDeleteInvoiceMetadata.mockReturnValue(
        TestDataBuilder.actionFailure({code: "UNKNOWN_ERROR", message: "Error"}),
      );

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      const bulkResult = await result.current.removeMetadataCallback(["key1", "key2"]);

      expect(bulkResult).toEqual({
        successCount: 0,
        failureCount: 2,
        failedKeys: ["key1", "key2"],
      });
    });

    it("handles empty keys array", async () => {
      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      const bulkResult = await result.current.removeMetadataCallback([]);

      expect(bulkResult).toEqual({
        successCount: 0,
        failureCount: 0,
        failedKeys: [],
      });
      expect(mockDeleteInvoiceMetadata).not.toHaveBeenCalled();
    });

    it("stops bulk removal when an empty key is encountered", async () => {
      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      const bulkResult = await result.current.removeMetadataCallback([""]);

      expect(bulkResult).toEqual({
        successCount: 0,
        failureCount: 0,
        failedKeys: [],
      });
      expect(mockDeleteInvoiceMetadata).not.toHaveBeenCalled();
      expect(mockUpdateEntity).not.toHaveBeenCalled();
    });

    it("continues processing after individual failure", async () => {
      mockDeleteInvoiceMetadata
        .mockRejectedValueOnce(new Error("Network error"))
        .mockReturnValueOnce(TestDataBuilder.actionSuccess<void>(undefined));

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      const bulkResult = await result.current.removeMetadataCallback(["key1", "key2"]);

      expect(bulkResult.successCount).toBe(1);
      expect(bulkResult.failureCount).toBe(1);
      expect(mockDeleteInvoiceMetadata).toHaveBeenCalledTimes(2);
    });
  });

  describe("loading state management", () => {
    it("sets isRemoving true during single removal", async () => {
      let resolveRemove: ((value: Awaited<ReturnType<typeof TestDataBuilder.actionSuccess<void>>>) => void) | undefined;
      const removePromise = new Promise<Awaited<ReturnType<typeof TestDataBuilder.actionSuccess<void>>>>((resolve) => {
        resolveRemove = resolve;
      });

      mockDeleteInvoiceMetadata.mockReturnValue(removePromise);

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      let promise: Promise<void> | undefined;
      act(() => {
        promise = result.current.removeMetadataCallback("key1");
      });

      await waitFor(() => {
        expect(result.current.isRemoving).toBe(true);
      });

      resolveRemove!({success: true, data: undefined});
      await act(async () => {
        resolveRemove!({success: true, data: undefined});
        await promise;
      });
    });

    it("sets isRemoving true during bulk removal", async () => {
      let resolveRemove: ((value: Awaited<ReturnType<typeof TestDataBuilder.actionSuccess<void>>>) => void) | undefined;
      const removePromise = new Promise<Awaited<ReturnType<typeof TestDataBuilder.actionSuccess<void>>>>((resolve) => {
        resolveRemove = resolve;
      });

      mockDeleteInvoiceMetadata.mockReturnValue(removePromise);

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      let promise: Promise<Readonly<{successCount: number; failureCount: number; failedKeys: readonly string[]}>> | undefined;
      act(() => {
        promise = result.current.removeMetadataCallback(["key1"]);
      });

      await waitFor(() => {
        expect(result.current.isRemoving).toBe(true);
      });

      await act(async () => {
        resolveRemove!({success: true, data: undefined});
        await promise;
      });

      await waitFor(() => {
        expect(result.current.isRemoving).toBe(false);
      });
    });
  });

  describe("store integration", () => {
    it("sets metadata field to undefined when removing", async () => {
      mockDeleteInvoiceMetadata.mockReturnValueOnce(TestDataBuilder.actionSuccess<void>(undefined));

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      await result.current.removeMetadataCallback("key1");

      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        additionalMetadata: {
          key1: undefined,
          key2: "value2",
          key3: "value3",
        },
      });
    });

    it("updates client store for each successful bulk removal", async () => {
      mockDeleteInvoiceMetadata.mockReturnValue(TestDataBuilder.actionSuccess<void>(undefined));

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      await result.current.removeMetadataCallback(["key1", "key2"]);

      expect(mockUpdateEntity).toHaveBeenCalledTimes(2);
    });

    it("does not update store on failure", async () => {
      const errorResult = TestDataBuilder.actionFailure({code: "UNKNOWN_ERROR", message: "Error"});
      mockDeleteInvoiceMetadata.mockReturnValue(errorResult);

      const {result} = renderHook(() => useInvoiceMetadataRemove(testInvoice));

      await expect(async () => {
        await result.current.removeMetadataCallback("key1");
      }).rejects.toThrow();

      expect(mockUpdateEntity).not.toHaveBeenCalled();
    });
  });
});
