/**
 * @fileoverview Barrel export for standalone scan server actions.
 * @module app/domains/invoices/_actions/scans
 *
 * @remarks
 * This module centralizes CRUD operations for standalone scans (user-uploaded
 * blobs before they become invoice attachments) and upload preparation helpers.
 *
 * **CRUD Actions:**
 * - `createScan` uploads and registers a new scan via server-side processing.
 * - `fetchScans` lists the authenticated user's unused standalone scans.
 * - `updateScan` replaces an existing scan's blob content in place.
 * - `deleteScan` permanently removes a standalone scan blob from Azure Storage.
 *
 * **Upload Preparation:**
 * - `createScanUploadTarget` generates a SAS URL and metadata headers for
 *   direct client-to-Azure blob uploads (eliminates base64 overhead and
 *   server bottleneck).
 *
 * @see {@link createScan} - Server-side fallback upload path.
 * @see {@link fetchScans} - Lists standalone scans for the current user.
 * @see {@link updateScan} - Updates an existing scan's content.
 * @see {@link deleteScan} - Removes a scan permanently.
 * @see {@link createScanUploadTarget} - Prepares direct upload with metadata.
 */

export { createScanUploadTarget } from "./createScanUploadTarget";

// #region CRUD operations for standalone scans (not yet attached to invoices)
export { createScan } from "./createScan";
export { deleteScan } from "./deleteScan";
export { fetchScans } from "./fetchScans";
export { updateScan } from "./updateScan";
// #endregion
