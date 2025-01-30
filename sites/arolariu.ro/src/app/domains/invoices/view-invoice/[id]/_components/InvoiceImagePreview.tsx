/** @format */

"use client";

import type {Invoice} from "@/types/invoices";
import Image from "next/image";
import Link from "next/link";
import {useCallback, useState} from "react";
import {Button, Dialog, DialogTrigger, Heading, Modal} from "react-aria-components";

export const InvoiceImagePreview = ({invoice}: Readonly<{invoice: Invoice}>) => {
  const isPdfExtension = invoice.photoLocation.endsWith(".pdf");
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [zoomStyle, setZoomStyle] = useState({
    transform: "scale(1)",
    transformOrigin: "0 0",
  });

  const previewText = isPdfExtension ? "Preview uploaded receipt PDF" : "Preview uploaded receipt photo";

  const handleMouseMove = useCallback(
    (event: Readonly<React.MouseEvent<HTMLImageElement>>) => {
      if (isFrozen) return;

      const containerRect = event.currentTarget.getBoundingClientRect();
      const cursorX = event.clientX - containerRect.left;
      const cursorY = event.clientY - containerRect.top;

      // Calculate normalized cursor position within the image
      const normalizedX = cursorX / containerRect.width;
      const normalizedY = cursorY / containerRect.height;

      // Apply bounds to avoid extreme zoom near edges
      const boundNormalizedX = Math.min(Math.max(normalizedX, 0.05), 0.95);
      const boundNormalizedY = Math.min(Math.max(normalizedY, 0.05), 0.95);

      // Calculate new transform origin based on bounds
      const newTransformOrigin = `${(boundNormalizedX * 100).toString()}% ${(boundNormalizedY * 100).toString()}%`;

      setZoomStyle({
        transform: "scale(2)",
        transformOrigin: newTransformOrigin,
      });
    },
    [isFrozen],
  );

  const handleMouseLeave = useCallback(
    (event: Readonly<React.MouseEvent<HTMLImageElement>>) => {
      if (!isFrozen) {
        const containerRect = event.currentTarget.getBoundingClientRect();
        const cursorX = event.clientX - containerRect.left;
        const cursorY = event.clientY - containerRect.top;

        // Calculate normalized cursor position within the image
        const normalizedX = cursorX / containerRect.width;
        const normalizedY = cursorY / containerRect.height;

        // Apply bounds to avoid extreme zoom near edges
        const boundNormalizedX = Math.min(Math.max(normalizedX, 0.05), 0.95);
        const boundNormalizedY = Math.min(Math.max(normalizedY, 0.05), 0.95);

        // Calculate new transform origin based on bounds
        const newTransformOrigin = `${(boundNormalizedX * 100).toString()}% ${(boundNormalizedY * 100).toString()}%`;

        setZoomStyle({
          transform: "scale(1)",
          transformOrigin: newTransformOrigin,
        });
      }
    },
    [isFrozen],
  );

  return (
    <DialogTrigger>
      <Button
        type='button'
        className='mx-auto'>
        {Boolean(isPdfExtension) && (
          <Link
            href={invoice.photoLocation}
            target='_blank'>
            {previewText}
          </Link>
        )}
        {!isPdfExtension && previewText}
      </Button>
      {!isPdfExtension && (
        <Modal className='flex h-3/4 w-3/4 flex-col items-center justify-center justify-items-center'>
          <Dialog>
            <Heading>Invoice Preview: {invoice.id}</Heading>
            <Image
              alt='Invoice photo'
              style={{
                transition: "transform 0.3s ease, transform-origin 0s",
                ...zoomStyle,
              }}
              src={invoice.photoLocation}
              width={800}
              height={600}
              className='z-10 h-full w-full rounded-2xl object-contain'
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={() => setIsFrozen(!isFrozen)}
            />
            <Button
              slot='close'
              type='submit'
              className='btn btn-secondary'>
              Close preview.
            </Button>
          </Dialog>
        </Modal>
      )}
    </DialogTrigger>
  );
};
