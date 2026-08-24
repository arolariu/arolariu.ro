"use client";

/**
 * @fileoverview Dialog for configuring and submitting an invoice to the analysis pipeline.
 * @module app/domains/invoices/edit-invoice/[id]/_dialogs/AnalyzeDialog
 *
 * @remarks
 * The backend analysis pipeline is **asynchronous**. A successful submit returns
 * `202 Accepted` with a queue message id. There is no completion signal.
 * This dialog shows exactly four states: idle, submitting, queued, and error.
 * It never implies analysis has finished.
 */

import {useDialog} from "@/app/domains/invoices/_contexts/DialogContext";
import InvoiceAnalysisControls from "../../../_components/analysis/InvoiceAnalysisControls";
import QueuedAnalysisNotice from "../../../_components/analysis/QueuedAnalysisNotice";
import {useAnalysisSubmission} from "../../../_hooks/analysis/useAnalysisSubmission";
import {
  buildInvoiceAnalysisRequest,
  resolveInvoiceCapabilities,
  type AnalysisProfile,
  type InvoiceAnalysisCapabilities,
} from "@/types/invoices/Analysis";
import {ClassificationOrigin} from "@/types/invoices/Classification";
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Spinner} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import {TbScanEye} from "react-icons/tb";
import styles from "./AnalyzeDialog.module.scss";

/**
 * Dialog for configuring and submitting an invoice to the analysis pipeline.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Honest state model**: idle → submitting → queued | error.
 * The dialog never claims analysis has completed: the backend returns
 * `202 Accepted` (queued), never a synchronous completion signal.
 *
 * **Decision D4**: `manualClassificationPresent` is set when the invoice
 * already has a user-supplied manual classification. InvoiceAnalysisControls
 * surfaces an overwrite warning when the user enables `invoiceClassification`.
 *
 * @returns The AnalyzeDialog component.
 */
export default function AnalyzeDialog(): React.JSX.Element {
  const t = useTranslations();
  const {
    isOpen,
    close,
    currentDialog: {payload},
  } = useDialog("EDIT_INVOICE__ANALYSIS");

  // payload is typed as {invoice: Invoice} only when the dialog is open;
  // at runtime it is null when the dialog is closed — use optional chaining to guard.
  const invoice = (payload as {invoice: {id: string; classification: {origin: string} | null} | null} | null)?.invoice ?? null;

  const [profile, setProfile] = useState<AnalysisProfile>("comprehensive");
  const [capabilities, setCapabilities] = useState<InvoiceAnalysisCapabilities>(() => resolveInvoiceCapabilities("comprehensive"));

  const {status, messageId, errorMessage, submit, refreshNow, reset} = useAnalysisSubmission({
    target: "invoice",
    identifier: invoice?.id ?? "",
    scheduleRefresh: true,
  });

  /** D4: warn when enabling invoiceClassification would overwrite a manual classification. */
  const manualClassificationPresent = invoice?.classification?.origin === ClassificationOrigin.Manual;

  const handleChange = useCallback((newProfile: AnalysisProfile, newCapabilities: InvoiceAnalysisCapabilities): void => {
    setProfile(newProfile);
    setCapabilities(newCapabilities);
  }, []);

  const handleSubmit = useCallback(async (): Promise<void> => {
    await submit(buildInvoiceAnalysisRequest(profile, capabilities));
  }, [profile, capabilities, submit]);

  const handleClose = useCallback((): void => {
    reset();
    close();
  }, [reset, close]);

  const handleOpenChange = useCallback(
    (shouldOpen: boolean): void => {
      if (!shouldOpen) handleClose();
    },
    [handleClose],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle className={styles["dialogTitle"]}>
            <TbScanEye className={styles["scanIcon"]} />
            {t((m) => m.dialogs.invoices.analyzeDialog.header.title)}
          </DialogTitle>
          <DialogDescription>
            {t((m) => m.dialogs.invoices.analyzeDialog.header.description)}{" "}
            <span className={styles["invoiceIdSnippet"]}>{invoice?.id.slice(0, 8)}...</span>
          </DialogDescription>
        </DialogHeader>

        {status === "queued" ? (
          <QueuedAnalysisNotice
            messageId={messageId}
            onRefresh={refreshNow}
          />
        ) : (
          <div className={styles["controlsSection"]}>
            <InvoiceAnalysisControls
              profile={profile}
              value={capabilities}
              manualClassificationPresent={manualClassificationPresent}
              onChange={handleChange}
              disabled={status === "submitting"}
            />
          </div>
        )}

        {status === "error" && (
          <div
            role='alert'
            className={styles["errorAlert"]}>
            {errorMessage ?? t((m) => m.dialogs.invoices.analyzeDialog.errors.genericError)}
          </div>
        )}

        <DialogFooter className={styles["dialogFooter"]}>
          <Button
            type='button'
            variant='outline'
            onClick={handleClose}
            disabled={status === "submitting"}>
            {t((m) => m.dialogs.invoices.analyzeDialog.buttons.cancel)}
          </Button>
          {status !== "queued" && (
            <Button
              type='button'
              onClick={handleSubmit}
              disabled={status === "submitting"}
              className={styles["analyzeButton"]}>
              {status === "submitting" ? (
                <>
                  <Spinner className={styles["buttonSpinner"]} />
                  {t((m) => m.dialogs.invoices.analyzeDialog.buttons.submitting)}
                </>
              ) : (
                <>
                  <TbScanEye className={styles["buttonScanIcon"]} />
                  {t((m) => m.dialogs.invoices.analyzeDialog.buttons.startAnalysis)}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
