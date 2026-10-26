/**
 * @fileoverview Barrel export for invoice scan server actions.
 * @module app/domains/invoices/_actions/invoices/scans
 *
 * @remarks
 * This module provides a centralized export point for invoice scan (document/image)
 * management server actions. It enables cleaner imports throughout the application
 * by allowing direct imports from the scans directory rather than individual files.
 *
 * **Exported Actions:**
 * - `attachScanToInvoice` - Adds scan references to existing invoices
 * - `detachScanFromInvoice` - Removes scan references from invoices and lets backend cleanup handle the blob lifecycle
 *
 * **Usage Pattern:**
 * Instead of importing from individual files:
 * ```typescript
 * import { attachScanToInvoice } from "@/app/domains/invoices/_actions/invoices/scans/attachScanToInvoice";
 * ```
 *
 * Import from the barrel:
 * ```typescript
 * import { attachScanToInvoice, detachScanFromInvoice } from "@/app/domains/invoices/_actions/invoices/scans";
 * ```
 *
 * **Architecture Pattern:**
 * These actions follow the REST API pattern:
 * - Server-side execution with JWT authentication
 * - GUID validation for invoice identifiers
 * - OpenTelemetry instrumentation
 * - Structured error handling with ServerActionResult
 * - Automatic Next.js cache revalidation
 *
 * **Typical Workflow:**
 * 1. **Upload**: Use `createScan` from `@/app/domains/invoices/_actions/scans` to upload file to Azure Blob Storage → returns scan entity
 * 2. **Attach**: `attachScanToInvoice` adds scan blob URL reference to invoice entity
 * 3. **Delete**: `detachScanFromInvoice` removes reference (blob marked for async cleanup)
 *
 * **Business Constraints:**
 * - Invoices must retain at least one scan (deletion fails for last scan)
 * - Only invoice owner can attach/delete scans
 * - Soft deletion: blobs marked for cleanup by background job
 *
 * **Supported File Formats:**
 * - Images: JPEG, PNG, BMP, TIFF, HEIF
 * - Documents: PDF
 *
 * @see {@link attachScanToInvoice} - Add scan references to existing invoices
 * @see {@link detachScanFromInvoice} - Remove scan references from invoices
 */

export {attachScanToInvoice} from "./attachScanToInvoice";
export {detachScanFromInvoice} from "./detachScanFromInvoice";
