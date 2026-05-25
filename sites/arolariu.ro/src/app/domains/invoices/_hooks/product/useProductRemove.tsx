"use client";

/**
 * @fileoverview Hook for removing products from the current edit-invoice context.
 * @module app/domains/invoices/_hooks/useProductRemove
 */

import {useCallback, useState} from "react";
import type { Invoice } from "@/types/invoices/Invoice";
import { deleteInvoiceProduct as removeProductServerSide } from "../../_actions/invoices";
import { useInvoicesStore } from "@/stores";

type HookOutputType = Readonly<{
  isRemoving: boolean;
  removeProductCallback: (productName: string) => Promise<void>;
}>;

/**
 * Manages removing a product from the invoice currently loaded in edit context.
 *
 * @param invoice - The invoice from which the product will be removed.
 * @returns State and callback for removing a product.
 * @throws {Error} When the remove-product action reports failure.
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
