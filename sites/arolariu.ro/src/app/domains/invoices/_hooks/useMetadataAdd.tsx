"use client";

/**
 * @fileoverview Hook for adding metadata to the current invoice via patchInvoice.
 * @module app/domains/invoices/_hooks/useMetadataAdd
 */

import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import {useInvoicesStore} from "@/stores";
import {useCallback, useState} from "react";
import {useEditInvoiceContext} from "../edit-invoice/[id]/_context/EditInvoiceContext";

type UseMetadataAdd = Readonly<{
  isAdding: boolean;
  performAdd: (key: string, value: string) => Promise<void>;
}>;

/**
 * Manages adding metadata to the invoice currently loaded in edit context.
 *
 * @returns State and callback for adding invoice metadata.
 * @throws {Error} When patchInvoice reports a failure.
 */
export function useMetadataAdd(): UseMetadataAdd {
  const {invoice} = useEditInvoiceContext();
  const upsertEntity = useInvoicesStore((state) => state.upsertEntity);
  const [isAdding, setIsAdding] = useState(false);

  const performAdd = useCallback(
    async (key: string, value: string): Promise<void> => {
      setIsAdding(true);
      try {
        const nextMetadata = {...(invoice.additionalMetadata ?? {}), [key]: value};
        const result = await patchInvoice({
          invoiceId: invoice.id,
          payload: {additionalMetadata: nextMetadata},
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        upsertEntity(result.invoice);
      } finally {
        setIsAdding(false);
      }
    },
    [invoice.additionalMetadata, invoice.id, upsertEntity],
  );

  return {isAdding, performAdd};
}
