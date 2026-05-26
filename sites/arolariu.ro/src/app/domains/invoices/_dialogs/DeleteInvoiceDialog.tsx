"use client";

/**
 * @fileoverview Shared confirmation dialog for destructive invoice deletion.
 * @module app/domains/invoices/_dialogs/DeleteInvoiceDialog
 *
 * @remarks
 * This dialog is lazy-loaded by `DialogContainer` for the
 * `SHARED__INVOICE_DELETE` dialog type. It reads the selected invoice from the
 * dialog payload, requires two explicit confirmation signals, and delegates the
 * actual mutation to `useInvoiceDelete`.
 *
 * **Execution Context**: Client Component only. The component uses dialog
 * context, local confirmation state, localized copy, animated UI states, and a
 * client hook that wraps the invoice delete server action.
 *
 * **Payload Contract**: `useDialog("SHARED__INVOICE_DELETE", "delete")`
 * provides `{invoice}`. The invoice is expected to include its identifier, name,
 * line items, scans, and sharing information so the dialog can show deletion
 * impact before the user confirms.
 *
 * @see {@link useDialog} - Reads the active shared dialog payload.
 * @see {@link useInvoiceDelete} - Performs the delete mutation and store sync.
 */

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Separator,
} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import {TbAlertTriangle, TbFileX, TbLoader2, TbPhoto, TbReceipt, TbShoppingCart, TbTrash, TbX} from "react-icons/tb";
import {useDialog} from "../_contexts/DialogContext";
import styles from "./DeleteInvoiceDialog.module.scss";
import { useInvoiceDelete } from "../_hooks/invoice";

/**
 * Renders the shared invoice deletion confirmation dialog.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Safety Features:**
 * - Displays the invoice name, identifier, and optional description.
 * - Requires typing the exact invoice display name before enabling deletion.
 * - Requires checking an acknowledgement checkbox.
 * - Shows impact counts for scans, line items, and shared access entries.
 *
 * **Deletion Flow:**
 * 1. The dialog opens from `DialogContainer` when the active type is
 *    `SHARED__INVOICE_DELETE`.
 * 2. Local confirmation state derives `isConfirmValid`.
 * 3. The destructive button calls `deleteInvoiceCallback(invoice.id)`.
 * 4. While deletion is in progress, the confirmation body is replaced by an
 *    animated loading state and the footer buttons are disabled.
 *
 * **State Management:**
 * - Dialog visibility and payload come from `useDialog`.
 * - Confirmation text and acknowledgement are local component state.
 * - Invoice deletion, navigation, toast feedback, and Zustand synchronization
 *   are delegated to `useInvoiceDelete`.
 *
 * **Accessibility:**
 * Uses the shared `Dialog` primitives for focus trapping and labelling. The
 * confirmation input is associated with its label through `htmlFor`, and the
 * destructive action remains disabled until both confirmation requirements pass.
 *
 * @returns The client-rendered invoice deletion dialog.
 *
 * @example
 * ```tsx
 * // Rendered indirectly by DialogContainer after opening this dialog type.
 * openDialog("SHARED__INVOICE_DELETE", "delete", {invoice});
 * ```
 */
