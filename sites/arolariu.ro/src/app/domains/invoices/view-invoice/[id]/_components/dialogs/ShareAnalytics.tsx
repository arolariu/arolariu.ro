/** @format */

"use client";

import {Invoice, Merchant} from "@/types/invoices";
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
import {Copy, Download, Mail} from "lucide-react";
import {useState} from "react";
import {useDialog} from "../../_contexts/DialogContext";

type Props = {
  invoice: Invoice;
  merchant: Merchant;
};

export function ShareAnalyticsDialog({invoice, merchant}: Readonly<Props>) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const {isOpen, open, close} = useDialog("shareAnalytics");

  const shareUrl = `https://invoice-app.com/analytics/${merchant.name.toLowerCase().replace(/\s+/g, "-")}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast("Link copied!", {
        description: "The analytics link has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast("Failed to copy link!", {
        description: "Could not copy the link to clipboard",
      });
    }
  };

  const handleCopyImage = async () => {
    try {
      // Get the image URL from the component
      const imageUrl = `/placeholder.svg?height=200&width=400&text=Analytics+Preview+for+${merchant.name}`;

      // Fetch the image data
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Check if clipboard API is supported
      if (!navigator.clipboard || !navigator.clipboard.write) {
        throw new Error("Clipboard API not supported in this browser");
      }

      // Create a clipboard item with the image blob
      const item = new ClipboardItem({[blob.type]: blob});

      // Write the image to clipboard
      await navigator.clipboard.write([item]);

      toast("Image copied!", {
        description: "The analytics image has been copied to your clipboard",
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
      description: `Analytics report sent to ${email}`,
    });
    setEmail("");
  };

  const handleDownloadImage = () => {
    // In a real app, this would generate and download an image
    toast("Image saved!", {
      description: `Spending analytics for ${merchant.name} has been downloaded as PNG`,
    });
  };

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
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='image'>Image</TabsTrigger>
            <TabsTrigger value='link'>Link</TabsTrigger>
            <TabsTrigger value='email'>Email</TabsTrigger>
          </TabsList>

          <TabsContent
            value='image'
            className='py-4'>
            <div className='space-y-4'>
              <p className='text-muted-foreground text-sm'>Download the analytics as a PNG image that you can share or save.</p>
              <div className='flex justify-center'>
                <div className='w-full max-w-xs rounded-md border p-4'>
                  <div className='bg-muted flex h-32 items-center justify-center rounded-md'>Analytics Preview</div>
                </div>
              </div>
            </div>
            <DialogFooter className='mt-4'>
              <Button
                onClick={handleDownloadImage}
                className='w-full'>
                <Download className='mr-2 h-4 w-4' />
                Download PNG
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent
            value='link'
            className='py-4'>
            <div className='space-y-4'>
              <p className='text-muted-foreground text-sm'>Share a link that others can use to view these analytics.</p>
              <div className='flex space-x-2'>
                <Input
                  value={shareUrl}
                  readOnly
                  className='flex-1'
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant='outline'
                  size='icon'
                  onClick={handleCopyLink}>
                  <Copy className='h-4 w-4' />
                </Button>
              </div>
            </div>
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
                <Mail className='mr-2 h-4 w-4' />
                Send Email
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
