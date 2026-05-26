"use client";

/**
* @fileoverview Hook for removing products from an invoice.
* @module app/domains/invoices/_hooks/product/useProductRemove
*
* @remarks
* Wraps the delete-product server action and mirrors successful removals in the
* invoices Zustand store. Local removal uses exact product-name equality, while
* the backend action may use broader matching semantics.
 */

import {useCallback, useState} from "react";
import type { Invoice } from "@/types/invoices/Invoice";
import { deleteInvoiceProduct as removeProductServerSide } from "../../_actions/invoices";
import { useInvoicesStore } from "@/stores";

/**
 * Hook output type for product removal.
 */
type HookOutputType = Readonly<{
  /** Whether a removal operation is in progress. */
  isRemoving: boolean;
  /** Removes a product by name through the server action and local invoice store. */
  removeProductCallback: (productName: string) => Promise<void>;
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
 * await removeProductCallback("Zuzu Milk 2% 1 Liter");
 * ```
 */
export function useProductRemove(invoice: Invoice): Readonly<HookOutputType> {
  const [isRemoving, setIsRemoving] = useState(false);
  const removeProductClientSide = useInvoicesStore((state) => state.updateEntity);

  const removeProductCallback = useCallback(
    async (productName: string): Promise<void> => {
      setIsRemoving(true);
      try {
        await removeProductServerSide({invoiceId: invoice.id, productName});
        removeProductClientSide(invoice.id, {
          items: invoice.items.filter((item) => item.name !== productName),
        });
      } finally {
        setIsRemoving(false);
      }
    },
    [invoice.id, removeProductClientSide],
  );

  return {isRemoving, removeProductCallback};
}
