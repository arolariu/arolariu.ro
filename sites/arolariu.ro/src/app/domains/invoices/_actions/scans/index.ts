/**
 * @fileoverview Barrel export for standalone scan server actions.
 * @module app/domains/invoices/_actions/scans
 *
 * @remarks
 * This module centralizes the standalone scan lifecycle used by the invoices
 * domain before scans become invoice attachments.
 *
 * **Exported Actions:**
 * - `deleteScan` permanently removes standalone scan blobs from Azure Storage.
 * - `fetchScans` lists the authenticated user's unused standalone scans.
 * - `generateUploadSasUrl` creates short-lived direct-upload URLs.
 * - `markScansAsUsed` archives scans after conversion to invoices.
 * - `registerScan` records metadata after a direct client-to-Azure upload.
 * - `updateScan` replaces scan blob content in place.
 * - `uploadScan` aliases `createScan` for legacy import compatibility.
 *
 * @see {@link fetchScans} - Lists standalone scans for the current user.
 * @see {@link generateUploadSasUrl} - Starts the direct upload workflow.
 * @see {@link registerScan} - Completes the direct upload workflow.
 */

export {createScan as uploadScan} from "./createScan";
export {deleteScan} from "./deleteScan";
export {fetchScans} from "./fetchScans";
export {generateUploadSasUrl} from "./generateSasUrl";
export {markScansAsUsed} from "./markScansAsUsed";
export {registerScan} from "./registerScan";
export {updateScan} from "./updateScan";
