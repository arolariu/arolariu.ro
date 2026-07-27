"use client";

/**
 * @fileoverview Hook for managing scan deletion with server action integration.
 * @module app/domains/invoices/_hooks/scan/useScanDelete
 *
 * @remarks
 * Wraps standalone scan deletion with loading state, toast feedback, and
 * Zustand scans store cleanup after the server action succeeds.
 */

import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import {deleteScan as removeScanServerSide} from "../../_actions/scans";

/**
 * Hook output type for standalone scan deletion.
 */
type HookOutputType = Readonly<{
  /** Whether a deletion operation is in progress */
  isDeleting: boolean;
  /** Executes the scan deletion */
  deleteScanCallback: () => Promise<void>;
}>;

/**
 * Manages scan deletion state and server action integration.
 *
 * @remarks
 * **Behavior contract:**
 * - `deleteScanCallback()` executes the following steps:
 *   1. Sets `isDeleting→true`
 *   2. Calls `deleteScan` server action with scan blobUrl
 *   3. On success:
 *      - Removes scan from Zustand store via `removeScan`
 *      - Shows success toast
 *      - Calls optional `onComplete` callback
 *   4. On failure:
 *      - Shows error toast with server error message
 *   5. Sets `isDeleting→false` in `finally` block
 *
 * **Error Handling:**
 * - Server action errors are caught and displayed to user
 * - Store is not updated on failure (optimistic update not used)
 * - Deletion failures do not trigger `onComplete` callback
 *
 * @param scan - The standalone scan to delete.
 * @returns Hook state with deletion progress and the delete callback.
 *
 * @example
 * ```tsx
 * const deletion = useScanDelete(scan, () => {
 *   router.push("/domains/invoices/view-scans");
 * });
 *
 * return (
 *   <button onClick={deletion.deleteScanCallback} disabled={deletion.isDeleting}>
 *     {deletion.isDeleting ? "Deleting..." : "Delete Scan"}
 *   </button>
 * );
 * ```
 */
export function useScanDelete(scan: CachedScan): Readonly<HookOutputType> {
  const removeScanClientSide = useScansStore((state) => state.removeScan);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const t = useTranslations();

  const deleteScanCallback = useCallback(async (): Promise<void> => {
    setIsDeleting(true);
    try {
      const result = await removeScanServerSide({scanId: scan.id});
      if (result.success) {
        removeScanClientSide(scan.id);
        toast.success(t((m) => m.pages.invoices.viewScans.scanCard.deleteDialog.success));
      } else {
        toast.error(t((m) => m.pages.invoices.viewScans.scanCard.deleteDialog.error));
      }
    } catch (error) {
      toast.error(t((m) => m.pages.invoices.viewScans.scanCard.deleteDialog.error));
      console.error("Error deleting scan:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [scan.id, removeScanClientSide, t]);

  return {isDeleting, deleteScanCallback} as const;
}
