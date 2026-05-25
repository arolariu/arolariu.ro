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
 * - {@link useScanAdd} - Upload new scans to Azure Storage
 * - {@link useScanDelete} - Delete scans with confirmation and cleanup
 * - {@link useScanRename} - Rename scan files with validation
 * - {@link useScanRotation} - Rotate scan images (90°, 180°, 270°)
 *
 * **Shared Characteristics:**
 * - **Execution Context**: Client-side only (React hooks with `"use client"`)
 * - **State Management**: Manages loading, error, and success states internally
 * - **Server Action Wrapping**: Each hook wraps one or more server actions
 * - **Store Integration**: Updates Zustand `scansStore` on successful operations
 * - **Toast Notifications**: Shows user feedback via toast messages
 * - **Error Handling**: Catches and surfaces user-friendly error messages
 * - **Optimistic Updates**: Some hooks update UI before server confirmation
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
 * - Add operations: Insert new scan into store
 * - Delete operations: Remove scan from store
 * - Rename operations: Update scan name in store
 * - Rotate operations: Update scan blob URL in store
 *
 * **Performance Considerations:**
 * - Hooks use `useCallback` to prevent unnecessary re-renders
 * - File operations are debounced where appropriate
 * - Optimistic updates minimize perceived latency
 * - Large file uploads show progress indicators
 *
 * @example
 * ```typescript
 * // Upload multiple scans with progress tracking
 * "use client";
 *
 * import { useScanAdd } from "@/app/domains/invoices/_hooks/scan";
 *
 * export function ScanUploader() {
 *   const { addScan, isLoading, error } = useScanAdd();
 *
 *   const handleUpload = async (files: FileList) => {
 *     for (const file of Array.from(files)) {
 *       await addScan(file);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" multiple onChange={e => handleUpload(e.target.files)} />
 *       {isLoading && <Spinner />}
 *       {error && <ErrorMessage>{error}</ErrorMessage>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Delete scan with confirmation
 * "use client";
 *
 * import { useScanDelete } from "@/app/domains/invoices/_hooks/scan";
 *
 * export function ScanCard({ scan }: { scan: Scan }) {
 *   const { deleteScan, isDeleting } = useScanDelete();
 *
 *   const handleDelete = async () => {
 *     const confirmed = await confirmDialog("Delete this scan?");
 *     if (confirmed) {
 *       await deleteScan(scan.id);
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
 * ```typescript
 * // Rotate scan with optimistic update
 * "use client";
 *
 * import { useScanRotation } from "@/app/domains/invoices/_hooks/scan";
 *
 * export function ScanViewer({ scan }: { scan: Scan }) {
 *   const { rotateScan, isRotating } = useScanRotation();
 *
 *   const handleRotate = (degrees: 90 | 180 | 270) => {
 *     rotateScan(scan.id, degrees);
 *     // UI updates optimistically before server confirms
 *   };
 *
 *   return (
 *     <div>
 *       <img src={scan.blobUrl} alt={scan.name} />
 *       <button onClick={() => handleRotate(90)} disabled={isRotating}>
 *         Rotate 90°
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
 * @see {@link createScan} - Server action for uploading scans
 * @see {@link deleteScan} - Server action for deleting scans
 * @see {@link updateScan} - Server action for updating scans
 */

export { useScanAdd } from "./useScanAdd";
export { useScanDelete } from "./useScanDelete";
export { useScanRename } from "./useScanRename";
export { useScanRotation } from "./useScanRotation";
