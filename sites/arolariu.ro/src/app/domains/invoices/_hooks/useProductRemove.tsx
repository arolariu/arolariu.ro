"use client";

/**
 * @fileoverview Hook for removing products from the current edit-invoice context.
 * @module app/domains/invoices/_hooks/useProductRemove
 */

import deleteProduct from "@/lib/actions/invoices/deleteProduct";
import {useCallback, useState} from "react";
import {useEditInvoiceContext} from "../edit-invoice/[id]/_context/EditInvoiceContext";

type UseProductRemove = Readonly<{
  isRemoving: boolean;
  performRemove: (productName: string) => Promise<void>;
}>;

/**
 * Manages removing a product from the invoice currently loaded in edit context.
 *
 * @returns State and callback for removing a product.
 * @throws {Error} When the delete-product action reports failure.
 */
export function useProductRemove(): UseProductRemove {
  const {invoice} = useEditInvoiceContext();
  const [isRemoving, setIsRemoving] = useState(false);

  const performRemove = useCallback(
    async (productName: string): Promise<void> => {
      setIsRemoving(true);
      try {
        const result = await deleteProduct({invoiceId: invoice.id, payload: {productName}});

        if (!result.success) {
          throw new Error(result.error);
        }
      } finally {
        setIsRemoving(false);
      }
    },
    [invoice.id],
  );

  return {isRemoving, performRemove};
}
