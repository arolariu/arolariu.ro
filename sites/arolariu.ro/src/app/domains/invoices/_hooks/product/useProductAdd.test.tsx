/**
 * @fileoverview Unit tests for useProductAdd client hook.
 * @module app/domains/invoices/_hooks/product/useProductAdd.test
 */

import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {ServerActionResult} from "@/lib/utils.server";
import type {Product} from "@/types/invoices";
import {buildInvoice, buildProduct} from "../../../../../../tests/helpers/invoiceDomain";
import {invokeHookCallback} from "../../../../../../tests/helpers";
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

describe("useProductAdd", () => {
  const existingProduct = buildProduct({name: "Coffee"});
  const productToAdd = buildProduct({name: "Milk", price: 7, totalPrice: 7});
  const addedProduct = buildProduct({name: "Milk", price: 7, totalPrice: 7, productCode: "server-id"});
  const invoice = buildInvoice({items: [existingProduct]});
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
    const {result} = renderHook(() => useProductAdd({invoice}));

    const returnedProduct = await invokeHookCallback(() => result.current.addProductCallback(productToAdd));

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
    const deferred = createDeferred<ServerActionResult<Product>>();
    mockAddInvoiceProduct.mockReturnValue(deferred.promise);

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
    mockAddInvoiceProduct.mockResolvedValue({
      success: false,
      error: {message: "Failed to add product", userMessage: "Try again"},
    });

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
    mockInvoiceStore(vi.fn(() => {
      throw localUpdateError;
    }));

    const {result} = renderHook(() => useProductAdd({invoice}));

    await expect(async () => {
      await result.current.addProductCallback(productToAdd);
    }).rejects.toThrow(localUpdateError);

    expect(mockAddInvoiceProduct).toHaveBeenCalledOnce();
    expect(result.current.isAdding).toBe(false);
  });
});

