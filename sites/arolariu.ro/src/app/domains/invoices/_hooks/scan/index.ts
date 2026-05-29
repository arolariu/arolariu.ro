/**
 * @fileoverview Custom React hooks for scan management operations in the invoices domain.
 * @module app/domains/invoices/_hooks/scan
 *
 * @remarks
 * Provides client-side React hooks that wrap scan server actions with state management,
 * loading indicators, error handling, and optimistic updates. These hooks bridge the gap
 * between server actions and React component state.
 *
 * **Exported Hooks:**
 * - {@link useScanAdd} - Upload and attach scans to existing invoices
 * - {@link useScanDelete} - Delete standalone scan blobs and clean local store state
 * - {@link useScanRename} - Rename standalone scans in local store state
 * - {@link useScanRotation} - Rotate standalone image scans clockwise or counterclockwise
 *
 * **Shared Characteristics:**
 * - **Execution Context**: Client-side only (React hooks with `"use client"`)
 * - **State Management**: Manages loading, error, and success states internally
 * - **Server Action Wrapping**: Each hook wraps one or more server actions
 * - **Store Integration**: Updates Zustand `scansStore` on successful operations
 * - **Toast Notifications**: Shows user feedback via toast messages
 * - **Error Handling**: Catches and surfaces user-friendly error messages
 * - **Local Updates**: Rename updates local state only; delete and rotate update local state after server success
 *
 * **React Hook Rules:**
 * All hooks follow React's Rules of Hooks:
 * - Must be called at the top level of components
 * - Cannot be called conditionally
 * - Cannot be called in loops or nested functions
 * - Use `useCallback` for stable function references
 *
 * **Typical Usage Pattern:**
 * 1. Import hook in client component (`"use client"`)
 * 2. Call hook at component top level
 * 3. Destructure returned state and handlers
 * 4. Use loading/error states for UI feedback
 * 5. Call handler functions in response to user actions
 * 6. Store automatically updates on success
 *
 * **Store Integration:**
 * All hooks interact with the `scansStore` Zustand store:
 * - Add operations: Upload and attach invoice scans without writing to the standalone scans store
 * - Delete operations: Remove scan from store
 * - Rename operations: Update scan name in store
 * - Rotate operations: Update scan blob URL in store after upload succeeds
 *
 * **Performance Considerations:**
 * - Hooks use `useCallback` to prevent unnecessary re-renders
 * - File operations are debounced where appropriate
 * - Local store updates minimize perceived latency after server confirmation
 * - Large file uploads show progress indicators
 *
 * @example
 * ```tsx
 * // Upload one scan and attach it to an invoice
 * "use client";
 *
 * import { useScanAdd } from "@/app/domains/invoices/_hooks/scan";
 *
 * export function ScanUploader({invoiceId, userIdentifier}: Props) {
 *   const {addScanCallback, isAdding} = useScanAdd(invoiceId);
 *
 *   const handleUpload = async (file: File) => {
 *     await addScanCallback({
 *       file,
 *       fileName: file.name,
 *       userIdentifier,
 *       type: InvoiceScanType.Photo,
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={(event) => {
 *         const file = event.target.files?.[0];
 *         if (file) void handleUpload(file);
 *       }} />
 *       {isAdding && <Spinner />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Delete scan with confirmation
 * "use client";
 *
 * import { useScanDelete } from "@/app/domains/invoices/_hooks/scan";
 *
 * export function ScanCard({ scan }: { scan: Scan }) {
 *   const {deleteScanCallback, isDeleting} = useScanDelete(scan);
 *
 *   const handleDelete = async () => {
 *     const confirmed = await confirmDialog("Delete this scan?");
 *     if (confirmed) {
 *       await deleteScanCallback();
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <img src={scan.blobUrl} alt={scan.name} />
 *       <button onClick={handleDelete} disabled={isDeleting}>
 *         {isDeleting ? "Deleting..." : "Delete"}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Rotate scan clockwise
 * "use client";
 *
 * import { useScanRotation } from "@/app/domains/invoices/_hooks/scan";
 *
 * export function ScanViewer({ scan }: { scan: Scan }) {
 *   const {rotateScanCallback, isRotating} = useScanRotation(scan);
 *
 *   return (
 *     <div>
 *       <img src={scan.blobUrl} alt={scan.name} />
 *       <button onClick={() => rotateScanCallback("cw")} disabled={isRotating}>
 *         Rotate right
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @see {@link useScanAdd} - Upload new scans
 * @see {@link useScanDelete} - Delete scans
 * @see {@link useScanRename} - Rename scans
 * @see {@link useScanRotation} - Rotate scan images
 * @see {@link createInvoiceScan} - Server action for uploading invoice-attached scans.
 * @see {@link deleteScan} - Server action for deleting standalone scans.
 * @see {@link updateScan} - Server action for updating standalone scan blobs.
 */

export {useScanAdd} from "./useScanAdd";
export {useScanDelete} from "./useScanDelete";
export {useScanRename} from "./useScanRename";
export {useScanRotation} from "./useScanRotation";
