import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import addProduct from "@/lib/actions/invoices/addProduct";
import type {Invoice, Product} from "@/types/invoices";
import {ProductCategory} from "@/types/invoices";
import {useProductAdd} from "./useProductAdd";

vi.mock("@/lib/actions/invoices/addProduct", () => ({
  default: vi.fn(),
}));

const mockInvoice = {
  id: "inv-1",
} as Invoice;

vi.mock("../edit-invoice/[id]/_context/EditInvoiceContext", () => ({
  useEditInvoiceContext: () => ({invoice: mockInvoice}),
}));

const mockProduct: Product = {
  name: "Milk",
  category: ProductCategory.DAIRY,
  quantity: 2,
  quantityUnit: "pcs",
  productCode: "123",
  price: 4,
  totalPrice: 8,
  detectedAllergens: [],
  metadata: {
    isEdited: false,
    isComplete: true,
    isSoftDeleted: false,
    confidence: 1,
  },
};

const payload = {
  name: "Milk",
  category: ProductCategory.DAIRY,
  quantity: 2,
  quantityUnit: "pcs",
  productCode: "123",
  price: 4,
  detectedAllergens: [],
} as const;

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

describe("useProductAdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a product and returns the created product", async () => {
    vi.mocked(addProduct).mockResolvedValueOnce({success: true, product: mockProduct});

    const {result} = renderHook(() => useProductAdd());

    let returned: Product | undefined;
    await act(async () => {
      returned = await result.current.performAdd(payload);
    });

    expect(addProduct).toHaveBeenCalledWith({invoiceId: "inv-1", payload});
    expect(returned).toBe(mockProduct);
  });

  it("throws when addProduct reports failure", async () => {
    vi.mocked(addProduct).mockResolvedValueOnce({success: false, error: "boom"});

    const {result} = renderHook(() => useProductAdd());

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.performAdd(payload);
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toMatchObject({message: "boom"});
  });

  it("sets isAdding true while the add request is pending and false after completion", async () => {
    const deferred = createDeferred<{success: true; product: Product}>();
    vi.mocked(addProduct).mockReturnValueOnce(deferred.promise);

    const {result} = renderHook(() => useProductAdd());

    let pendingAdd: Promise<Product> | undefined;
    act(() => {
      pendingAdd = result.current.performAdd(payload);
    });

    expect(result.current.isAdding).toBe(true);

    await act(async () => {
      deferred.resolve({success: true, product: mockProduct});
      await pendingAdd;
    });

    expect(result.current.isAdding).toBe(false);
  });
});
