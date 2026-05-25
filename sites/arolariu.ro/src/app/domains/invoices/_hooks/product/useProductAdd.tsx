"use client";

/**
 * @fileoverview Hook for adding products to the current edit-invoice context.
 * @module app/domains/invoices/_hooks/useProductAdd
 */

import type {Invoice, Product} from "@/types/invoices";
import {useCallback, useState} from "react";
import { addInvoiceProduct as addProductServerSide } from "../../_actions/invoices";
import { useInvoicesStore } from "@/stores";

type HookInputType = Readonly<{
  readonly invoice: Invoice;
}>;

type HookOutputType = Readonly<{
  isAdding: boolean;
  addProductCallback: (product: Product) => Promise<Product>;
}>;

/**
 * Manages adding a product to the invoice currently loaded in edit context.
 *
 * @param invoice - The invoice to which the product will be added.
 * @returns State and callback for adding a product.
 * @throws {Error} When the add-product action reports failure.
 */
export function useProductAdd({ invoice }: Readonly<HookInputType>): Readonly<HookOutputType> {
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const addProductClientSide = useInvoicesStore((state) => state.updateEntity);

  const addProductCallback = useCallback(
    async (product: Product): Promise<Product> => {
      setIsAdding(true);
      try {
        await addProductServerSide({invoiceId: invoice.id, product});
        addProductClientSide(invoice.id, {
          items: [...invoice.items, product],
        });
        return product;
      } finally {
        setIsAdding(false);
      }
    },
    [invoice.id, addProductClientSide],
  );

  return {isAdding, addProductCallback};
}
