/**
 * @fileoverview Unit tests for useProductAdd client hook.
 * @module app/domains/invoices/_hooks/product/useProductAdd.test
 */

import {getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import type {Product, ProductMutation} from "@/types/invoices";
import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder, invokeHookCallback} from "../../../../../../tests/helpers";
import {useProductAdd} from "./useProductAdd";

vi.mock("@/stores", () => ({
  useInvoicesStore: vi.fn(),
}));

const {useInvoicesStore} = await import("@/stores");

const mockUseInvoicesStore = vi.mocked(useInvoicesStore);

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
  TestDataBuilder.mockEntityStoreSelector(mockUseInvoicesStore, TestDataBuilder.entityStore({updateEntity}));
}

describe("useProductAdd", () => {
  const existingProduct = TestDataBuilder.build("product", {name: "Coffee"});
  const productToAdd = {
    name: "Milk",
    classification: null,
    quantity: 1,
    quantityUnit: "pcs",
    productCode: "",
    price: 7,
  } satisfies ProductMutation;
  const addedProduct = TestDataBuilder.build("product", {name: "Milk", price: 7, totalPrice: 7, productCode: "server-id"});
  const invoice = TestDataBuilder.build("invoice", {items: [existingProduct]});
  const mockUpdateEntity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoiceStore(mockUpdateEntity);
    installAnalysisFetchHandler((request) =>
      request.url.endsWith("/products") ? Response.json(addedProduct, {status: 201}) : new Response(null),
    );
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
    expect(getAnalysisApiRequests()).toContainEqual(
      expect.objectContaining({
        url: expect.stringMatching(/\/products$/u),
        init: expect.objectContaining({body: JSON.stringify(productToAdd), method: "POST"}),
      }),
    );
    expect(mockUpdateEntity).toHaveBeenCalledWith(invoice.id, {
      items: [existingProduct, addedProduct],
    });
  });

  it("sets isAdding true while the server action is pending", async () => {
    const deferred = createDeferred<Response>();
    installAnalysisFetchHandler((request) => (request.url.endsWith("/products") ? deferred.promise : new Response(null)));

    const {result} = renderHook(() => useProductAdd({invoice}));

    let addPromise: Promise<Product> | undefined;
    act(() => {
      addPromise = result.current.addProductCallback(productToAdd);
    });

    await waitFor(() => {
      expect(result.current.isAdding).toBe(true);
    });

    deferred.resolve(Response.json(addedProduct, {status: 201}));
    await act(async () => {
      await addPromise;
    });

    expect(result.current.isAdding).toBe(false);
  });

  it("throws server action failures and skips the local update", async () => {
    installAnalysisFetchHandler((request) => (request.url.endsWith("/products") ? new Response(null, {status: 400}) : new Response(null)));

    const {result} = renderHook(() => useProductAdd({invoice}));

    await expect(async () => {
      await result.current.addProductCallback(productToAdd);
    }).rejects.toThrow("Failed to add the product. Please check your input and try again.");

    expect(mockUpdateEntity).not.toHaveBeenCalled();
    expect(result.current.isAdding).toBe(false);
  });

  it("surfaces thrown server errors and resets adding state", async () => {
    installAnalysisFetchHandler((request) =>
      request.url.endsWith("/products") ? Promise.reject(new Error("Network failure")) : new Response(null),
    );

    const {result} = renderHook(() => useProductAdd({invoice}));

    await expect(async () => {
      await result.current.addProductCallback(productToAdd);
    }).rejects.toThrow("Unable to add the product. Please try again.");

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

    expect(getAnalysisApiRequests().filter((request) => request.url.endsWith("/products"))).toHaveLength(1);
    expect(result.current.isAdding).toBe(false);
  });
});
