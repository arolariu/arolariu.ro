"use client";

/**
 * @fileoverview Hook for adding products to an invoice.
 * @module app/domains/invoices/_hooks/product/useProductAdd
 *
 * @remarks
 * Wraps the add-product server action and mirrors successful additions in the
 * invoices Zustand store. The hook owns only loading state; callers decide how
 * to show success and failure feedback.
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice, Product, ProductMutation} from "@/types/invoices";
import {useCallback, useState} from "react";
import {addInvoiceProduct as addProductServerSide} from "../../_actions/invoices";

/**
 * Input parameters for the product add hook.
 */
type HookInputType = Readonly<{
  /** Invoice receiving the product. */
  readonly invoice: Invoice;
}>;

/**
 * Hook output type for product addition.
 */
type HookOutputType = Readonly<{
  /** Whether an add operation is in progress. */
  isAdding: boolean;
  /** Adds a product through the server action and local invoice store. */
  addProductCallback: (product: ProductMutation) => Promise<Product>;
}>;

/**
 * Manages adding products to the provided invoice.
 *
 * @param invoice - The invoice to which the product will be added.
 * @returns Hook state with add progress and the product add callback.
 *
 * @example
 * ```tsx
 * const {isAdding, addProductCallback} = useProductAdd({invoice});
 *
 * const addedProduct = await addProductCallback({
 *   name: "Milk",
 *   classification: null,
 *   quantity: 1,
 *   quantityUnit: "pcs",
 *   productCode: "",
 *   price: 7,
 * });
 * console.log("Added:", addedProduct.name);
 * ```
 */
export function useProductAdd({invoice}: Readonly<HookInputType>): Readonly<HookOutputType> {
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const addProductClientSide = useInvoicesStore((state) => state.updateEntity);

  const addProductCallback = useCallback(
    async (product: ProductMutation): Promise<Product> => {
      setIsAdding(true);
      try {
        const result = await addProductServerSide({invoiceId: invoice.id, product});
        if (!result.success) {
          throw new Error(result.error.message);
        }
        addProductClientSide(invoice.id, {
          items: [...invoice.items, result.data],
        });
        return result.data;
      } finally {
        setIsAdding(false);
      }
    },
    [invoice.id, invoice.items, addProductClientSide],
  );

  return {isAdding, addProductCallback} as const;
}
