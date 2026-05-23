"use client";

/**
 * @fileoverview Hook for removing metadata from the current invoice.
 * @module app/domains/invoices/_hooks/useMetadataRemove
 */

import {deleteInvoiceMetadata} from "@/lib/actions/invoices/deleteInvoiceMetadata";
import {useCallback, useState} from "react";
import {useEditInvoiceContext} from "../edit-invoice/[id]/_context/EditInvoiceContext";

type UseMetadataRemove = Readonly<{
  isRemoving: boolean;
  performRemove: (key: string) => Promise<void>;
}>;

/**
 * Manages removing metadata from the invoice currently loaded in edit context.
 *
 * @returns State and callback for removing invoice metadata.
 * @throws {Error} When the delete-metadata action reports failure.
 */
export function useMetadataRemove(): UseMetadataRemove {
  const {invoice} = useEditInvoiceContext();
  const [isRemoving, setIsRemoving] = useState(false);

  const performRemove = useCallback(
    async (key: string): Promise<void> => {
      setIsRemoving(true);
      try {
        await deleteInvoiceMetadata({invoiceId: invoice.id, key});
      } finally {
        setIsRemoving(false);
      }
    },
    [invoice.id],
  );

  return {isRemoving, performRemove};
}
