/**
 * @fileoverview Barrel export for invoice metadata server actions.
 * @module app/domains/invoices/_actions/invoices/metadata
 *
 * @remarks
 * This module provides a centralized export point for all invoice metadata
 * management server actions. It enables cleaner imports throughout the application
 * by allowing direct imports from the metadata directory rather than individual files.
 *
 * **Exported Actions:**
 * - `addInvoiceMetadata` - Adds metadata keys to invoices
 * - `deleteInvoiceMetadata` - Removes metadata keys from invoices
 *
 * **Usage Pattern:**
 * Instead of importing from individual files:
 * ```typescript
 * import { addInvoiceMetadata } from "@/app/domains/invoices/_actions/invoices/metadata/addInvoiceMetadata";
 * ```
 *
 * Import from the barrel:
 * ```typescript
 * import { addInvoiceMetadata, deleteInvoiceMetadata } from "@/app/domains/invoices/_actions/invoices/metadata";
 * ```
 *
 * **Architecture:**
 * All actions in this module follow the Server Action pattern with:
 * - Server-side execution only
 * - Automatic authentication via JWT
 * - GUID validation
 * - OpenTelemetry instrumentation
 * - Structured error handling
 *
 * @see {@link addInvoiceMetadata} - Add metadata keys to an invoice
 * @see {@link deleteInvoiceMetadata} - Remove metadata keys from an invoice
 */

export {addInvoiceMetadata} from "./addInvoiceMetadata";
export {deleteInvoiceMetadata} from "./deleteInvoiceMetadata";
