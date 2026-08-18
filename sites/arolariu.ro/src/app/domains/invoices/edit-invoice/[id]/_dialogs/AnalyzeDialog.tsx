"use client";

/**
 * @fileoverview Dialog for configuring durable invoice analysis enqueueing.
 * @module app/domains/invoices/edit-invoice/[id]/_dialogs/AnalyzeDialog
 */

import {InvoiceAnalysisForm} from "@/app/domains/invoices/_components/analysis/InvoiceAnalysisForm";
import {useDialog} from "@/app/domains/invoices/_contexts/DialogContext";
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbScanEye} from "react-icons/tb";
import styles from "./AnalyzeDialog.module.scss";

/**
 * Renders the invoice analysis dialog without simulating background worker progress.
 *
 * @remarks
 * The dialog only confirms that an analysis run was accepted by the queue. Its
 * embedded form schedules one hard refresh thirty seconds after that accepted
 * acknowledgement so the next page load can show worker-applied results.
 *
 * @returns Client-rendered invoice analysis dialog.
 */
export default function AnalyzeDialog(): React.JSX.Element {
  const t = useTranslations();
  const {
    isOpen,
    close,
    currentDialog: {payload},
  } = useDialog("EDIT_INVOICE__ANALYSIS");

  const {invoice} = payload;

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- Dialog closes from the Base UI open-state callback.
      onOpenChange={(shouldOpen) => {
        if (!shouldOpen) {
          close();
        }
      }}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle className={styles["dialogTitle"]}>
            <TbScanEye
              aria-hidden='true'
              className={styles["scanIcon"]}
            />
            {t((messages) => messages.forms.invoices.analysis.dialog.title)}
          </DialogTitle>
          <DialogDescription>{t((messages) => messages.forms.invoices.analysis.dialog.description)}</DialogDescription>
        </DialogHeader>

        <InvoiceAnalysisForm
          invoiceIdentifier={invoice.id}
          refreshAfterAcceptance
        />

        <DialogFooter className={styles["dialogFooter"]}>
          <Button
            type='button'
            variant='outline'
            onClick={close}>
            {t((messages) => messages.forms.invoices.analysis.dialog.cancel)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