export default function DeleteInvoiceDialog(): React.JSX.Element {
  const t = useTranslations();

  const {
    isOpen,
    close,
    currentDialog: {
      payload: {invoice},
    },
  } = useDialog("SHARED__INVOICE_DELETE", "delete");

  const [confirmText, setConfirmText] = useState<string>("");
  const [understoodCheckbox, setUnderstoodCheckbox] = useState<boolean>(false);

  const {deleteInvoiceCallback, isDeleting} = useInvoiceDelete();

  const invoiceName = invoice.name || `${invoice.id.slice(0, 8)}`;
  const isConfirmValid = confirmText === invoiceName && understoodCheckbox;

  /**
   * Updates the typed confirmation value used to unlock deletion.
   *
   * @remarks
   * This callback intentionally stores the raw input value without trimming.
   * The dialog requires an exact match with `invoiceName`, so whitespace is a
   * meaningful mismatch and keeps the destructive action disabled.
   *
   * @param e - Change event emitted by the confirmation text input.
   * @returns Nothing; updates local confirmation state.
   */
  const handleConfirmTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmText(e.target.value);
  }, []);

  /**
   * Records whether the user acknowledged the deletion impact.
   *
   * @remarks
   * The shared checkbox can emit `true`, `false`, or `"indeterminate"`. Only a
   * strict `true` value satisfies the safety gate; all other states keep the
   * destructive action disabled.
   *
   * @param checked - Checkbox state emitted by the component library checkbox.
   * @returns Nothing; updates local acknowledgement state.
   */
  const handleCheckboxChange = useCallback((checked: boolean | "indeterminate") => {
    setUnderstoodCheckbox(checked === true);
  }, []);

  /**
   * Closes the dialog and resets transient confirmation state.
   *
   * @remarks
   * Resetting before closing prevents a previously confirmed invoice name or
   * acknowledgement checkbox from leaking into the next invoice deletion flow.
   *
   * @returns Nothing; clears local state and closes the shared dialog.
   */
  const handleClose = useCallback(() => {
    setConfirmText("");
    setUnderstoodCheckbox(false);
    close();
  }, [close]);

  /**
   * Executes the confirmed invoice deletion workflow.
   *
   * @remarks
   * The callback delegates to `useInvoiceDelete`, which owns the server action,
   * local invoice store synchronization, success/error toast feedback, and
   * post-delete navigation. The button invoking this callback is disabled until
   * `isConfirmValid` is true.
   *
   * @returns A promise that resolves after the delete hook finishes its workflow.
   */
  const handleDelete = useCallback(async () => {
    await deleteInvoiceCallback(invoice.id);
  }, [invoice.id, deleteInvoiceCallback]);

  /**
   * Responds to open-state changes emitted by the dialog primitive.
   *
   * @remarks
   * The shared dialog component reports both open and close transitions. This
   * handler only acts on close requests, routing them through `handleClose` so
   * state cleanup remains centralized.
   *
   * @param shouldOpen - Next open state requested by the dialog primitive.
   * @returns Nothing; closes and resets the dialog when `shouldOpen` is false.
   */
  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen) {
        handleClose();
      }
    },
    [handleClose],
  );

  // Calculate deletion impact
  const itemCount = invoice.items?.length ?? 0;
  const scanCount = invoice.scans?.length ?? 0;
  const sharedCount = invoice.sharedWith?.length ?? 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["dialogContentMaxW"]}>
        <DialogHeader>
          <DialogTitle className={styles["dialogTitleRed"]}>
            <TbTrash className={styles["titleIcon"]} />
            {t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.title)}
          </DialogTitle>
          <DialogDescription>{t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.description)}</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode='wait'>
          {isDeleting ? (
            <motion.div
              key='deleting'
              initial={{opacity: 0, scale: 0.95}}
              animate={{opacity: 1, scale: 1}}
              exit={{opacity: 0, scale: 0.95}}
              className={styles["deletingState"]}>
              <motion.div
                animate={{rotate: 360}}
                transition={{duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear"}}
                className={styles["spinnerWrapper"]}>
                <TbLoader2 className={styles["spinnerIcon"]} />
              </motion.div>
              <p className={styles["deletingTitle"]}>{t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.deleting.title)}</p>
              <p className={styles["deletingDescription"]}>{t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.deleting.description)}</p>
            </motion.div>
          ) : (
            <motion.div
              key='confirm'
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              className={styles["confirmBody"]}>
              {/* Invoice Summary Card */}
              <div className={styles["summaryCard"]}>
                <div className={styles["summaryRow"]}>
                  <div className={styles["summaryIconBox"]}>
                    <TbReceipt className={styles["summaryIcon"]} />
                  </div>
                  <div className={styles["summaryContent"]}>
                    <p className={styles["summaryName"]}>{invoiceName}</p>
                    <p className={styles["summaryId"]}>{invoice.id}</p>
                    {invoice.description ? <p className={styles["summaryDescription"]}>{invoice.description}</p> : null}
                  </div>
                </div>
              </div>

              {/* Deletion Impact Warning */}
              <Alert
                variant='destructive'
                className={styles["alertRed"]}>
                <TbAlertTriangle className={styles["impactIcon"]} />
                <AlertTitle>{t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.impact.title)}</AlertTitle>
                <AlertDescription>
                  <p className={styles["impactIntro"]}>{t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.impact.intro)}</p>
                  <ul className={styles["impactList"]}>
                    <li className={styles["impactItem"]}>
                      <TbFileX className={styles["impactIcon"]} />
                      {t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.impact.invoiceRecord)}
                    </li>
                    {scanCount > 0 && (
                      <li className={styles["impactItem"]}>
                        <TbPhoto className={styles["impactIcon"]} />
                        {t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.impact.uploadedScans, {count: String(scanCount)})}
                      </li>
                    )}
                    {itemCount > 0 && (
                      <li className={styles["impactItem"]}>
                        <TbShoppingCart className={styles["impactIcon"]} />
                        {t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.impact.lineItems, {count: String(itemCount)})}
                      </li>
                    )}
                    {sharedCount > 0 && (
                      <li className={styles["impactItem"]}>
                        <TbX className={styles["impactIcon"]} />
                        {t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.impact.sharedAccess, {count: String(sharedCount)})}
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>

              <Separator />

              {/* Confirmation Input */}
              <div className={styles["confirmSection"]}>
                <div className={styles["confirmField"]}>
                  <Label htmlFor='confirm-name'>
                    {t.rich((m) => m["IMS--Dialogs"].deleteInvoiceDialog.confirmation.typeToConfirm, {
                      name: invoiceName,
                      // eslint-disable-next-line react/no-unstable-nested-components -- single-call site; hoisting is more boilerplate than benefit
                      highlight: (chunks) => <span className={styles["confirmHighlight"]}>{chunks}</span>,
                    })}
                  </Label>
                  <Input
                    id='confirm-name'
                    value={confirmText}
                    onChange={handleConfirmTextChange}
                    placeholder={invoiceName}
                    className={confirmText === invoiceName ? styles["inputGreen"] : ""}
                    autoComplete='off'
                  />
                </div>

                {/* Understanding Checkbox */}
                <div className={styles["checkboxCard"]}>
                  <Checkbox
                    nativeButton
                    id='understand-deletion'
                    checked={understoodCheckbox}
                    onCheckedChange={handleCheckboxChange}
                  />
                  <div className={styles["checkboxContent"]}>
                    <Label
                      htmlFor='understand-deletion'
                      className={styles["labelCursorSm"]}>
                      {t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.confirmation.understoodLabel)}
                    </Label>
                    <p className={styles["checkboxDescription"]}>{t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.confirmation.understoodDescription)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className={styles["dialogFooterGap"]}>
          <Button
            type='button'
            variant='outline'
            onClick={handleClose}
            disabled={isDeleting}>
            {t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.buttons.cancel)}
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}>
            {isDeleting ? (
              <>
                <TbLoader2 className={styles["buttonSpinnerIcon"]} />
                {t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.buttons.deleting)}
              </>
            ) : (
              <>
                <TbTrash className={styles["buttonIcon"]} />
                {t((m) => m["IMS--Dialogs"].deleteInvoiceDialog.buttons.deletePermanently)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
