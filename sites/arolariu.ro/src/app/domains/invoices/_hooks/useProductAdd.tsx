"use client";

/**
 * @fileoverview Hook for adding products to the current edit-invoice context.
 * @module app/domains/invoices/_hooks/useProductAdd
 */

import addProduct from "@/lib/actions/invoices/addProduct";
import type {Allergen, Product, ProductCategory} from "@/types/invoices";
import {useCallback, useState} from "react";
import {useEditInvoiceContext} from "../edit-invoice/[id]/_context/EditInvoiceContext";

type AddProductPayload = Readonly<{
  name: string;
  category: ProductCategory;
  quantity: number;
  quantityUnit?: string;
  productCode?: string;
  price: number;
  detectedAllergens?: Allergen[];
}>;

type UseProductAdd = Readonly<{
  isAdding: boolean;
  performAdd: (payload: AddProductPayload) => Promise<Product>;
}>;

/**
 * Manages adding a product to the invoice currently loaded in edit context.
 *
 * @returns State and callback for adding a product.
 * @throws {Error} When the add-product action reports failure.
 */
export function useProductAdd(): UseProductAdd {
  const {invoice} = useEditInvoiceContext();
  const [isAdding, setIsAdding] = useState(false);

  const performAdd = useCallback(
    async (payload: AddProductPayload): Promise<Product> => {
      setIsAdding(true);
      try {
        const result = await addProduct({invoiceId: invoice.id, payload});

        if (!result.success) {
          throw new Error(result.error);
        }

        return result.product;
      } finally {
        setIsAdding(false);
      }
    },
    [invoice.id],
  );

  return {isAdding, performAdd};
}
