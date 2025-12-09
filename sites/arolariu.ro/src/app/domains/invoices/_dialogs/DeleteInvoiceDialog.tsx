"use client";

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
} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useCallback, useState} from "react";
import {TbAlertTriangle, TbFileX, TbLoader2, TbPhoto, TbReceipt, TbShoppingCart, TbTrash, TbX} from "react-icons/tb";
import {useDialog} from "../_contexts/DialogContext";

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
 * @returns The DeleteInvoiceDialog component, CSR'ed.
 */
export default function DeleteInvoiceDialog(): React.JSX.Element {
  const {
    isOpen,
    open,
    close,
    currentDialog: {payload},
  } = useDialog("EDIT_INVOICE__DELETE");

  const {invoice} = payload as {invoice: Invoice};

  const [confirmText, setConfirmText] = useState<string>("");
  const [understoodCheckbox, setUnderstoodCheckbox] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const invoiceName = invoice.name || `Invoice ${invoice.id.slice(0, 8)}`;
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

    // Simulate deletion process
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Log deletion (API integration pending)
    console.info("Deleting invoice:", invoice.id);

    setIsDeleting(false);
    handleClose();
  }, [invoice.id, isConfirmValid, handleClose]);

  // Calculate deletion impact
  const itemCount = invoice.items?.length ?? 0;
  const scanCount = invoice.scans?.length ?? 0;
  const sharedCount = invoice.sharedWith?.length ?? 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : handleClose())}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-red-600 dark:text-red-400'>
            <TbTrash className='h-5 w-5' />
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
              className='flex flex-col items-center justify-center space-y-4 py-8'>
              <motion.div
                animate={{rotate: 360}}
                transition={{duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "linear"}}
                className='rounded-full bg-red-100 p-4 dark:bg-red-900/30'>
                <TbLoader2 className='h-10 w-10 text-red-500' />
              </motion.div>
              <p className='font-medium text-red-600 dark:text-red-400'>Deleting invoice...</p>
              <p className='text-muted-foreground text-sm'>Please wait while we remove all associated data.</p>
            </motion.div>
          ) : (
            <motion.div
              key='confirm'
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              className='space-y-4'>
              {/* Invoice Summary Card */}
              <div className='bg-muted/30 rounded-lg border p-4'>
                <div className='flex items-start gap-3'>
                  <div className='rounded-lg bg-red-100 p-2 dark:bg-red-900/30'>
                    <TbReceipt className='h-6 w-6 text-red-500' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate font-semibold'>{invoiceName}</p>
                    <p className='text-muted-foreground font-mono text-xs'>{invoice.id}</p>
                    {invoice.description && <p className='text-muted-foreground mt-1 line-clamp-2 text-sm'>{invoice.description}</p>}
                  </div>
                </div>
              </div>

              {/* Deletion Impact Warning */}
              <Alert
                variant='destructive'
                className='border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50'>
                <TbAlertTriangle className='h-4 w-4' />
                <AlertTitle>Permanent Deletion</AlertTitle>
                <AlertDescription>
                  <p className='mb-2'>The following data will be permanently deleted:</p>
                  <ul className='space-y-1 text-sm'>
                    <li className='flex items-center gap-2'>
                      <TbFileX className='h-4 w-4' />
                      Invoice record and metadata
                    </li>
                    {scanCount > 0 && (
                      <li className='flex items-center gap-2'>
                        <TbPhoto className='h-4 w-4' />
                        {scanCount} uploaded scan(s)
                      </li>
                    )}
                    {itemCount > 0 && (
                      <li className='flex items-center gap-2'>
                        <TbShoppingCart className='h-4 w-4' />
                        {itemCount} line item(s)
                      </li>
                    )}
                    {sharedCount > 0 && (
                      <li className='flex items-center gap-2'>
                        <TbX className='h-4 w-4' />
                        Shared access for {sharedCount} user(s)
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>

              <Separator />

              {/* Confirmation Input */}
              <div className='space-y-3'>
                <div className='space-y-2'>
                  <Label htmlFor='confirm-name'>
                    Type <span className='font-semibold text-red-600 dark:text-red-400'>{invoiceName}</span> to confirm:
                  </Label>
                  <Input
                    id='confirm-name'
                    value={confirmText}
                    onChange={handleConfirmTextChange}
                    placeholder={invoiceName}
                    className={confirmText === invoiceName ? "border-green-500 focus-visible:ring-green-500" : ""}
                    autoComplete='off'
                  />
                </div>

                {/* Understanding Checkbox */}
                <div className='flex items-start space-x-3 rounded-lg border p-3'>
                  <Checkbox
                    id='understand-deletion'
                    checked={understoodCheckbox}
                    onCheckedChange={handleCheckboxChange}
                  />
                  <div className='space-y-1'>
                    <Label
                      htmlFor='understand-deletion'
                      className='cursor-pointer text-sm leading-none font-medium'>
                      I understand this action is permanent
                    </Label>
                    <p className='text-muted-foreground text-xs'>
                      This invoice and all its data will be permanently deleted and cannot be recovered.
                    </p>
                  </div>
                </div>
              </div>
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
                <TbLoader2 className='mr-2 h-4 w-4 animate-spin' />
                Deleting...
              </>
            ) : (
              <>
                <TbTrash className='mr-2 h-4 w-4' />
                Delete Permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
