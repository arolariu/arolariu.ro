/**
 * @fileoverview Unit tests for useProductRemove client hook.
 * @module app/domains/invoices/_hooks/product/useProductRemove.test
 */

import {getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {createProductSelector} from "@/types/invoices";
import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder, invokeHookCallback} from "../../../../../../tests/helpers";
import {useProductRemove} from "./useProductRemove";

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

describe("useProductRemove", () => {
  const productToRemove = TestDataBuilder.build("product", {name: "Coffee"});
  const matchingDuplicate = TestDataBuilder.build("product", {name: "Coffee", quantity: 2});
  const retainedProduct = TestDataBuilder.build("product", {name: "Milk"});
  const invoice = TestDataBuilder.build("invoice", {items: [productToRemove, retainedProduct, matchingDuplicate]});
  const mockUpdateEntity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoiceStore(mockUpdateEntity);
    installAnalysisFetchHandler((request) => (request.url.endsWith("/products") ? new Response(null, {status: 204}) : new Response(null)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns idle state and callback", () => {
    const {result} = renderHook(() => useProductRemove(invoice));

    expect(result.current.isRemoving).toBe(false);
    expect(typeof result.current.removeProductCallback).toBe("function");
  });

  it("removes exactly the selected product occurrence with an identity-free selector", async () => {
    const hookResult = renderHook(() => useProductRemove(invoice));

    await invokeHookCallback(hookResult, (current) => current.removeProductCallback(0));

    expect(getAnalysisApiRequests()).toContainEqual(
      expect.objectContaining({
        url: expect.stringMatching(/\/products$/u),
        init: expect.objectContaining({
          body: JSON.stringify({selector: createProductSelector(invoice.items, 0)}),
          method: "DELETE",
        }),
      }),
    );
    expect(mockUpdateEntity).toHaveBeenCalledWith(invoice.id, {
      items: [retainedProduct, matchingDuplicate],
    });
  });

  it("sets isRemoving true while the server action is pending", async () => {
    const deferred = createDeferred<Response>();
    installAnalysisFetchHandler((request) => (request.url.endsWith("/products") ? deferred.promise : new Response(null)));

    const {result} = renderHook(() => useProductRemove(invoice));

    let removePromise: Promise<void> | undefined;
    act(() => {
      removePromise = result.current.removeProductCallback(0);
    });

    await waitFor(() => {
      expect(result.current.isRemoving).toBe(true);
    });

    deferred.resolve(new Response(null, {status: 204}));
    await act(async () => {
      await removePromise;
    });

    expect(result.current.isRemoving).toBe(false);
  });

  it("throws server action failures and skips the local update", async () => {
    installAnalysisFetchHandler((request) => (request.url.endsWith("/products") ? new Response(null, {status: 400}) : new Response(null)));

    const {result} = renderHook(() => useProductRemove(invoice));

    await expect(async () => {
      await result.current.removeProductCallback(0);
    }).rejects.toThrow("Unable to delete the product. Please refresh and try again.");

    expect(mockUpdateEntity).not.toHaveBeenCalled();
    expect(result.current.isRemoving).toBe(false);
  });

  it("surfaces thrown server errors and resets removing state", async () => {
    installAnalysisFetchHandler((request) =>
      request.url.endsWith("/products") ? Promise.reject(new Error("Network failure")) : new Response(null),
    );

    const {result} = renderHook(() => useProductRemove(invoice));

    await expect(async () => {
      await result.current.removeProductCallback(0);
    }).rejects.toThrow("Unable to delete the product. Please try again.");

    expect(mockUpdateEntity).not.toHaveBeenCalled();
    expect(result.current.isRemoving).toBe(false);
  });

  it("surfaces local store update failures after a successful server removal", async () => {
    const localUpdateError = new Error("IndexedDB unavailable");
    mockInvoiceStore(
      vi.fn(() => {
        throw localUpdateError;
      }),
    );

    const {result} = renderHook(() => useProductRemove(invoice));

    await expect(async () => {
      await result.current.removeProductCallback(0);
    }).rejects.toThrow(localUpdateError);

    expect(getAnalysisApiRequests().filter((request) => request.url.endsWith("/products"))).toHaveLength(1);
    expect(result.current.isRemoving).toBe(false);
  });

  it("does not call the server for an index that no longer selects a product", async () => {
    const {result} = renderHook(() => useProductRemove(invoice));

    await expect(async () => {
      await result.current.removeProductCallback(10);
    }).rejects.toThrow("The selected product no longer exists.");

    expect(getAnalysisApiRequests().filter((request) => request.url.endsWith("/products"))).toHaveLength(0);
    expect(mockUpdateEntity).not.toHaveBeenCalled();
  });
});
