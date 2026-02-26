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
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbCopy, TbDownload, TbMail} from "react-icons/tb";
import styles from "./ShareAnalyticsDialog.module.scss";

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
  const t = useTranslations("Domains.services.invoices.ui.shareAnalyticsDialog");
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

    toast(t("toasts.imageCopied.title"), {
      description: t("toasts.imageCopied.description"),
    });
  }, [merchant, invoice, t]);

  const handleSendEmail = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      toast(t("toasts.emailSent.title"), {
        description: t("toasts.emailSent.description", {email}),
      });
      setEmail("");
    },
    [email, t],
  );

  const handleDownloadImage = useCallback(() => {
    // In a real app, this would generate and download an image
    toast(t("toasts.imageSaved.title"), {
      description: t("toasts.imageSaved.description", {merchant: merchant.name}),
    });
  }, [merchant.name, t]);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", {merchant: merchant.name})}</DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue='image'
          className='mt-4'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='image'>{t("tabs.image")}</TabsTrigger>
            <TabsTrigger value='email'>{t("tabs.email")}</TabsTrigger>
          </TabsList>

          <TabsContent
            value='image'
            className='py-4'>
            <div className={styles["contentSection"]}>
              <p className={styles["description"]}>{t("image.description")}</p>
              <div className={styles["previewContainer"]}>
                <div className={styles["previewBox"]}>
                  <div className={styles["previewPlaceholder"]}>{t("image.previewPlaceholder")}</div>
                </div>
              </div>
            </div>
            <DialogFooter className='mt-4'>
              <div className={styles["footerButtons"]}>
                <Button
                  onClick={handleDownloadImage}
                  className='w-full'>
                  <TbDownload className='mr-2 h-4 w-4' />
                  {t("image.download")}
                </Button>
                <Button
                  variant='outline'
                  onClick={handleCopyImage}
                  className='w-full'>
                  <TbCopy className='mr-2 h-4 w-4' />
                  {t("image.copyToClipboard")}
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>

          <TabsContent
            value='email'
            className='py-4'>
            <div className={styles["contentSection"]}>
              <p className={styles["description"]}>{t("email.description")}</p>
              <div className={styles["emailSection"]}>
                <Label htmlFor='email'>{t("email.label")}</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder={t("email.placeholder")}
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
                {t("email.send")}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
