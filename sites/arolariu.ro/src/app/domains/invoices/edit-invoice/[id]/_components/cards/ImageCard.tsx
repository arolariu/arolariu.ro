"use client";

import type {Invoice} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import Image from "next/image";
import {useCallback, useState} from "react";
import {TbChevronLeft, TbChevronRight, TbPlus, TbTrash, TbZoomIn} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";

type Props = {invoice: Invoice};

/**
 * Displays receipt images with navigation, zoom, and add/remove capabilities.
 *
 * @remarks
 * **Rendering Context**: Client Component (uses hooks for state and dialogs).
 *
 * **Features**:
 * - **Image Gallery**: Navigate between all scans attached to the invoice
 * - **Expand Dialog**: Click image or button to view full-size
 * - **Add Scan**: Opens dialog to upload and attach new scans
 * - **Remove Scan**: Opens confirmation dialog to remove current scan
 * - **Fallback**: Uses placeholder image if no scans are available
 *
 * **Navigation**: Previous/Next buttons appear only when multiple scans exist.
 * Current position indicator shows scan index (e.g., "2/3").
 *
 * @param props - Component properties containing the invoice with scan data
 * @returns Client-rendered card with receipt image gallery and controls
 *
 * @example
 * ```tsx
 * <ImageCard invoice={invoice} />
 * // Displays receipt gallery with navigation and add/remove buttons
 * ```
 *
 * @see {@link AddScanDialog} - Dialog for adding new scans
 * @see {@link RemoveScanDialog} - Dialog for removing scans
 */
export default function ImageCard({invoice}: Readonly<Props>): React.JSX.Element {
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const scans = invoice.scans || [];
  const totalScans = scans.length;
  const currentScan = scans[currentScanIndex];
  const currentScanSrc = currentScan?.location || "https://dummyimage.com/600x900&text=placeholder+image";

  // Dialog hooks - using consolidated EDIT_INVOICE__SCAN with mode differentiation
  const {open: openAddScan} = useDialog("EDIT_INVOICE__SCAN", "add", invoice);
  const {open: openRemoveScan} = useDialog("EDIT_INVOICE__SCAN", "delete", {
    invoice,
    scan: currentScan!,
    scanIndex: currentScanIndex,
  });

  const handleNextScan = useCallback(() => {
    if (currentScanIndex < totalScans - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentScanIndex((prev) => prev + 1);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentScanIndex, totalScans]);

  const handlePreviousScan = useCallback(() => {
    if (currentScanIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentScanIndex((prev) => prev - 1);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentScanIndex]);

  return (
    <TooltipProvider>
      <Card className='group overflow-hidden transition-shadow duration-300 hover:shadow-md'>
        <CardHeader className='flex flex-row items-center justify-between'>
          <CardTitle className='text-lg'>Receipt Scan {totalScans > 1 ? `(${currentScanIndex + 1}/${totalScans})` : ""}</CardTitle>
        </CardHeader>
        <CardContent className='flex justify-center'>
          <Dialog
            open={isZoomOpen}
            onOpenChange={setIsZoomOpen}>
            <button
              type='button'
              className='group/image relative w-full cursor-pointer overflow-hidden rounded-md border'
              onClick={() => setIsZoomOpen(true)}
              aria-label='Click to expand image'>
              <Image
                src={currentScanSrc}
                alt={`Receipt scan ${currentScanIndex + 1}`}
                width={400}
                height={600}
                className={`w-full object-cover transition-all duration-200 group-hover/image:scale-105 ${
                  isTransitioning ? "opacity-50 blur-sm" : "blur-0 opacity-100"
                }`}
              />
              <div className='bg-background/80 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/image:opacity-100'>
                <TbZoomIn className='h-8 w-8' />
              </div>
            </button>
            <DialogContent className='max-w-3xl'>
              <DialogHeader>
                <DialogTitle>Receipt Image {totalScans > 1 ? `(${currentScanIndex + 1}/${totalScans})` : ""}</DialogTitle>
              </DialogHeader>
              <div className='relative flex max-h-[80vh] justify-center overflow-auto'>
                <Image
                  src={currentScanSrc}
                  alt={`Receipt scan ${currentScanIndex + 1} - full size`}
                  width={800}
                  height={1200}
                  className='w-full object-contain'
                />
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
        <CardFooter className='flex flex-col gap-2'>
          {/* Expand button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                className='w-full cursor-pointer'
                onClick={() => setIsZoomOpen(true)}>
                <TbZoomIn className='mr-2 h-4 w-4' />
                Expand Image
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View the receipt image in full size</p>
            </TooltipContent>
          </Tooltip>

          {/* Navigation buttons */}
          {totalScans > 1 && (
            <div className='flex w-full gap-2'>
              {currentScanIndex > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='secondary'
                      className='flex-1 cursor-pointer'
                      onClick={handlePreviousScan}>
                      <TbChevronLeft className='mr-1 h-4 w-4' />
                      Previous
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View the previous receipt scan</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {currentScanIndex < totalScans - 1 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='secondary'
                      className='flex-1 cursor-pointer'
                      onClick={handleNextScan}>
                      Next
                      <TbChevronRight className='ml-1 h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View the next receipt scan</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Add/Remove buttons */}
          <div className='flex w-full gap-2'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  className='flex-1 cursor-pointer'
                  onClick={openAddScan}>
                  <TbPlus className='mr-1 h-4 w-4' />
                  Add Scan
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload and attach a new receipt scan</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  className='text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1 cursor-pointer'
                  onClick={openRemoveScan}
                  disabled={totalScans === 0}>
                  <TbTrash className='mr-1 h-4 w-4' />
                  Remove
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove the current receipt scan</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
