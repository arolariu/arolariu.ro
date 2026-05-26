"use client";

/**
 * @fileoverview Shared confirmation dialog for standalone scan deletion.
 * @module app/domains/invoices/_dialogs/DeleteScanDialog
 *
 * @remarks
 * This dialog is lazy-loaded by `DialogContainer` for the
 * `SHARED__SCAN_DELETE` dialog type. It reads the target scan from dialog
 * context and delegates deletion to `useScanDelete`, which removes the Azure
 * blob and updates the standalone scans store after success.
 *
 * **Payload Contract**: `useDialog("SHARED__SCAN_DELETE", "delete")` provides
 * `{scan}` where `scan` includes the display name, blob URL, and scan
 * identifier needed by the delete hook.
 *
 * @see {@link useDialog} - Reads the active shared dialog payload.
 * @see {@link useScanDelete} - Performs standalone scan deletion and store sync.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {TbLoader2, TbTrash} from "react-icons/tb";
import {useDialog} from "../_contexts/DialogContext";
import styles from "./DeleteScanDialog.module.scss";
import { useScanDelete } from "../_hooks/scan";

/**
 * Renders the shared standalone scan deletion confirmation dialog.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Safety Features:**
 * - Uses `AlertDialog` primitives for destructive confirmation semantics.
 * - Displays the scan name in the localized confirmation message.
 * - Disables both cancel and delete controls while deletion is in progress.
 * - Prevents closing through `onOpenChange` while `isDeleting` is true.
 *
 * **Deletion Flow:**
 * 1. The dialog opens from `DialogContainer` when the active type is
 *    `SHARED__SCAN_DELETE`.
 * 2. Confirming calls `deleteScanCallback()`.
 * 3. `useScanDelete` calls the standalone `deleteScan` server action.
 * 4. On success, the scan is removed from the scans store and a success toast
 *    is shown. On failure, an error toast is shown and local state is preserved.
 *
 * **State Management:**
 * - Dialog visibility and payload come from `useDialog`.
 * - Deletion progress comes from `useScanDelete`.
 * - The dialog itself owns no scan mutation state.
 *
 * @returns The client-rendered standalone scan deletion dialog.
 *
 * @example
 * ```tsx
 * // Rendered indirectly by DialogContainer after opening this dialog type.
 * openDialog("SHARED__SCAN_DELETE", "delete", {scan});
 * ```
 */
export default function DeleteScanDialog(): React.JSX.Element {
  const t = useTranslations();

  const {
    isOpen,
    close,
    currentDialog: {
      payload: {scan},
    },
  } = useDialog("SHARED__SCAN_DELETE", "delete");

  const {isDeleting, deleteScanCallback} = useScanDelete(scan);

  /**
   * Executes the confirmed standalone scan deletion.
   *
   * @remarks
   * The callback delegates to `useScanDelete`, which owns the Azure-backed
   * deletion server action, scans store cleanup, and toast feedback. The
   * confirm button disables itself while `isDeleting` is true.
   *
   * @returns A promise that resolves after the scan delete hook completes.
   */
  const handleDelete = useCallback(async () => {
    await deleteScanCallback();
  }, [deleteScanCallback]);

  /**
   * Handles dialog open-state transitions while protecting active deletions.
   *
   * @remarks
   * Closing is ignored while deletion is in progress so the user cannot dismiss
   * the modal during a destructive operation. When idle, close requests delegate
   * to the shared dialog context.
   *
   * @param shouldOpen - Next open state requested by the alert dialog primitive.
   * @returns Nothing; closes the dialog only for idle close requests.
   */
  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen && !isDeleting) {
        close();
      }
    },
    [close, isDeleting],
  );

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={styles["dialogTitle"]}>
            <TbTrash className={styles["titleIcon"]} />
            {t((m) => m.pages.invoices.viewScans.scanCard.deleteDialog.title)}
          </AlertDialogTitle>
          <AlertDialogDescription>{t((m) => m.pages.invoices.viewScans.scanCard.deleteDialog.description, {name: scan.name})}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t((m) => m.pages.invoices.viewScans.scanCard.deleteDialog.cancel)}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className={styles["deleteButton"]}>
            {isDeleting ? (
              <>
                <TbLoader2 className={styles["spinnerIcon"]} />
                {t((m) => m.pages.invoices.viewScans.scanCard.deleteDialog.deleting)}
              </>
            ) : (
              <>
                <TbTrash className={styles["trashIcon"]} />
                {t((m) => m.pages.invoices.viewScans.scanCard.deleteDialog.delete)}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
