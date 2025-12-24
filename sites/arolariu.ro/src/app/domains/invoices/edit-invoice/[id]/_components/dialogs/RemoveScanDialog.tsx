"use client";

import {deleteInvoiceScan} from "@/lib/actions/invoices/deleteInvoiceScan";
import type {Invoice, InvoiceScan} from "@/types/invoices";
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, toast} from "@arolariu/components";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {TbAlertTriangle, TbLoader2, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";

/**
 * Payload structure for the remove scan dialog.
 */
type RemoveScanPayload = {
  invoice: Invoice;
  scan: InvoiceScan;
  scanIndex: number;
};

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
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("EDIT_INVOICE__SCAN", "delete");

  const data = payload as RemoveScanPayload | null;
  const invoice = data?.invoice ?? null;
  const scan = data?.scan ?? null;
  const scanIndex = data?.scanIndex ?? 0;

  const [isDeleting, setIsDeleting] = useState(false);

  const totalScans = invoice?.scans.length ?? 0;
  const isLastScan = totalScans === 1;

  const handleDelete = useCallback(async () => {
    if (!invoice || !scan) return;

    if (isLastScan) {
      toast.error("Cannot delete last scan", {
        description: "An invoice must have at least one scan attached",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteInvoiceScan({
        invoiceId: invoice.id,
        scanLocation: scan.location,
      });

      toast.success("Scan removed successfully", {
        description: "The scan has been removed from the invoice",
      });

      close();

      // Refresh the page to reflect the change
      router.refresh();
    } catch (error) {
      console.error("Error deleting scan:", error);
      toast.error("Failed to remove scan", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [invoice, scan, isLastScan, close, router]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <TbAlertTriangle className='text-destructive h-5 w-5' />
            Remove Scan
          </DialogTitle>
          <DialogDescription>
            {isLastScan
              ? "This is the only scan attached to this invoice. You cannot remove it."
              : `Are you sure you want to remove scan ${scanIndex + 1} of ${totalScans}?`}
          </DialogDescription>
        </DialogHeader>

        {scan && (
          <div className='py-4'>
            <div className='bg-muted overflow-hidden rounded-md border'>
              <Image
                src={scan.location}
                alt={`Scan ${scanIndex + 1}`}
                width={400}
                height={300}
                className='h-48 w-full object-cover'
              />
            </div>
            <p className='text-muted-foreground mt-2 text-center text-xs'>Scan {scanIndex + 1}</p>
          </div>
        )}

        {isLastScan && (
          <div className='bg-destructive/10 text-destructive rounded-md p-3'>
            <p className='text-sm font-medium'>Cannot remove last scan</p>
            <p className='text-xs'>Every invoice must have at least one scan attached. Add another scan before removing this one.</p>
          </div>
        )}

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={close}
            disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={handleDelete}
            disabled={isDeleting || isLastScan}>
            {isDeleting ? (
              <>
                <TbLoader2 className='mr-2 h-4 w-4 animate-spin' />
                Removing...
              </>
            ) : (
              <>
                <TbTrash className='mr-2 h-4 w-4' />
                Remove Scan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
