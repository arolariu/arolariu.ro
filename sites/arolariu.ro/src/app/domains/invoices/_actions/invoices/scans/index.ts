/**
 * @fileoverview Barrel export for invoice scan server actions.
 * @module app/domains/invoices/_actions/invoices/scans
 *
 * @remarks
 * This module provides a centralized export point for all invoice scan (document/image)
 * management server actions. It enables cleaner imports throughout the application
 * by allowing direct imports from the scans directory rather than individual files.
 *
 * **Exported Actions:**
 * - `createInvoiceScan` - Uploads invoice scans to Azure Blob Storage
 * - `attachInvoiceScan` - Adds scan references to existing invoices
 * - `deleteInvoiceScan` - Removes scan references from invoices and lets backend cleanup handle the blob lifecycle
 *
 * **Usage Pattern:**
 * Instead of importing from individual files:
 * ```typescript
 * import { createInvoiceScan } from "@/app/domains/invoices/_actions/invoices/scans/createInvoiceScan";
 * ```
 *
 * Import from the barrel:
 * ```typescript
 * import { createInvoiceScan, attachInvoiceScan, deleteInvoiceScan } from "@/app/domains/invoices/_actions/invoices/scans";
 * ```
 *
 * **Architecture Patterns:**
 * These actions follow two distinct patterns:
 *
 * **Azure SDK Direct (createInvoiceScan):**
 * - Uses Azure Blob Storage SDK directly
 * - No JWT authentication (Azure credential singleton)
 * - Direct upload to Azure (no backend API)
 * - No cache revalidation (storage operation)
 *
 * **REST API (attachInvoiceScan, deleteInvoiceScan):**
 * - Server-side execution with JWT authentication
 * - GUID validation for invoice identifiers
 * - OpenTelemetry instrumentation
 * - Structured error handling with ServerActionResult
 * - Automatic Next.js cache revalidation
 *
 * **Typical Workflow:**
 * 1. **Upload**: `createInvoiceScan` uploads file to Azure Blob Storage → returns blob URL
 * 2. **Attach**: `attachInvoiceScan` adds blob URL reference to invoice entity
 * 3. **Delete**: `deleteInvoiceScan` removes reference (blob marked for async cleanup)
 *
 * **Business Constraints:**
 * - Invoices must retain at least one scan (deletion fails for last scan)
 * - Only invoice owner can attach/delete scans
 * - Soft deletion: blobs marked for cleanup by background job
 *
 * **Supported File Formats:**
 * - Images: JPEG, PNG, WebP, HEIC
 * - Documents: PDF
 *
 * @see {@link createInvoiceScan} - Upload invoice scans to Azure Blob Storage
 * @see {@link attachInvoiceScan} - Add scan references to existing invoices
 * @see {@link deleteInvoiceScan} - Remove scan references from invoices
 */

export {attachInvoiceScan} from "./attachInvoiceScan";
export {createInvoiceScan} from "./createInvoiceScan";
export {deleteInvoiceScan} from "./deleteInvoiceScan";
