/** @format */

"use client";

import type {Invoice, Merchant} from "@/types/invoices";
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
  toast,
} from "@arolariu/components";
import {useCallback, useState} from "react";
import {TbCopy, TbDownload, TbMail} from "react-icons/tb";
import {useDialog} from "../../_contexts/DialogContext";

/**
 * The ShareAnalyticsDialog component allows users to share their spending analytics.
 * It includes options to download an image, copy it to the clipboard, or send it via email.
 * @returns The ShareAnalyticsDialog component, CSR'ed.
 */
export default function ShareAnalyticsDialog(): React.JSX.Element {
  const [email, setEmail] = useState<string>("");
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("shareAnalytics");

  const {invoice, merchant} = payload as {invoice: Invoice; merchant: Merchant};

  const handleCopyImage = useCallback(async () => {
    // Get the image URL from the component
    const imageUrl = `/placeholder.svg?height=200&width=400&text=Analytics+Preview+for+${merchant.name}/${invoice.id}`;

    // Fetch the image data
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Create a clipboard item with the image blob
    const item = new ClipboardItem({[blob.type]: blob});
    await navigator.clipboard.write([item]);

    toast("Image copied!", {
      description: "The analytics image has been copied to your clipboard",
    });
  }, [merchant, invoice]);

  const handleSendEmail = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      toast("Email sent!", {
        description: `Analytics report sent to ${email}`,
      });
      setEmail("");
    },
    [email],
  );

  const handleDownloadImage = useCallback(() => {
    // In a real app, this would generate and download an image
    toast("Image saved!", {
      description: `Spending analytics for ${merchant.name} has been downloaded as PNG`,
    });
  }, [merchant.name]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Share Analytics</DialogTitle>
          <DialogDescription>Share your spending analytics for {merchant.name} with others.</DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue='image'
          className='mt-4'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='image'>Image</TabsTrigger>
            <TabsTrigger value='email'>Email</TabsTrigger>
          </TabsList>

          <TabsContent
            value='image'
            className='py-4'>
            <div className='space-y-4'>
              <p className='text-muted-foreground text-sm'>
                Download or copy the analytics graph as a PNG image that you can share or save.
              </p>
              <div className='flex justify-center'>
                <div className='w-full max-w-xs rounded-md border p-4'>
                  <div className='bg-muted flex h-32 items-center justify-center rounded-md'>Analytics Preview</div>
                </div>
              </div>
            </div>
            <DialogFooter className='mt-4'>
              <div className='flex w-full flex-col gap-2'>
                <Button
                  onClick={handleDownloadImage}
                  className='w-full'>
                  <TbDownload className='mr-2 h-4 w-4' />
                  Download graph
                </Button>
                <Button
                  variant='outline'
                  onClick={handleCopyImage}
                  className='w-full'>
                  <TbCopy className='mr-2 h-4 w-4' />
                  Copy graph to clipboard
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>

          <TabsContent
            value='email'
            className='py-4'>
            <div className='space-y-4'>
              <p className='text-muted-foreground text-sm'>Send the analytics to an email address.</p>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email address</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='name@example.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className='mt-4'>
              <Button
                onClick={handleSendEmail}
                className='w-full'>
                <TbMail className='mr-2 h-4 w-4' />
                Send Email
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
