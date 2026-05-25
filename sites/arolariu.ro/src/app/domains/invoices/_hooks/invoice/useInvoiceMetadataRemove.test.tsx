import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {deleteInvoiceMetadata} from "@/lib/actions/invoices/deleteInvoiceMetadata";
import type {Invoice} from "@/types/invoices";
import {useInvoiceMetadataRemove} from "./useInvoiceMetadataRemove";

vi.mock("@/lib/actions/invoices/deleteInvoiceMetadata", () => ({
  deleteInvoiceMetadata: vi.fn(),
}));

const mockInvoice = {
  id: "inv-1",
} as Invoice;

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
}>;

function createDeferred<T>(): Deferred<T> {
  let resolveDeferred: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolveDeferred = resolve;
  });

  if (!resolveDeferred) {
    throw new Error("Deferred promise resolver was not initialized.");
  }

  return {promise, resolve: resolveDeferred};
}

describe("useInvoiceMetadataRemove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes invoice metadata by key", async () => {
    vi.mocked(deleteInvoiceMetadata).mockResolvedValueOnce(undefined);

    const {result} = renderHook(() => useInvoiceMetadataRemove(mockInvoice));

    await act(async () => {
      await result.current.performRemove("color");
    });

    expect(deleteInvoiceMetadata).toHaveBeenCalledWith({invoiceId: "inv-1", key: "color"});
  });

  it("propagates action failures and resets isRemoving", async () => {
    const expectedError = new Error("nope");
    vi.mocked(deleteInvoiceMetadata).mockRejectedValueOnce(expectedError);

    const {result} = renderHook(() => useInvoiceMetadataRemove(mockInvoice));

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.performRemove("color");
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBe(expectedError);
    expect(result.current.isRemoving).toBe(false);
  });

  it("sets isRemoving true while the delete request is pending and false after completion", async () => {
    const deferred = createDeferred<void>();
    vi.mocked(deleteInvoiceMetadata).mockReturnValueOnce(deferred.promise);

    const {result} = renderHook(() => useInvoiceMetadataRemove(mockInvoice));

    let pendingRemove: Promise<void> | undefined;
    act(() => {
      pendingRemove = result.current.performRemove("color");
    });

    expect(result.current.isRemoving).toBe(true);

    await act(async () => {
      deferred.resolve(undefined);
      await pendingRemove;
    });

    expect(result.current.isRemoving).toBe(false);
  });

  it("handles empty record bulk removal smoothly", async () => {
    const {result} = renderHook(() => useInvoiceMetadataRemove(mockInvoice));

    let bulkResult: any;
    await act(async () => {
      bulkResult = await result.current.performRemove([]);
    });

    expect(bulkResult).toEqual({
      successCount: 0,
      failureCount: 0,
      failedKeys: [],
    });
    expect(deleteInvoiceMetadata).not.toHaveBeenCalled();
  });

  it("performs sequential bulk metadata deletions and returns detailed results", async () => {
    vi.mocked(deleteInvoiceMetadata)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const {result} = renderHook(() => useInvoiceMetadataRemove(mockInvoice));

    let bulkResult: any;
    await act(async () => {
      bulkResult = await result.current.performRemove(["key1", "key2"]);
    });

    expect(bulkResult).toEqual({
      successCount: 2,
      failureCount: 0,
      failedKeys: [],
    });
    expect(deleteInvoiceMetadata).toHaveBeenCalledTimes(2);
    expect(deleteInvoiceMetadata).toHaveBeenNthCalledWith(1, {invoiceId: "inv-1", key: "key1"});
    expect(deleteInvoiceMetadata).toHaveBeenNthCalledWith(2, {invoiceId: "inv-1", key: "key2"});
  });

  it("isolates failures and supports partial success for bulk metadata deletions", async () => {
    vi.mocked(deleteInvoiceMetadata)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("failed key2"));

    const {result} = renderHook(() => useInvoiceMetadataRemove(mockInvoice));

    let bulkResult: any;
    await act(async () => {
      bulkResult = await result.current.performRemove(["key1", "key2"]);
    });

    expect(bulkResult).toEqual({
      successCount: 1,
      failureCount: 1,
      failedKeys: ["key2"],
    });
    expect(deleteInvoiceMetadata).toHaveBeenCalledTimes(2);
  });
});
