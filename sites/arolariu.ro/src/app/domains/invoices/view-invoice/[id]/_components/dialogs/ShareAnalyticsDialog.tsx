"use client";

import {useDialog} from "@/app/domains/invoices/_contexts/DialogContext";
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

/**
 * Dialog for sharing spending analytics via image download, clipboard, or email.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Sharing Methods** (tabbed interface):
 * - **Image Tab**:
 *   - Download analytics as PNG image
 *   - Copy image to clipboard for pasting elsewhere
 * - **Email Tab**:
 *   - Send analytics report to specified email address
 *   - Form with email input and send button
 *
 * **Clipboard Integration**: Uses `navigator.clipboard.write()` with
 * `ClipboardItem` for image blob copying. Fetches placeholder image
 * and converts to blob for clipboard API.
 *
 * **Toast Notifications**: Provides feedback for all sharing actions
 * (copy success, email sent, image downloaded).
 *
 * **Dialog Integration**: Uses `useDialog` hook with `shareAnalytics` type.
 * Payload contains `{invoice, merchant}` for generating analytics context.
 *
 * **Placeholder Implementation**: Current image/download functions use
 * placeholder URLs. TODO: Implement actual chart-to-image rendering.
 *
 * @returns Client-rendered dialog with tabbed sharing options
 *
 * @example
 * ```tsx
 * // Opened via AnalyticsCard "Share" button:
 * const {open} = useDialog("shareAnalytics", "add", {invoice, merchant});
 * <Button onClick={open}>Share</Button>
 * ```
 *
 * @see {@link AnalyticsCard} - Parent component that opens this dialog
 * @see {@link useDialog} - Dialog state management hook
 */
export default function ShareAnalyticsDialog(): React.JSX.Element {
  const [email, setEmail] = useState<string>("");
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("VIEW_INVOICE__SHARE_ANALYTICS");

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
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
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
                  // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
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
