"use client";

import deleteInvoice from "@/lib/actions/invoices/deleteInvoice";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
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
  toast,
} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {TbAlertTriangle, TbFileX, TbLoader2, TbPhoto, TbReceipt, TbShoppingCart, TbTrash, TbX} from "react-icons/tb";
import {useDialog} from "../_contexts/DialogContext";
import styles from "./DeleteInvoiceDialog.module.scss";

/**
 * Dialog for confirming and executing invoice deletion.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Safety Features**:
 * - Displays invoice summary before deletion
 * - Requires typing invoice name to confirm
 * - Checkbox for understanding data loss
 * - Visual warning with impact summary
 *
 * **Deletion Impact**:
 * - Invoice data permanently removed
 * - Associated scans deleted from storage
 * - Line items and merchant associations cleared
 * - Shared access revoked for all users
 *
 * **State Management**:
 * - Updates Zustand store via `removeInvoice` after successful deletion
 * - This ensures the cached invoice list is immediately updated
 * - No need for `revalidatePath` since we use client-side state management
 *
 * @returns The DeleteInvoiceDialog component, CSR'ed.
 */
export default function DeleteInvoiceDialog(): React.JSX.Element {
  const router = useRouter();
  const t = useTranslations("IMS--Dialogs.deleteInvoiceDialog");
  const removeInvoice = useInvoicesStore((state) => state.removeEntity);

  const {
    isOpen,
    open,
    close,
    currentDialog: {payload},
  } = useDialog("SHARED__INVOICE_DELETE", "delete");

  const {invoice} = payload as {invoice: Invoice};

  const [confirmText, setConfirmText] = useState<string>("");
  const [understoodCheckbox, setUnderstoodCheckbox] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const invoiceName = invoice.name || `${invoice.id.slice(0, 8)}`;
  const isConfirmValid = confirmText === invoiceName && understoodCheckbox;

  const handleConfirmTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmText(e.target.value);
  }, []);

  const handleCheckboxChange = useCallback((checked: boolean | "indeterminate") => {
    setUnderstoodCheckbox(checked === true);
  }, []);

  const handleClose = useCallback(() => {
    setConfirmText("");
    setUnderstoodCheckbox(false);
    setIsDeleting(false);
    close();
  }, [close]);

  const handleDelete = useCallback(async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);

    try {
      await deleteInvoice({invoiceId: invoice.id});

      // Update Zustand store to remove the deleted invoice
      // This ensures the cached invoice list is immediately updated
      removeInvoice(invoice.id);

      toast(t("toasts.deletedTitle"), {
        description: t("toasts.deletedDescription"),
      });
      handleClose();
      router.push("/domains/invoices/view-invoices");
    } catch (error) {
      console.error(t("console.deleteError"), error);
      toast(t("toasts.deleteFailedTitle"), {
        description: t("toasts.deleteFailedDescription"),
      });
    } finally {
      setIsDeleting(false);
    }
  }, [invoice.id, isConfirmValid, handleClose, router, removeInvoice]);

  // Calculate deletion impact
  const itemCount = invoice.items?.length ?? 0;
  const scanCount = invoice.scans?.length ?? 0;
  const sharedCount = invoice.sharedWith?.length ?? 0;

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- simple dialog open/close handler
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : handleClose())}>
      <DialogContent className={styles["dialogContentMaxW"]}>
        <DialogHeader>
          <DialogTitle className={styles["dialogTitleRed"]}>
            <TbTrash className={styles["titleIcon"]} />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
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
              <p className={styles["deletingTitle"]}>{t("deleting.title")}</p>
              <p className={styles["deletingDescription"]}>{t("deleting.description")}</p>
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
                <AlertTitle>{t("impact.title")}</AlertTitle>
                <AlertDescription>
                  <p className={styles["impactIntro"]}>{t("impact.intro")}</p>
                  <ul className={styles["impactList"]}>
                    <li className={styles["impactItem"]}>
                      <TbFileX className={styles["impactIcon"]} />
                      {t("impact.invoiceRecord")}
                    </li>
                    {scanCount > 0 && (
                      <li className={styles["impactItem"]}>
                        <TbPhoto className={styles["impactIcon"]} />
                        {t("impact.uploadedScans", {count: String(scanCount)})}
                      </li>
                    )}
                    {itemCount > 0 && (
                      <li className={styles["impactItem"]}>
                        <TbShoppingCart className={styles["impactIcon"]} />
                        {t("impact.lineItems", {count: String(itemCount)})}
                      </li>
                    )}
                    {sharedCount > 0 && (
                      <li className={styles["impactItem"]}>
                        <TbX className={styles["impactIcon"]} />
                        {t("impact.sharedAccess", {count: String(sharedCount)})}
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
                    {t.rich("confirmation.typeToConfirm", {
                      name: invoiceName,
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
                    id='understand-deletion'
                    checked={understoodCheckbox}
                    onCheckedChange={handleCheckboxChange}
                  />
                  <div className={styles["checkboxContent"]}>
                    <Label
                      htmlFor='understand-deletion'
                      className={styles["labelCursorSm"]}>
                      {t("confirmation.understoodLabel")}
                    </Label>
                    <p className={styles["checkboxDescription"]}>{t("confirmation.understoodDescription")}</p>
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
            {t("buttons.cancel")}
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}>
            {isDeleting ? (
              <>
                <TbLoader2 className={styles["buttonSpinnerIcon"]} />
                {t("buttons.deleting")}
              </>
            ) : (
              <>
                <TbTrash className={styles["buttonIcon"]} />
                {t("buttons.deletePermanently")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
