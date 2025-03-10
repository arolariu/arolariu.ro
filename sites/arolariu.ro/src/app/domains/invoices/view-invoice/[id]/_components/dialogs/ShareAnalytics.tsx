/** @format */

"use client";

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
import {Check, Copy, Download, Image, Mail} from "lucide-react";
import {useState} from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantName: string;
  currency: string;
};

export function ShareAnalyticsDialog({open, onOpenChange, merchantName, currency}: Readonly<Props>) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const shareUrl = `https://invoice-app.com/analytics/${merchantName.toLowerCase().replace(/\s+/g, "-")}`;

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
      description: `Spending analytics for ${merchantName} has been downloaded as PNG`,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Share Analytics</DialogTitle>
          <DialogDescription>
            Share spending analytics for {merchantName} in {currency}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue='image'
          className='w-full'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='image'>
              <Image className='mr-2 h-4 w-4' />
              Image
            </TabsTrigger>
            <TabsTrigger value='link'>
              <Copy className='mr-2 h-4 w-4' />
              Link
            </TabsTrigger>
            <TabsTrigger value='email'>
              <Mail className='mr-2 h-4 w-4' />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='image'
            className='mt-4 space-y-4'>
            <div className='bg-muted/50 rounded-md border p-4'>
              <div className='bg-card flex aspect-video items-center justify-center rounded-md'>
                <img
                  src={`/placeholder.svg?height=200&width=400&text=Analytics+Preview+for+${merchantName}`}
                  alt='Analytics Preview'
                  className='max-h-full max-w-full'
                />
              </div>
            </div>
            <p className='text-muted-foreground text-sm'>Download a PNG image of the current analytics view.</p>
            <Button
              onClick={handleDownloadImage}
              className='w-full'>
              <Download className='mr-2 h-4 w-4' />
              Download PNG
            </Button>
          </TabsContent>

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
                {copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
              </Button>
            </div>
            <p className='text-muted-foreground text-sm'>Anyone with this link will be able to view these analytics.</p>
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
                <Mail className='mr-2 h-4 w-4' />
                Send Analytics Report
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <DialogFooter className='mt-4'>
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
