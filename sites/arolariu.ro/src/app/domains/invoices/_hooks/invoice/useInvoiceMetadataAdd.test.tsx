/**
 * @fileoverview Unit tests for useInvoiceMetadataAdd client hook.
 * @module app/domains/invoices/_hooks/invoice/useInvoiceMetadataAdd.test
 */

import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder, invokeHookCallback} from "../../../../../../tests/helpers";
import {useInvoiceMetadataAdd} from "./useInvoiceMetadataAdd";

// Mock dependencies
vi.mock("@/stores", () => ({
  useInvoicesStore: vi.fn(),
}));

vi.mock("../../_actions/invoices", () => ({
  addInvoiceMetadata: vi.fn(),
}));

// Import mocked modules
const {useInvoicesStore} = await import("@/stores");
const {addInvoiceMetadata} = await import("../../_actions/invoices");

const mockUseInvoicesStore = vi.mocked(useInvoicesStore);
const mockAddInvoiceMetadata = vi.mocked(addInvoiceMetadata);

describe("useInvoiceMetadataAdd", () => {
  const testInvoice = TestDataBuilder.build("invoice", {
    id: "11111111-1111-4111-8111-111111111111",
    additionalMetadata: {existingKey: "existingValue"},
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
    it("returns isAdding false initially", () => {
      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      expect(result.current.isAdding).toBe(false);
      expect(result.current.addMetadataCallback).toBeDefined();
    });

    it("returns addMetadataCallback function", () => {
      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      expect(typeof result.current.addMetadataCallback).toBe("function");
    });
  });

  describe("single metadata addition", () => {
    it("successfully adds a metadata field", async () => {
      mockAddInvoiceMetadata.mockReturnValueOnce(TestDataBuilder.actionSuccess<void>(undefined));

      const hookResult = renderHook(() => useInvoiceMetadataAdd(testInvoice));
      const {result} = hookResult;

      await invokeHookCallback(hookResult, (current) => current.addMetadataCallback("newKey", "newValue"));

      expect(result.current.isAdding).toBe(false);

      expect(mockAddInvoiceMetadata).toHaveBeenCalledWith({
        invoiceId: testInvoice.id,
        entries: {newKey: "newValue"},
      });

      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        additionalMetadata: {
          existingKey: "existingValue",
          newKey: "newValue",
        },
      });
    });

    it("overwrites existing metadata field", async () => {
      mockAddInvoiceMetadata.mockReturnValueOnce(TestDataBuilder.actionSuccess<void>(undefined));

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      await result.current.addMetadataCallback("existingKey", "updatedValue");

      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        additionalMetadata: {
          existingKey: "updatedValue",
        },
      });
    });

    it("throws error when value is undefined", async () => {
      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      await expect(async () => {
        await (result.current.addMetadataCallback as (key: string, value?: string) => Promise<void>)("key");
      }).rejects.toThrow("Value must be specified for single metadata addition");
    });

    it("handles server action failure", async () => {
      mockAddInvoiceMetadata.mockReturnValueOnce(TestDataBuilder.actionFailure({code: "SERVER_ERROR", message: "Server error"}));

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      await expect(async () => {
        await result.current.addMetadataCallback("key", "value");
      }).rejects.toThrow("Server error");

      await waitFor(() => {
        expect(result.current.isAdding).toBe(false);
      });

      expect(mockUpdateEntity).not.toHaveBeenCalled();
    });

    it("handles thrown exception", async () => {
      const testError = new Error("Network error");
      mockAddInvoiceMetadata.mockRejectedValue(testError);

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      await expect(async () => {
        await result.current.addMetadataCallback("key", "value");
      }).rejects.toThrow("Network error");

      expect(mockUpdateEntity).not.toHaveBeenCalled();
    });

    it("resets isAdding flag even on error", async () => {
      mockAddInvoiceMetadata.mockReturnValueOnce(TestDataBuilder.actionFailure({code: "UNKNOWN_ERROR", message: "Error"}));

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      await expect(async () => {
        await result.current.addMetadataCallback("key", "value");
      }).rejects.toThrow();

      await waitFor(() => {
        expect(result.current.isAdding).toBe(false);
      });
    });
  });

  describe("bulk metadata addition", () => {
    it("successfully adds multiple metadata fields", async () => {
      mockAddInvoiceMetadata.mockReturnValue(TestDataBuilder.actionSuccess<void>(undefined));

      const hookResult = renderHook(() => useInvoiceMetadataAdd(testInvoice));
      const {result} = hookResult;

      const metadataToAdd = {
        key1: "value1",
        key2: "value2",
        key3: "value3",
      };

      const bulkResult = await invokeHookCallback(hookResult, (current) => current.addMetadataCallback(metadataToAdd));

      expect(result.current.isAdding).toBe(false);

      expect(mockAddInvoiceMetadata).toHaveBeenCalledTimes(3);
      expect(mockUpdateEntity).toHaveBeenCalledTimes(3);
      expect(bulkResult).toEqual({
        successCount: 3,
        failureCount: 0,
        failedItems: [],
      });
    });

    it("handles partial failure in bulk addition", async () => {
      const successResult = TestDataBuilder.actionSuccess<void>(undefined);
      const errorResult = TestDataBuilder.actionFailure({code: "UNKNOWN_ERROR", message: "Error"});

      mockAddInvoiceMetadata.mockReturnValueOnce(successResult).mockReturnValueOnce(errorResult).mockReturnValueOnce(successResult);

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      const bulkResult = await result.current.addMetadataCallback({
        key1: "value1",
        key2: "value2",
        key3: "value3",
      });

      expect(bulkResult).toEqual({
        successCount: 2,
        failureCount: 1,
        failedItems: [{key: "key2", value: "value2"}],
      });
    });

    it("handles all failures in bulk addition", async () => {
      const errorResult = TestDataBuilder.actionFailure({code: "UNKNOWN_ERROR", message: "Error"});
      mockAddInvoiceMetadata.mockReturnValue(errorResult);

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      const bulkResult = await result.current.addMetadataCallback({
        key1: "value1",
        key2: "value2",
      });

      expect(bulkResult).toEqual({
        successCount: 0,
        failureCount: 2,
        failedItems: [
          {key: "key1", value: "value1"},
          {key: "key2", value: "value2"},
        ],
      });
    });

    it("handles empty metadata object", async () => {
      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      const bulkResult = await result.current.addMetadataCallback({});

      expect(bulkResult).toEqual({
        successCount: 0,
        failureCount: 0,
        failedItems: [],
      });
      expect(mockAddInvoiceMetadata).not.toHaveBeenCalled();
    });

    it("continues processing after individual failure", async () => {
      mockAddInvoiceMetadata
        .mockRejectedValueOnce(new Error("Network error"))
        .mockReturnValueOnce(TestDataBuilder.actionSuccess<void>(undefined));

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      const bulkResult = await result.current.addMetadataCallback({
        key1: "value1",
        key2: "value2",
      });

      expect(bulkResult.successCount).toBe(1);
      expect(bulkResult.failureCount).toBe(1);
      expect(mockAddInvoiceMetadata).toHaveBeenCalledTimes(2);
    });
  });

  describe("loading state management", () => {
    it("sets isAdding true during single addition", async () => {
      let resolveAdd: ((value: Awaited<ReturnType<typeof TestDataBuilder.actionSuccess<void>>>) => void) | undefined;
      const addPromise = new Promise<Awaited<ReturnType<typeof TestDataBuilder.actionSuccess<void>>>>((resolve) => {
        resolveAdd = resolve;
      });

      mockAddInvoiceMetadata.mockReturnValue(addPromise);

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      let promise: Promise<void> | undefined;
      act(() => {
        promise = result.current.addMetadataCallback("key", "value");
      });

      await waitFor(() => {
        expect(result.current.isAdding).toBe(true);
      });

      resolveAdd!({success: true, data: undefined});
      await act(async () => {
        resolveAdd!({success: true, data: undefined});
        await promise;
      });
    });

    it("sets isAdding true during bulk addition", async () => {
      let resolveAdd: ((value: Awaited<ReturnType<typeof TestDataBuilder.actionSuccess<void>>>) => void) | undefined;
      const addPromise = new Promise<Awaited<ReturnType<typeof TestDataBuilder.actionSuccess<void>>>>((resolve) => {
        resolveAdd = resolve;
      });

      mockAddInvoiceMetadata.mockReturnValue(addPromise);

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      let promise:
        | Promise<Readonly<{successCount: number; failureCount: number; failedItems: readonly {key: string; value: string}[]}>>
        | undefined;
      act(() => {
        promise = result.current.addMetadataCallback({key: "value"});
      });

      await waitFor(() => {
        expect(result.current.isAdding).toBe(true);
      });

      await act(async () => {
        resolveAdd!({success: true, data: undefined});
        await promise;
      });

      await waitFor(() => {
        expect(result.current.isAdding).toBe(false);
      });
    });
  });

  describe("store integration", () => {
    it("merges new metadata with existing metadata", async () => {
      mockAddInvoiceMetadata.mockReturnValueOnce(TestDataBuilder.actionSuccess<void>(undefined));

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      await result.current.addMetadataCallback("newKey", "newValue");

      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        additionalMetadata: {
          existingKey: "existingValue",
          newKey: "newValue",
        },
      });
    });

    it("updates client store for each successful bulk addition", async () => {
      mockAddInvoiceMetadata.mockReturnValue(TestDataBuilder.actionSuccess<void>(undefined));

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      await result.current.addMetadataCallback({
        key1: "value1",
        key2: "value2",
      });

      expect(mockUpdateEntity).toHaveBeenCalledTimes(2);
    });

    it("does not update store on failure", async () => {
      mockAddInvoiceMetadata.mockReturnValueOnce(TestDataBuilder.actionFailure({code: "UNKNOWN_ERROR", message: "Error"}));

      const {result} = renderHook(() => useInvoiceMetadataAdd(testInvoice));

      await expect(async () => {
        await result.current.addMetadataCallback("key", "value");
      }).rejects.toThrow();

      expect(mockUpdateEntity).not.toHaveBeenCalled();
    });
  });
});
