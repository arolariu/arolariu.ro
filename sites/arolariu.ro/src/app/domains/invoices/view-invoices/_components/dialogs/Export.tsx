/** @format */

"use client";

import type {Invoice} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";
import {motion} from "framer-motion";
import {Check, Copy, LinkIcon, Mail, QrCode} from "lucide-react";
import {useState} from "react";
import QRCode from "react-qr-code";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: Invoice;
};

/**
 * The ExportDialog component allows users to share an invoice via link, email, or QR code.
 * It includes options to copy the link and QR code to the clipboard.
 * @returns The ExportDialog component, CSR'ed.
 */
export function ExportDialog({open, onOpenChange, invoice}: Readonly<Props>) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const shareUrl = invoice ? `https://invoices.example.com/share/${invoice.id}` : "https://invoices.example.com/share/example";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailShare = () => {
    // In a real app, this would send the email via an API
    console.log(`Sharing invoice ${invoice?.id} with ${email}`);
    // Show success message or handle errors
    setEmail("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Share Invoice</DialogTitle>
          <DialogDescription>{invoice ? `Share "${invoice.name}" with others` : "Share this invoice with others"}</DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue='link'
          className='w-full'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger
              value='link'
              className='flex items-center gap-1'>
              <LinkIcon className='h-4 w-4' />
              <span>Link</span>
            </TabsTrigger>
            <TabsTrigger
              value='email'
              className='flex items-center gap-1'>
              <Mail className='h-4 w-4' />
              <span>Email</span>
            </TabsTrigger>
            <TabsTrigger
              value='qr'
              className='flex items-center gap-1'>
              <QrCode className='h-4 w-4' />
              <span>QR Code</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='link'
            className='mt-4 space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='share-link'>Share Link</Label>
              <div className='flex space-x-2'>
                <Input
                  id='share-link'
                  value={shareUrl}
                  readOnly
                  className='flex-1'
                />
                <Button
                  size='icon'
                  onClick={handleCopyLink}
                  variant={copied ? "default" : "outline"}>
                  {copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
                </Button>
              </div>
            </div>
            {copied && (
              <motion.p
                initial={{opacity: 0, y: 5}}
                animate={{opacity: 1, y: 0}}
                className='text-sm text-green-600'>
                Link copied to clipboard!
              </motion.p>
            )}
          </TabsContent>

          <TabsContent
            value='email'
            className='mt-4 space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email Address</Label>
              <Input
                id='email'
                type='email'
                placeholder="Enter recipient's email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={handleEmailShare}
              disabled={!email || !/\S+@\S+\.\S+/.test(email)}
              className='w-full'>
              <Mail className='mr-2 h-4 w-4' />
              Send Email
            </Button>
          </TabsContent>

          <TabsContent
            value='qr'
            className='mt-4'>
            <div className='flex flex-col items-center justify-center space-y-4'>
              <div className='rounded-lg bg-white p-4'>
                <QRCode
                  value={shareUrl}
                  size={200}
                />
              </div>
              <p className='text-muted-foreground text-center text-sm'>Scan this QR code to view the invoice</p>
              <Button
                onClick={handleCopyLink}
                variant='outline'
                size='sm'>
                {copied ? <Check className='mr-2 h-4 w-4' /> : <Copy className='mr-2 h-4 w-4' />}
                Copy Link
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
