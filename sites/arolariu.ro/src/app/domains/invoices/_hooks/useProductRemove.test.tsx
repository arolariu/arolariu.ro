import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import deleteProduct from "@/lib/actions/invoices/deleteProduct";
import type {Invoice} from "@/types/invoices";
import {useProductRemove} from "./useProductRemove";

vi.mock("@/lib/actions/invoices/deleteProduct", () => ({
  default: vi.fn(),
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

describe("useProductRemove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes a product by name", async () => {
    vi.mocked(deleteProduct).mockResolvedValueOnce({success: true});

    const {result} = renderHook(() => useProductRemove());

    await act(async () => {
      await result.current.performRemove("Milk");
    });

    expect(deleteProduct).toHaveBeenCalledWith({
      invoiceId: "inv-1",
      payload: {productName: "Milk"},
    });
  });

  it("throws when deleteProduct reports failure", async () => {
    vi.mocked(deleteProduct).mockResolvedValueOnce({success: false, error: "nope"});

    const {result} = renderHook(() => useProductRemove());

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.performRemove("Milk");
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toMatchObject({message: "nope"});
  });

  it("sets isRemoving true while the delete request is pending and false after completion", async () => {
    const deferred = createDeferred<{success: true}>();
    vi.mocked(deleteProduct).mockReturnValueOnce(deferred.promise);

    const {result} = renderHook(() => useProductRemove());

    let pendingRemove: Promise<void> | undefined;
    act(() => {
      pendingRemove = result.current.performRemove("Milk");
    });

    expect(result.current.isRemoving).toBe(true);

    await act(async () => {
      deferred.resolve({success: true});
      await pendingRemove;
    });

    expect(result.current.isRemoving).toBe(false);
  });
});
