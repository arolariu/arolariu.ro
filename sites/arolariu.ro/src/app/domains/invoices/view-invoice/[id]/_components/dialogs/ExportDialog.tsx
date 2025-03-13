/** @format */

"use client";

import type {Invoice} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@arolariu/components";
import {useState} from "react";
import {TbCheck, TbCopy, TbMail, TbQrcode} from "react-icons/tb";
import QRCode from "react-qr-code";
import {useDialog} from "../../_contexts/DialogContext";

type Props = {
  invoice: Invoice;
};

/**
 * The ExportDialog component allows users to share an invoice via link, email, or QR code.
 * It includes options to copy the link and QR code to the clipboard.
 * @returns The ExportDialog component, CSR'ed.
 */
export function ExportDialog({invoice}: Readonly<Props>) {
  const [copied, setCopied] = useState<boolean>(false);
  const {isOpen, open, close} = useDialog("share");
  const [email, setEmail] = useState<string>("");

  const shareUrl = `https://invoice-app.com/invoice/${invoice.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast("Link copied!", {
        description: "The invoice link has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast("Failed to copy link!", {
        description: "Could not copy the link to clipboard",
      });
    }
  };

  const handleCopyQRCode = async () => {
    try {
      const qrCodeElement = document.getElementById("invoice-qr-code");

      if (!qrCodeElement) {
        throw new Error("QR code element not found");
      }

      // Create a canvas to draw the QR code
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;

      // Get canvas context
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not create canvas context");
      }

      // Convert SVG to image
      const img = new Image();
      const svgData = new XMLSerializer().serializeToString(qrCodeElement);
      const svgBlob = new Blob([svgData], {type: "image/svg+xml;charset=utf-8"});
      const url = URL.createObjectURL(svgBlob);

      // Wait for the image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png");
      });

      // Create clipboard item with image blob
      const item = new ClipboardItem({[blob.type]: blob});

      // Write image to clipboard
      await navigator.clipboard.write([item]);

      toast("QR Code copied!", {
        description: "The QR code has been copied to your clipboard",
      });
    } catch (err) {
      console.error("Failed to copy image:", err);
      toast("Failed to copy image!", {
        description: "Could not copy the image to clipboard. This feature might not be supported in your browser.",
      });
    }
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Email sent!", {
      description: `Invitation sent to ${email}`,
    });
    setEmail("");
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Share Invoice</DialogTitle>
          <DialogDescription>Share "{invoice.name}" with others</DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue='link'
          className='w-full'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='link'>
              <TbCopy className='mr-2 h-4 w-4' />
              Link
            </TabsTrigger>
            <TabsTrigger value='email'>
              <TbMail className='mr-2 h-4 w-4' />
              Email
            </TabsTrigger>
            <TabsTrigger value='qr'>
              <TbQrcode className='mr-2 h-4 w-4' />
              QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='link'
            className='mt-4 space-y-4'>
            <div className='flex items-center space-x-2'>
              <Input
                value={shareUrl}
                readOnly
                className='flex-1'
              />
              <Button
                size='icon'
                onClick={handleCopyLink}
                variant='outline'>
                {copied ? <TbCheck className='h-4 w-4' /> : <TbCopy className='h-4 w-4' />}
              </Button>
            </div>
            <p className='text-muted-foreground text-sm'>Anyone with this link will be able to view this invoice.</p>
          </TabsContent>

          <TabsContent
            value='email'
            className='mt-4'>
            <form
              onSubmit={handleSendEmail}
              className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email address</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder="Enter recipient's email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type='submit'
                className='w-full'>
                <TbMail className='mr-2 h-4 w-4' />
                Send Invitation
              </Button>
            </form>
          </TabsContent>
          <TabsContent
            value='qr'
            className='mt-4'>
            <div className='flex flex-col items-center justify-center space-y-4'>
              <div className='rounded-md border bg-white p-4'>
                <QRCode
                  id='invoice-qr-code'
                  value={shareUrl}
                  size={128}
                  style={{width: "128px"}}
                  viewBox={`0 0 128 128`}
                  className='rounded-md'
                  bgColor='#ffffff'
                  fgColor='#000000'
                  level='L'
                />
              </div>
              <p className='text-muted-foreground text-center text-sm'>Scan this QR code to view the invoice on a mobile device.</p>
              <Button
                variant='outline'
                onClick={handleCopyQRCode}
                className='w-full'>
                <TbCopy className='mr-2 h-4 w-4' />
                Copy QR Code
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
