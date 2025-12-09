"use client";

import type {Invoice} from "@/types/invoices";
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@arolariu/components";
import {useCallback} from "react";
import {TbDiscFilled} from "react-icons/tb";
import {useDialog} from "../_contexts/DialogContext";

export default function DeleteInvoiceDialog(): React.JSX.Element {
  const {
    isOpen,
    open,
    close,
    currentDialog: {payload},
  } = useDialog("EDIT_INVOICE__DELETE");

  const {invoice} = payload as {invoice: Invoice};

  const handleDelete = useCallback(() => {
    // Perform delete action here
    console.log("Deleting invoice:", invoice);
    close();
  }, [invoice, close]);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-2xl md:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>Delete Invoice</DialogTitle>
          <DialogDescription>Are you sure you want to delete invoice {invoice.id}?</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={close}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleDelete}>
            <TbDiscFilled className='mr-2 h-4 w-4' />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
