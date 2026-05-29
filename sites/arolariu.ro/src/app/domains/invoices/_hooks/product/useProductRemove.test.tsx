/**
 * @fileoverview Unit tests for useProductRemove client hook.
 * @module app/domains/invoices/_hooks/product/useProductRemove.test
 */

import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {ServerActionResult} from "@/lib/utils.server";
import type {Product} from "@/types/invoices";
import {buildInvoice, buildProduct} from "../../../../../../tests/helpers/invoiceDomain";
import {invokeHookCallback} from "../../../../../../tests/helpers";
import {useProductRemove} from "./useProductRemove";

vi.mock("@/stores", () => ({
  useInvoicesStore: vi.fn(),
}));

vi.mock("../../_actions/invoices", () => ({
  deleteInvoiceProduct: vi.fn(),
}));

const {useInvoicesStore} = await import("@/stores");
const {deleteInvoiceProduct} = await import("../../_actions/invoices");

const mockUseInvoicesStore = vi.mocked(useInvoicesStore);
const mockDeleteInvoiceProduct = vi.mocked(deleteInvoiceProduct);

type InvoiceStoreSelectorState = Readonly<{
  updateEntity: (invoiceId: string, updates: Readonly<{items: ReadonlyArray<Product>}>) => void;
}>;

function createDeferred<T>(): Readonly<{
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
}> {
  let resolveDeferred: ((value: T | PromiseLike<T>) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolveDeferred = resolve;
  });

  if (!resolveDeferred) {
    throw new Error("Failed to create deferred promise");
  }

  return {promise, resolve: resolveDeferred};
}

function mockInvoiceStore(updateEntity = vi.fn()): void {
  mockUseInvoicesStore.mockImplementation((selector: (state: InvoiceStoreSelectorState) => unknown) =>
    selector({updateEntity}),
  );
}

describe("useProductRemove", () => {
  const productToRemove = buildProduct({name: "Coffee"});
  const matchingDuplicate = buildProduct({name: "Coffee", quantity: 2});
  const retainedProduct = buildProduct({name: "Milk"});
  const invoice = buildInvoice({items: [productToRemove, retainedProduct, matchingDuplicate]});
  const mockUpdateEntity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoiceStore(mockUpdateEntity);
    mockDeleteInvoiceProduct.mockResolvedValue({success: true, data: undefined});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns idle state and callback", () => {
    const {result} = renderHook(() => useProductRemove(invoice));

    expect(result.current.isRemoving).toBe(false);
    expect(typeof result.current.removeProductCallback).toBe("function");
  });

  it("removes a product server-side and mirrors exact-name removal locally", async () => {
    const {result} = renderHook(() => useProductRemove(invoice));

    await invokeHookCallback(() => result.current.removeProductCallback(productToRemove.name));

    expect(mockDeleteInvoiceProduct).toHaveBeenCalledWith({
      invoiceId: invoice.id,
      productName: productToRemove.name,
    });
    expect(mockUpdateEntity).toHaveBeenCalledWith(invoice.id, {
      items: [retainedProduct],
    });
  });

  it("sets isRemoving true while the server action is pending", async () => {
    const deferred = createDeferred<ServerActionResult<void>>();
    mockDeleteInvoiceProduct.mockReturnValue(deferred.promise);

    const {result} = renderHook(() => useProductRemove(invoice));

    let removePromise: Promise<void> | undefined;
    act(() => {
      removePromise = result.current.removeProductCallback(productToRemove.name);
    });

    await waitFor(() => {
      expect(result.current.isRemoving).toBe(true);
    });

    deferred.resolve({success: true, data: undefined});
    await act(async () => {
      await removePromise;
    });

    expect(result.current.isRemoving).toBe(false);
  });

  it("throws server action failures and skips the local update", async () => {
    mockDeleteInvoiceProduct.mockResolvedValue({
      success: false,
      error: {message: "Failed to remove product", userMessage: "Try again"},
    });

    const {result} = renderHook(() => useProductRemove(invoice));

    await expect(async () => {
      await result.current.removeProductCallback(productToRemove.name);
    }).rejects.toThrow("Failed to remove product");

    expect(mockUpdateEntity).not.toHaveBeenCalled();
    expect(result.current.isRemoving).toBe(false);
  });

  it("surfaces thrown server errors and resets removing state", async () => {
    mockDeleteInvoiceProduct.mockRejectedValue(new Error("Network failure"));

    const {result} = renderHook(() => useProductRemove(invoice));

    await expect(async () => {
      await result.current.removeProductCallback(productToRemove.name);
    }).rejects.toThrow("Network failure");

    expect(mockUpdateEntity).not.toHaveBeenCalled();
    expect(result.current.isRemoving).toBe(false);
  });

  it("surfaces local store update failures after a successful server removal", async () => {
    const localUpdateError = new Error("IndexedDB unavailable");
    mockInvoiceStore(vi.fn(() => {
      throw localUpdateError;
    }));

    const {result} = renderHook(() => useProductRemove(invoice));

    await expect(async () => {
      await result.current.removeProductCallback(productToRemove.name);
    }).rejects.toThrow(localUpdateError);

    expect(mockDeleteInvoiceProduct).toHaveBeenCalledOnce();
    expect(result.current.isRemoving).toBe(false);
  });
});

