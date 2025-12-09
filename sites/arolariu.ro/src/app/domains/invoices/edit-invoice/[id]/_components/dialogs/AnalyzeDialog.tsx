"use client";

import {useDialog} from "@/app/domains/invoices/_contexts/DialogContext";
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@arolariu/components";
import {useCallback} from "react";
import {TbScanEye} from "react-icons/tb";

export default function AnalyzeDialog(): React.JSX.Element {
  const {
    isOpen,
    open,
    close,
    currentDialog: {payload},
  } = useDialog("EDIT_INVOICE__ANALYSIS");

  const {invoice} = payload as {invoice: {id: string}};

  const handleAnalysis = useCallback(() => {
    // Perform analysis action here
    console.log("Analyzing invoice:", invoice);
    close();
  }, [invoice, close]);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-2xl md:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>Analyze Invoice</DialogTitle>
          <DialogDescription>Analyze invoice {invoice.id} using AI.</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type='button'
            onClick={handleAnalysis}>
            <TbScanEye className='mr-2 h-4 w-4' />
            Analyze with AI
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={close}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
