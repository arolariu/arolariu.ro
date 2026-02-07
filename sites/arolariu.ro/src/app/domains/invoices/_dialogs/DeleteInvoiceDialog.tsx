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
  const removeInvoice = useInvoicesStore((state) => state.removeInvoice);

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

      toast("Invoice Deleted", {
        description: "The invoice was deleted successfully.",
      });
      handleClose();
      router.push("/domains/invoices/view-invoices");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast("Delete Failed", {
        description: "We couldn't delete this invoice. Please try again.",
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
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-red-600 dark:text-red-400'>
            <TbTrash className={styles["titleIcon"]} />
            Delete Invoice
          </DialogTitle>
          <DialogDescription>This action cannot be undone. Please review carefully before proceeding.</DialogDescription>
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
              <p className={styles["deletingTitle"]}>Deleting invoice...</p>
              <p className={styles["deletingDescription"]}>Please wait while we remove all associated data.</p>
            </motion.div>
          ) : (
            <motion.div
              key='confirm'
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              className={styles["confirmBody"]}>
              {/* Invoice Summary Card */}
              <main className={styles["summaryCard"]}>
                <main className={styles["summaryRow"]}>
                  <main className={styles["summaryIconBox"]}>
                    <TbReceipt className={styles["summaryIcon"]} />
                  </main>
                  <main className={styles["summaryContent"]}>
                    <p className={styles["summaryName"]}>{invoiceName}</p>
                    <p className={styles["summaryId"]}>{invoice.id}</p>
                    {invoice.description ? <p className={styles["summaryDescription"]}>{invoice.description}</p> : null}
                  </main>
                </main>
              </main>

              {/* Deletion Impact Warning */}
              <Alert
                variant='destructive'
                className='border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50'>
                <TbAlertTriangle className={styles["impactIcon"]} />
                <AlertTitle>Permanent Deletion</AlertTitle>
                <AlertDescription>
                  <p className={styles["impactIntro"]}>The following data will be permanently deleted:</p>
                  <ul className={styles["impactList"]}>
                    <li className={styles["impactItem"]}>
                      <TbFileX className={styles["impactIcon"]} />
                      Invoice record and metadata
                    </li>
                    {scanCount > 0 && (
                      <li className={styles["impactItem"]}>
                        <TbPhoto className={styles["impactIcon"]} />
                        {scanCount} uploaded scan(s)
                      </li>
                    )}
                    {itemCount > 0 && (
                      <li className={styles["impactItem"]}>
                        <TbShoppingCart className={styles["impactIcon"]} />
                        {itemCount} line item(s)
                      </li>
                    )}
                    {sharedCount > 0 && (
                      <li className={styles["impactItem"]}>
                        <TbX className={styles["impactIcon"]} />
                        Shared access for {sharedCount} user(s)
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>

              <Separator />

              {/* Confirmation Input */}
              <main className={styles["confirmSection"]}>
                <main className={styles["confirmField"]}>
                  <Label htmlFor='confirm-name'>
                    Type <span className={styles["confirmHighlight"]}>{invoiceName}</span> to confirm:
                  </Label>
                  <Input
                    id='confirm-name'
                    value={confirmText}
                    onChange={handleConfirmTextChange}
                    placeholder={invoiceName}
                    className={confirmText === invoiceName ? "border-green-500 focus-visible:ring-green-500" : ""}
                    autoComplete='off'
                  />
                </main>

                {/* Understanding Checkbox */}
                <main className={styles["checkboxCard"]}>
                  <Checkbox
                    id='understand-deletion'
                    checked={understoodCheckbox}
                    onCheckedChange={handleCheckboxChange}
                  />
                  <main className={styles["checkboxContent"]}>
                    <Label
                      htmlFor='understand-deletion'
                      className='cursor-pointer text-sm leading-none font-medium'>
                      I understand this action is permanent
                    </Label>
                    <p className={styles["checkboxDescription"]}>
                      This invoice and all its data will be permanently deleted and cannot be recovered.
                    </p>
                  </main>
                </main>
              </main>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={handleClose}
            disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}>
            {isDeleting ? (
              <>
                <TbLoader2 className={styles["buttonSpinnerIcon"]} />
                Deleting...
              </>
            ) : (
              <>
                <TbTrash className={styles["buttonIcon"]} />
                Delete Permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
