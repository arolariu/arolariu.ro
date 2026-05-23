import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {deleteInvoiceMetadata} from "@/lib/actions/invoices/deleteInvoiceMetadata";
import type {Invoice} from "@/types/invoices";
import {useMetadataRemove} from "./useMetadataRemove";

vi.mock("@/lib/actions/invoices/deleteInvoiceMetadata", () => ({
  deleteInvoiceMetadata: vi.fn(),
}));

const mockInvoice = {
  id: "inv-1",
} as Invoice;

vi.mock("../edit-invoice/[id]/_context/EditInvoiceContext", () => ({
  useEditInvoiceContext: () => ({invoice: mockInvoice}),
}));

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

describe("useMetadataRemove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes invoice metadata by key", async () => {
    vi.mocked(deleteInvoiceMetadata).mockResolvedValueOnce(undefined);

    const {result} = renderHook(() => useMetadataRemove());

    await act(async () => {
      await result.current.performRemove("color");
    });

    expect(deleteInvoiceMetadata).toHaveBeenCalledWith({invoiceId: "inv-1", key: "color"});
  });

  it("propagates action failures and resets isRemoving", async () => {
    const expectedError = new Error("nope");
    vi.mocked(deleteInvoiceMetadata).mockRejectedValueOnce(expectedError);

    const {result} = renderHook(() => useMetadataRemove());

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

    const {result} = renderHook(() => useMetadataRemove());

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
});
