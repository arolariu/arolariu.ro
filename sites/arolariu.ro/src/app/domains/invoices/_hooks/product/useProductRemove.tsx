"use client";

/**
 * @fileoverview Hook for removing products from an invoice.
 * @module app/domains/invoices/_hooks/product/useProductRemove
 *
 * @remarks
 * Wraps the delete-product server action and mirrors successful removals in the
 * invoices Zustand store. The hook derives the backend's identity-free selector
 * from the immutable collection index and removes only that same occurrence
 * after the server confirms the mutation.
 */

import {useInvoicesStore} from "@/stores";
import {createProductSelector, type Invoice} from "@/types/invoices";
import {useCallback, useState} from "react";
import {deleteInvoiceProduct as removeProductServerSide} from "../../_actions/invoices";

/**
 * Hook output type for product removal.
 */
type HookOutputType = Readonly<{
  /** Whether a removal operation is in progress. */
  isRemoving: boolean;
  /** Removes the product at one immutable invoice collection index. */
  removeProductCallback: (productIndex: number) => Promise<void>;
}>;

/**
 * Manages removing products from the provided invoice.
 *
 * @param invoice - The invoice from which the product will be removed.
 * @returns Hook state with removal progress and the product remove callback.
 *
 * @example
 * ```tsx
 * const {isRemoving, removeProductCallback} = useProductRemove(invoice);
 *
 * await removeProductCallback(0);
 * ```
 */
export function useProductRemove(invoice: Invoice): Readonly<HookOutputType> {
  const [isRemoving, setIsRemoving] = useState(false);
  const removeProductClientSide = useInvoicesStore((state) => state.updateEntity);

  const removeProductCallback = useCallback(
    async (productIndex: number): Promise<void> => {
      setIsRemoving(true);
      try {
        const selectedProduct = invoice.items[productIndex];
        if (selectedProduct === undefined) {
          throw new Error("The selected product no longer exists.");
        }

        const selector = createProductSelector(invoice.items, productIndex);
        const result = await removeProductServerSide({invoiceId: invoice.id, selector});
        if (!result.success) {
          throw new Error(result.error.message);
        }
        removeProductClientSide(invoice.id, {
          items: invoice.items.filter((_item, index) => index !== productIndex),
        });
      } finally {
        setIsRemoving(false);
      }
    },
    [invoice.id, invoice.items, removeProductClientSide],
  );

  return {isRemoving, removeProductCallback} as const;
}
