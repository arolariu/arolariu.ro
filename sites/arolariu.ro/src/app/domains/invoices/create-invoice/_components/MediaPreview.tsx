/** @format */

import {Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@arolariu/components";
import Image from "next/image";
import {memo, useEffect, useState} from "react";
import {TbArrowAutofitHeight, TbRotateClockwise, TbTrash} from "react-icons/tb";
import type {InvoiceScan} from "../_types/InvoiceScan";
import {getScanUrl, isPDF} from "../_utils/invoiceScanUtils";

type Props = {
  scan: InvoiceScan;
  index: number;
  onRotate?: (index: number) => void;
  onDelete: (index: number) => void;
};

/**
 * Component to render a media preview for an invoice scan.
 * It handles both PDF and image scans, displaying them appropriately.
 * @param scan - The invoice scan to preview.
 * @param index - The index of the scan in the list.
 * @param onRotate - Optional callback to rotate the scan.
 * @param onDelete - Callback to delete the scan.
 * @returns The JSX for the media preview.
 */
export const MediaPreview = memo(function MediaPreview({scan, index, onRotate, onDelete}: Readonly<Props>) {
  const isPdfFile = isPDF(scan);
  const [url, setUrl] = useState<string>("");
  const [loadError, setLoadError] = useState<boolean>(false);

  useEffect(() => {
    // Reset state when scan changes
    setLoadError(false);

    // Get URL for the scan
    const scanUrl = getScanUrl(scan);
    setUrl(scanUrl);
  }, [scan]);

  const renderContent = () => {
    if (isPdfFile) {
      return (
        <>
          <div className='bg-primary absolute top-0 left-0 z-10 rounded-br-lg px-2 py-1 text-xs text-white'>PDF</div>
          {url ? (
            <iframe
              src={`${url}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
              className='h-full w-full rounded-lg'
              style={{border: "none", overflow: "hidden"}}
              title={`PDF Document ${index + 1}`}
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center bg-gray-50'>
              <div className='border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent' />
            </div>
          )}
        </>
      );
    }

    if (!url || loadError) {
      return (
        <div className='flex h-full w-full items-center justify-center bg-gray-50'>
          {loadError ? (
            <div className='text-muted-foreground text-center'>
              <div>Failed to load image</div>
            </div>
          ) : (
            <div className='border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent' />
          )}
        </div>
      );
    }

    return (
      <Image
        className='h-full w-full rounded-lg object-contain object-center transition-all'
        src={url}
        width={300}
        height={300}
        unoptimized
        priority={index < 4}
        onError={() => setLoadError(true)}
        alt={`Invoice scan ${index + 1} - ${scan.name}`}
      />
    );
  };

  return (
    <div className='relative h-full w-full overflow-hidden'>
      {renderContent()}
      <div className='bg-opacity-50 absolute right-2 bottom-2 flex gap-2 rounded-lg bg-black p-2'>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size='icon'
              variant='secondary'>
              <TbArrowAutofitHeight
                className='h-4 w-4'
                aria-hidden='true'
              />
              <span className='sr-only'>View full screen</span>
            </Button>
          </DialogTrigger>
          <DialogContent className='h-[80vh] w-[80vw] max-w-full'>
            <DialogHeader>
              <DialogTitle className='text-lg font-semibold'>
                {isPdfFile ? `PDF Document - ${scan.name}` : `Image ${index + 1} - ${scan.name}`}
              </DialogTitle>
            </DialogHeader>
            {isPdfFile ? (
              <iframe
                src={url}
                className='h-full w-full'
                title={`PDF Document ${index + 1} - ${scan.name}`}
              />
            ) : (
              <div className='relative h-full w-full overflow-hidden'>
                <Image
                  src={url}
                  alt={`Enlarged scan ${index + 1} - ${scan.name}`}
                  fill
                  className='object-contain'
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
        {!isPdfFile && onRotate && (
          <Button
            size='icon'
            variant='secondary'
            onClick={() => onRotate(index)}>
            <TbRotateClockwise
              className='h-4 w-4'
              aria-hidden='true'
            />
            <span className='sr-only'>Rotate image</span>
          </Button>
        )}
        <Button
          size='icon'
          variant='destructive'
          onClick={() => onDelete(index)}>
          <TbTrash
            className='h-4 w-4'
            aria-hidden='true'
          />
          <span className='sr-only'>Delete {isPdfFile ? "PDF" : "image"}</span>
        </Button>
      </div>
    </div>
  );
});
