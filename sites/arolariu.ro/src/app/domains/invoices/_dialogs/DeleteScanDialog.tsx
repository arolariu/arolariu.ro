"use client";

/**
 * @fileoverview Dialog for confirming scan deletion.
 * @module app/domains/invoices/_dialogs/DeleteScanDialog
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
import {useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbLoader2, TbTrash} from "react-icons/tb";
import {useDialog} from "../_contexts/DialogContext";
import styles from "./DeleteScanDialog.module.scss";

/**
 * Dialog for confirming and executing scan deletion.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Safety Features**:
 * - Requires explicit confirmation via AlertDialog
 * - Shows scan name in confirmation message
 * - Disables confirm button during deletion
 *
 * **Deletion Flow**:
 * 1. User clicks confirm
 * 2. `useScanDelete` hook calls `deleteScan` server action
 * 3. On success: scan removed from Zustand store, dialog closes
 * 4. On failure: error toast shown, dialog remains open
 *
 * **State Management**:
 * - Uses `useDialog` to access payload and control dialog visibility
 * - Scan is removed from Zustand store after successful deletion
 *
 * @returns The DeleteScanDialog component, CSR'ed.
 */
export default function DeleteScanDialog(): React.JSX.Element {
  const t = useTranslations("IMS--ViewScans.deleteDialog");

  const {
    isOpen,
    close,
    currentDialog: {
      payload: {scan},
    },
  } = useDialog("SHARED__SCAN_DELETE", "delete");

  const {isDeleting, performDelete} = useScanDelete(scan, close);

  const handleDelete = useCallback(async () => {
    await performDelete();
  }, [performDelete]);

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
            {t("title")}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("description", {name: scan.name})}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className={styles["deleteButton"]}>
            {isDeleting ? (
              <>
                <TbLoader2 className={styles["spinnerIcon"]} />
                {t("deleting")}
              </>
            ) : (
              <>
                <TbTrash className={styles["trashIcon"]} />
                {t("delete")}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
