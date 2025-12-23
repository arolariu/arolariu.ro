"use client";

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
  DialogTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import Image from "next/image";
import {useState} from "react";
import {TbZoomIn} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";

export function ReceiptScanCard(): React.JSX.Element {
  const {invoice} = useInvoiceContext();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const scans = invoice.scans || [];
  const totalScans = scans.length;
  const currentScan = scans[currentScanIndex];
  const currentScanSrc = currentScan?.location || "/placeholder.svg";

  const handleNextScan = () => {
    if (currentScanIndex < totalScans - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentScanIndex((prev) => prev + 1);
        setIsTransitioning(false);
      }, 200);
    }
  };

  const handlePreviousScan = () => {
    if (currentScanIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentScanIndex((prev) => prev - 1);
        setIsTransitioning(false);
      }, 200);
    }
  };

  return (
    <TooltipProvider>
      <Card className='transition-shadow duration-300 hover:shadow-md'>
        <CardHeader>
          <CardTitle className='text-lg'>Receipt Scan {totalScans > 1 ? `(${currentScanIndex + 1}/${totalScans})` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog
            open={isOpen}
            onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <div className='group cursor-pointer overflow-hidden rounded-lg border'>
                <Image
                  src={currentScanSrc}
                  alt={`Receipt scan ${currentScanIndex + 1}`}
                  width={400}
                  height={600}
                  className={`w-full object-cover transition-all duration-200 group-hover:scale-105 ${
                    isTransitioning ? "opacity-50 blur-sm" : "blur-0 opacity-100"
                  }`}
                />
              </div>
            </DialogTrigger>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                className='w-full bg-transparent'
                onClick={() => setIsOpen(true)}>
                <TbZoomIn className='mr-2 h-4 w-4' />
                Expand Image
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View the receipt image in full size</p>
            </TooltipContent>
          </Tooltip>
          {totalScans > 1 && (
            <div className='flex w-full gap-2'>
              {currentScanIndex > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='secondary'
                      className='flex-1'
                      onClick={handlePreviousScan}>
                      Previous Scan
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
                      className='flex-1'
                      onClick={handleNextScan}>
                      Next Scan
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View the next receipt scan</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
