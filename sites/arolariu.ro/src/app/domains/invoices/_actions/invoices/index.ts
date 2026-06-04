/**
 * @fileoverview Central barrel export for all invoice-related server actions.
 * @module app/domains/invoices/_actions/invoices
 *
 * @remarks
 * This module provides a unified export point for the complete invoice management API surface.
 * All server actions follow consistent patterns:
 * - Server-side execution only (`"use server"` directive)
 * - Automatic JWT authentication via Clerk
 * - GUID validation for identifiers
 * - OpenTelemetry instrumentation for observability
 * - Structured error handling with `ServerActionResult<T>`
 * - Type-safe input/output contracts
 *
 * **Architecture Layers:**
 * ```
 * UI Components
 *     ↓
 * Server Actions (this module) ← You are here
 *     ↓
 * Backend REST API (/rest/v1/invoices/*)
 *     ↓
 * Domain Services (DDD layers)
 * ```
 *
 * **Functional Grouping:**
 * - **Queries**: `fetchInvoice`, `fetchInvoices` - Read operations
 * - **Mutations**: `createInvoice`, `updateInvoice`, `patchInvoice`, `deleteInvoice` - Write operations
 * - **Analysis**: `analyzeInvoice` - AI/ML pipeline integration
 * - **Nested Resources**: Products, metadata, scans sub-modules
 *
 * **Import Strategy:**
 * ```typescript
 * // Recommended: Import from this barrel
 * import { fetchInvoice, createInvoice, addInvoiceProduct } from "@/app/domains/invoices/_actions/invoices";
 *
 * // Also valid: Import from sub-modules
 * import { addInvoiceProduct } from "@/app/domains/invoices/_actions/invoices/products";
 * ```
 *
 * **Error Handling Pattern:**
 * All actions return `ServerActionResult<T>`:
 * ```typescript
 * const result = await fetchInvoice({ invoiceId });
 * if (result.success) {
 *   const invoice = result.data; // Type-safe access
 * } else {
 *   console.error(result.error); // User-friendly error message
 * }
 * ```
 *
 * @see {@link ServerActionResult} - Standard result wrapper type
 * @see {@link Invoice} - Core invoice entity type
 * @see {@link Product} - Invoice line item type
 */

export {addInvoiceMetadata, deleteInvoiceMetadata} from "./metadata";
export {addInvoiceProduct, deleteInvoiceProduct, updateInvoiceProduct} from "./products";
export {attachScanToInvoice, createInvoiceScan, detachScanFromInvoice} from "./scans";

// #region Invoice server-side queries (fetch single/multiple)
export {fetchInvoice} from "./fetchInvoice";
export {fetchInvoices} from "./fetchInvoices";
// #endregion

// #region Invoice server-side mutations (add/update/delete)
export {analyzeInvoice} from "./analyzeInvoice";
export {createInvoice} from "./createInvoice";
export {deleteInvoice} from "./deleteInvoice";
export {patchInvoice} from "./patchInvoice";
export {updateInvoice} from "./updateInvoice";
// #endregion
