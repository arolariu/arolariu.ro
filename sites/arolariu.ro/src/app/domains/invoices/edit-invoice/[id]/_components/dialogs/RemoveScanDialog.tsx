"use client";

import {deleteInvoiceScan} from "@/lib/actions/invoices/deleteInvoiceScan";
import type {Invoice, InvoiceScan} from "@/types/invoices";
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, toast} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {TbAlertTriangle, TbLoader2, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./RemoveScanDialog.module.scss";

/**
 * Dialog for confirming removal of a scan from an invoice.
 *
 * @remarks
 * **Constraints**:
 * - Cannot delete the last remaining scan on an invoice
 * - Deletion marks the blob for cleanup (not immediate)
 *
 * **UI Features**:
 * - Shows preview of the scan to be deleted
 * - Displays warning if this is the last scan
 * - Confirmation required before deletion
 *
 * @returns Dialog component for removing invoice scans
 *
 * @see {@link deleteInvoiceScan} - Server action for scan removal
 */
export default function RemoveScanDialog(): React.JSX.Element {
  const t = useTranslations("IMS--Dialogs.removeScanDialog");
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("EDIT_INVOICE__REMOVE_SCAN", "delete");

  const invoice: Invoice | null = payload?.invoice ?? null;
  const scan: InvoiceScan | null = payload?.scan ?? null;
  const scanIndex = payload?.scanIndex ?? -1;

  const [isDeleting, setIsDeleting] = useState(false);

  const totalScans = invoice?.scans.length ?? 0;
  const isLastScan = totalScans === 1;
  const currentScanNumber = scanIndex >= 0 ? scanIndex + 1 : 1;

  const handleDelete = useCallback(async () => {
    if (!invoice || !scan) return;

    if (isLastScan) {
      toast.error(t("toasts.cannotDeleteLastTitle"), {
        description: t("toasts.cannotDeleteLastDescription"),
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteInvoiceScan({
        invoiceId: invoice.id,
        scanLocation: scan.location,
      });

      toast.success(t("toasts.removedTitle"), {
        description: t("toasts.removedDescription"),
      });

      close();

      // Refresh the page to reflect the change
      router.refresh();
    } catch (error) {
      console.error(t("console.deleteError"), error);
      toast.error(t("toasts.removeFailedTitle"), {
        description: error instanceof Error ? error.message : t("errors.unknown"),
      });
    } finally {
      setIsDeleting(false);
    }
  }, [invoice, scan, isLastScan, close, router, t]);

  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (shouldOpen) open();
      else close();
    },
    [open, close],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle className={styles["dialogTitle"]}>
            <TbAlertTriangle className={styles["alertIcon"]} />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {isLastScan ? t("descriptionLastScan") : t("description", {current: String(currentScanNumber), total: String(totalScans)})}
          </DialogDescription>
        </DialogHeader>

        {scan ? (
          <div className={styles["previewSection"]}>
            <div className={styles["previewImage"]}>
              <Image
                src={scan.location}
                alt={t("scanAlt", {index: String(currentScanNumber)})}
                width={400}
                height={300}
                className={styles["scanPreviewImage"]}
              />
            </div>
            <p className={styles["previewCaption"]}>{t("scanCaption", {index: String(currentScanNumber)})}</p>
          </div>
        ) : null}

        {isLastScan ? (
          <div className={styles["warningBox"]}>
            <p className={styles["warningTitle"]}>{t("warning.title")}</p>
            <p className={styles["warningText"]}>{t("warning.description")}</p>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={close}
            disabled={isDeleting}>
            {t("buttons.cancel")}
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleDelete}
            disabled={isDeleting || isLastScan}>
            {isDeleting ? (
              <>
                <TbLoader2 className={styles["spinnerIcon"]} />
                {t("buttons.removing")}
              </>
            ) : (
              <>
                <TbTrash className={styles["trashIcon"]} />
                {t("buttons.remove")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
