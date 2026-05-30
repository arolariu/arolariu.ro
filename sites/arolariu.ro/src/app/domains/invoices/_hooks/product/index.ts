/**
 * @fileoverview Barrel export for product-focused invoice domain hooks.
 * @module app/domains/invoices/_hooks/product
 *
 * @remarks
 * Re-exports hooks that mutate invoice line items through product server
 * actions and local invoice store updates.
 *
 * @example
 * ```tsx
 * import {useProductAdd, useProductRemove} from "@/app/domains/invoices/_hooks/product";
 *
 * const add = useProductAdd({invoice});
 * const remove = useProductRemove(invoice);
 * ```
 *
 * @see {@link useProductAdd} - Adds a product to an invoice.
 * @see {@link useProductRemove} - Removes a product from an invoice.
 */

export {useProductAdd} from "./useProductAdd";
export {useProductRemove} from "./useProductRemove";
