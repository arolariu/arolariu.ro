/**
 * @fileoverview Unit tests for useProductAdd client hook.
 * @module app/domains/invoices/_hooks/product/useProductAdd.test
 */

import type {ServerActionResult} from "@/lib/utils.server";
import type {Product} from "@/types/invoices";
import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder, invokeHookCallback} from "../../../../../../tests/helpers";
import {useProductAdd} from "./useProductAdd";

vi.mock("@/stores", () => ({
  useInvoicesStore: vi.fn(),
}));

vi.mock("../../_actions/invoices", () => ({
  addInvoiceProduct: vi.fn(),
}));

const {useInvoicesStore} = await import("@/stores");
const {addInvoiceProduct} = await import("../../_actions/invoices");

const mockUseInvoicesStore = vi.mocked(useInvoicesStore);
const mockAddInvoiceProduct = vi.mocked(addInvoiceProduct);

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

function toNestedResult<T>(result: ServerActionResult<T>): Promise<ServerActionResult<T>> {
  return new Promise<ServerActionResult<T>>((resolve) => {
    resolve(result);
  });
}

function mockInvoiceStore(updateEntity = vi.fn()): void {
  TestDataBuilder.mockEntityStoreSelector(mockUseInvoicesStore, TestDataBuilder.entityStore({updateEntity}));
}

describe("useProductAdd", () => {
  const existingProduct = TestDataBuilder.build("product", {name: "Coffee"});
  const productToAdd = TestDataBuilder.build("product", {name: "Milk", price: 7, totalPrice: 7});
  const addedProduct = TestDataBuilder.build("product", {name: "Milk", price: 7, totalPrice: 7, productCode: "server-id"});
  const invoice = TestDataBuilder.build("invoice", {items: [existingProduct]});
  const mockUpdateEntity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoiceStore(mockUpdateEntity);
    mockAddInvoiceProduct.mockResolvedValue({success: true, data: addedProduct});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns idle state and callback", () => {
    const {result} = renderHook(() => useProductAdd({invoice}));

    expect(result.current.isAdding).toBe(false);
    expect(typeof result.current.addProductCallback).toBe("function");
  });

  it("adds a product server-side, mirrors it locally, and returns the created product", async () => {
    const hookResult = renderHook(() => useProductAdd({invoice}));

    const returnedProduct = await invokeHookCallback(hookResult, (current) => current.addProductCallback(productToAdd));

    expect(returnedProduct).toEqual(addedProduct);
    expect(mockAddInvoiceProduct).toHaveBeenCalledWith({
      invoiceId: invoice.id,
      product: productToAdd,
    });
    expect(mockUpdateEntity).toHaveBeenCalledWith(invoice.id, {
      items: [existingProduct, addedProduct],
    });
  });

  it("sets isAdding true while the server action is pending", async () => {
    const deferred = createDeferred<Awaited<ServerActionResult<Product>>>();
    mockAddInvoiceProduct.mockImplementation(() => toNestedResult(deferred.promise));

    const {result} = renderHook(() => useProductAdd({invoice}));

    let addPromise: Promise<Product> | undefined;
    act(() => {
      addPromise = result.current.addProductCallback(productToAdd);
    });

    await waitFor(() => {
      expect(result.current.isAdding).toBe(true);
    });

    deferred.resolve({success: true, data: addedProduct});
    await act(async () => {
      await addPromise;
    });

    expect(result.current.isAdding).toBe(false);
  });

  it("throws server action failures and skips the local update", async () => {
    mockAddInvoiceProduct.mockReturnValueOnce(
      toNestedResult(TestDataBuilder.actionFailure({code: "UNKNOWN_ERROR", message: "Failed to add product"})),
    );

    const {result} = renderHook(() => useProductAdd({invoice}));

    await expect(async () => {
      await result.current.addProductCallback(productToAdd);
    }).rejects.toThrow("Failed to add product");

    expect(mockUpdateEntity).not.toHaveBeenCalled();
    expect(result.current.isAdding).toBe(false);
  });

  it("surfaces thrown server errors and resets adding state", async () => {
    mockAddInvoiceProduct.mockRejectedValue(new Error("Network failure"));

    const {result} = renderHook(() => useProductAdd({invoice}));

    await expect(async () => {
      await result.current.addProductCallback(productToAdd);
    }).rejects.toThrow("Network failure");

    expect(mockUpdateEntity).not.toHaveBeenCalled();
    expect(result.current.isAdding).toBe(false);
  });

  it("surfaces local store update failures after a successful server add", async () => {
    const localUpdateError = new Error("IndexedDB unavailable");
    mockInvoiceStore(
      vi.fn(() => {
        throw localUpdateError;
      }),
    );

    const {result} = renderHook(() => useProductAdd({invoice}));

    await expect(async () => {
      await result.current.addProductCallback(productToAdd);
    }).rejects.toThrow(localUpdateError);

    expect(mockAddInvoiceProduct).toHaveBeenCalledOnce();
    expect(result.current.isAdding).toBe(false);
  });
});
