/**
 * @fileoverview Barrel export for scan-related server actions.
 * @module lib/actions/scans
 *
 * @remarks
 * Note: createInvoiceFromScans is a composite action that lives in
 * the view-scans page at `_actions/createInvoiceFromScans.ts` since
 * it's specific to that workflow.
 */

export {deleteScan} from "./deleteScan";
export {fetchScans} from "./fetchScans";
export {uploadScan} from "./uploadScan";
