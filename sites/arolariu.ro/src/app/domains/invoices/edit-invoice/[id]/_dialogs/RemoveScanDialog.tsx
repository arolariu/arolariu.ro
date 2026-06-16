"use client";

import {type Invoice, type InvoiceScan, InvoiceScanType} from "@/types/invoices";
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {TbAlertTriangle, TbLoader2, TbTrash} from "react-icons/tb";
import {detachScanFromInvoice} from "../../../_actions/invoices";
import ScanCard from "../../../_cards/ScanCard";
import {useDialog} from "../../../_contexts/DialogContext";
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
 * @see {@link detachScanFromInvoice} - Server action for scan removal
 */
export default function RemoveScanDialog(): React.JSX.Element {
  const t = useTranslations();
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
      toast.error(
        t((m) => m.dialogs.invoices.removeScanDialog.toasts.cannotDeleteLastTitle),
        {
          description: t((m) => m.dialogs.invoices.removeScanDialog.toasts.cannotDeleteLastDescription),
        },
      );
      return;
    }

    setIsDeleting(true);
    try {
      await detachScanFromInvoice({
        invoiceId: invoice.id,
        scanLocation: scan.location,
      });

      toast.success(
        t((m) => m.dialogs.invoices.removeScanDialog.toasts.removedTitle),
        {
          description: t((m) => m.dialogs.invoices.removeScanDialog.toasts.removedDescription),
        },
      );

      close();

      // Refresh the page to reflect the change
      router.refresh();
    } catch (error) {
      console.error(
        t((m) => m.dialogs.invoices.removeScanDialog.console.deleteError),
        error,
      );
      toast.error(
        t((m) => m.dialogs.invoices.removeScanDialog.toasts.removeFailedTitle),
        {
          description: error instanceof Error ? error.message : t((m) => m.dialogs.invoices.removeScanDialog.errors.unknown),
        },
      );
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
            {t((m) => m.dialogs.invoices.removeScanDialog.title)}
          </DialogTitle>
          <DialogDescription>
            {isLastScan
              ? t((m) => m.dialogs.invoices.removeScanDialog.descriptionLastScan)
              : t((m) => m.dialogs.invoices.removeScanDialog.description, {current: String(currentScanNumber), total: String(totalScans)})}
          </DialogDescription>
        </DialogHeader>

        {scan ? (
          <div className={styles["previewSection"]}>
            <ScanCard
              media={{
                src: scan.location,
                mediaKind: scan.scanType === InvoiceScanType.PDF ? "pdf" : "image",
                alt: t((m) => m.dialogs.invoices.removeScanDialog.scanAlt, {index: String(currentScanNumber)}),
              }}
              title={t((m) => m.dialogs.invoices.removeScanDialog.scanCaption, {index: String(currentScanNumber)})}
            />
          </div>
        ) : null}

        {isLastScan ? (
          <div className={styles["warningBox"]}>
            <p className={styles["warningTitle"]}>{t((m) => m.dialogs.invoices.removeScanDialog.warning.title)}</p>
            <p className={styles["warningText"]}>{t((m) => m.dialogs.invoices.removeScanDialog.warning.description)}</p>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={close}
            disabled={isDeleting}>
            {t((m) => m.dialogs.invoices.removeScanDialog.buttons.cancel)}
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleDelete}
            disabled={isDeleting || isLastScan}>
            {isDeleting ? (
              <>
                <TbLoader2 className={styles["spinnerIcon"]} />
                {t((m) => m.dialogs.invoices.removeScanDialog.buttons.removing)}
              </>
            ) : (
              <>
                <TbTrash className={styles["trashIcon"]} />
                {t((m) => m.dialogs.invoices.removeScanDialog.buttons.remove)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
