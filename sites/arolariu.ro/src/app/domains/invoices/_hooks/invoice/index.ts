/**
 * @fileoverview Barrel export for invoice-focused React hooks.
 * @module app/domains/invoices/_hooks/invoice
 *
 * @remarks
 * Re-exports hooks for invoice fetching plus invoice-scoped mutations such as
 * deletion, sharing, metadata edits, and client-side recipe edits. Importing
 * from this barrel keeps invoice domain components independent from individual
 * hook file paths.
 *
 * @example
 * ```tsx
 * import {useInvoice, useInvoiceDelete} from "@/app/domains/invoices/_hooks/invoice";
 *
 * const {invoice, isLoading} = useInvoice({invoiceIdentifier: invoiceId});
 * const {deleteInvoiceCallback} = useInvoiceDelete();
 * ```
 *
 * @see {@link useInvoice} - Fetches one invoice with store hydration.
 * @see {@link useInvoices} - Fetches invoice collections with store hydration.
 * @see {@link useInvoiceDelete} - Deletes one or more invoices.
 * @see {@link useInvoiceShare} - Applies sharing actions and share emails.
 */

// #region Hooks for Metadata mutations (add/remove)
export { useInvoiceMetadataAdd } from "./useInvoiceMetadataAdd";
export { useInvoiceMetadataRemove } from "./useInvoiceMetadataRemove";
// #endregion

// #region Hooks for Recipe mutations (add/update/remove)
export { useRecipeAdd } from "./useRecipeAdd";
export { useRecipeDelete } from "./useRecipeDelete";
export { useRecipeUpdate } from "./useRecipeUpdate";
// #endregion

export { useInvoiceDelete } from "./useInvoiceDelete";
export { useInvoiceShare } from "./useInvoiceShare";

// #region Hooks for Invoice queries (fetch single/multiple)
export { useInvoice } from "./useInvoice";
export { useInvoices } from "./useInvoices";
// #endregion
