/** @format */

import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Invoice from "@/types/invoices/Invoice";
import Image from "next/image";
import {useState} from "react";

export const InvoiceImagePreview = ({invoice}: Readonly<{invoice: Invoice}>) => {
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [zoomStyle, setZoomStyle] = useState({
    transform: "scale(1)",
    transformOrigin: "0 0",
  });

  const handleMouseMove = (event: Readonly<React.MouseEvent<HTMLImageElement>>) => {
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
  };

  const handleMouseLeave = (event: Readonly<React.MouseEvent<HTMLImageElement>>) => {
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
  };

  return (
    <Dialog>
      <DialogTrigger
        asChild
        className='flex flex-row items-center justify-center justify-items-center'>
        <Button
          type='button'
          className='mx-auto'>
          Preview uploaded receipt photo
        </Button>
      </DialogTrigger>
      <DialogContent className='flex h-3/4 w-3/4 flex-col items-center justify-center justify-items-center'>
        <DialogHeader>
          <DialogTitle>Invoice Preview: {invoice.id}</DialogTitle>
        </DialogHeader>
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
        <DialogFooter>
          <DialogClose asChild>
            <Button type='submit'>Close preview.</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
