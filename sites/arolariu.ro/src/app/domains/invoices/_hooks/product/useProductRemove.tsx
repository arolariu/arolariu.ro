"use client";

/**
 * @fileoverview Hook for removing products from the current edit-invoice context.
 * @module app/domains/invoices/_hooks/useProductRemove
 */

import {useCallback, useState} from "react";
import type { Invoice } from "@/types/invoices/Invoice";
import { deleteInvoiceProduct as deleteInvoiceProductServerSide } from "../../_actions/invoices";
import { useInvoicesStore } from "@/stores";

type HookOutputType = Readonly<{
  isRemoving: boolean;
  performRemove: (productName: string) => Promise<void>;
}>;

/**
 * Manages removing a product from the invoice currently loaded in edit context.
 *
 * @param invoice - The invoice from which the product will be removed.
 * @returns State and callback for removing a product.
 * @throws {Error} When the delete-product action reports failure.
 */
export function useProductRemove(invoice: Invoice): Readonly<HookOutputType> {
  const [isRemoving, setIsRemoving] = useState(false);
  const deleteInvoiceProductClientSide = useInvoicesStore((state) => state.updateEntity);

  const performRemove = useCallback(
    async (productName: string): Promise<void> => {
      setIsRemoving(true);
      try {
        await deleteInvoiceProductServerSide({invoiceId: invoice.id, productName});
        deleteInvoiceProductClientSide(invoice.id, {
          items: invoice.items.filter((item) => item.name !== productName),
        });
      } finally {
        setIsRemoving(false);
      }
    },
    [invoice.id, deleteInvoiceProductClientSide],
  );

  return {isRemoving, performRemove};
}
