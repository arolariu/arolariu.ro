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
} from "@arolariu/components";
import Image from "next/image";
import {useState} from "react";
import {TbZoomIn} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";

export function ReceiptImageCard(): React.JSX.Element | null {
  const {invoice} = useInvoiceContext();
  const [isOpen, setIsOpen] = useState(false);
  const receiptImage = invoice.scans[0]?.location;

  if (!receiptImage) return null;

  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <CardTitle className='text-lg'>Receipt Image</CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog
          open={isOpen}
          onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <div className='group cursor-pointer overflow-hidden rounded-lg border'>
              <Image
                src={receiptImage || "/placeholder.svg"}
                alt='Receipt scan'
                width={400}
                height={600}
                className='w-full object-cover transition-transform duration-300 group-hover:scale-105'
              />
            </div>
          </DialogTrigger>
          <DialogContent className='max-w-3xl'>
            <DialogHeader>
              <DialogTitle>Receipt Image</DialogTitle>
            </DialogHeader>
            <div className='relative max-h-[80vh] overflow-auto'>
              <Image
                src={receiptImage || "/placeholder.svg"}
                alt='Receipt scan - full size'
                width={800}
                height={1200}
                className='w-full object-contain'
              />
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
      <CardFooter>
        <Button
          variant='outline'
          className='w-full bg-transparent'
          onClick={() => setIsOpen(true)}>
          <TbZoomIn className='mr-2 h-4 w-4' />
          Expand Image
        </Button>
      </CardFooter>
    </Card>
  );
}
