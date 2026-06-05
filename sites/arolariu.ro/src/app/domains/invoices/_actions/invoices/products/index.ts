"use server";

/**
 * @fileoverview Barrel export for invoice product server actions.
 * @module app/domains/invoices/_actions/invoices/products
 *
 * @remarks
 * This module provides a centralized export point for all invoice product (line items)
 * management server actions. It enables cleaner imports throughout the application
 * by allowing direct imports from the products directory rather than individual files.
 *
 * **Exported Actions:**
 * - `addInvoiceProduct` - Adds new line items to invoices
 * - `deleteInvoiceProduct` - Hard-deletes matching line items from invoices
 * - `updateInvoiceProduct` - Modifies existing line items
 *
 * **Usage Pattern:**
 * Instead of importing from individual files:
 * ```typescript
 * import { addInvoiceProduct } from "@/app/domains/invoices/_actions/invoices/products/addInvoiceProduct";
 * ```
 *
 * Import from the barrel:
 * ```typescript
 * import { addInvoiceProduct, deleteInvoiceProduct, updateInvoiceProduct } from "@/app/domains/invoices/_actions/invoices/products";
 * ```
 *
 * **Architecture:**
 * All actions in this module follow the Server Action pattern with:
 * - Server-side execution only
 * - Automatic authentication via JWT
 * - GUID validation for invoice identifiers
 * - OpenTelemetry instrumentation
 * - Structured error handling with ServerActionResult
 * - Automatic Next.js cache revalidation
 * - Product identification by name (originalProductName/productName)
 *
 * **Common Operations:**
 * - **Create**: Add new products to invoice items collection
 * - **Read**: Not provided here (see invoice fetch actions)
 * - **Update**: Replace matching products through the backend delete-and-add flow
 * - **Delete**: Remove matching products from the invoice items collection
 *
 * @see {@link addInvoiceProduct} - Add new line items to an invoice
 * @see {@link deleteInvoiceProduct} - Remove line items from an invoice
 * @see {@link updateInvoiceProduct} - Modify existing line items in an invoice
 */

export { addInvoiceProduct } from "./addInvoiceProduct";
export { deleteInvoiceProduct } from "./deleteInvoiceProduct";
export { updateInvoiceProduct } from "./updateInvoiceProduct";
