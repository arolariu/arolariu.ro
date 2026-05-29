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
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import {TbCopy, TbDownload, TbMail} from "react-icons/tb";
import styles from "./ShareAnalyticsDialog.module.scss";

/**
 * Dialog for sharing spending analytics via image download, clipboard, or emails.
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
  const t = useTranslations();
  const [email, setEmail] = useState<string>("");
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("VIEW_INVOICE__SHARE_ANALYTICS");

  const invoice: Invoice | null = payload?.invoice ?? null;
  const merchant: Merchant | null = payload?.merchant ?? null;

  const handleCopyImage = useCallback(async () => {
    if (!invoice || !merchant) {
      return;
    }

    // Get the image URL from the component
    const imageUrl = `/placeholder.svg?height=200&width=400&text=Analytics+Preview+for+${merchant.name}/${invoice.id}`;

    // Fetch the image data
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Create a clipboard item with the image blob
    const item = new ClipboardItem({[blob.type]: blob});
    await navigator.clipboard.write([item]);

    toast(
      t((m) => m.dialogs.invoices.shareAnalyticsDialog.toasts.imageCopied.title),
      {
        description: t((m) => m.dialogs.invoices.shareAnalyticsDialog.toasts.imageCopied.description),
      },
    );
  }, [invoice, merchant, t]);

  const handleSendEmail = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      toast(
        t((m) => m.dialogs.invoices.shareAnalyticsDialog.toasts.emailSent.title),
        {
          description: t((m) => m.dialogs.invoices.shareAnalyticsDialog.toasts.emailSent.description, {email}),
        },
      );
      setEmail("");
    },
    [email, t],
  );

  const handleDownloadImage = useCallback(() => {
    // In a real app, this would generate and download an image
    toast(
      t((m) => m.dialogs.invoices.shareAnalyticsDialog.toasts.imageSaved.title),
      {
        description: t((m) => m.dialogs.invoices.shareAnalyticsDialog.toasts.imageSaved.description, {merchant: merchant.name}),
      },
    );
  }, [merchant, t]);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- simple dialog close handler
      onOpenChange={(shouldOpen) => {
        if (!shouldOpen) close();
      }}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.shareAnalyticsDialog.title)}</DialogTitle>
          <DialogDescription>
            {t((m) => m.dialogs.invoices.shareAnalyticsDialog.description, {merchant: merchant?.name ?? ""})}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue='image'
          className={styles["tabs"]}>
          <TabsList className={styles["tabsList"]}>
            <TabsTrigger value='image'>{t((m) => m.dialogs.invoices.shareAnalyticsDialog.tabs.image)}</TabsTrigger>
            <TabsTrigger value='email'>{t((m) => m.dialogs.invoices.shareAnalyticsDialog.tabs.email)}</TabsTrigger>
          </TabsList>

          <TabsContent
            value='image'
            className={styles["tabsContent"]}>
            <div className={styles["contentSection"]}>
              <p className={styles["description"]}>{t((m) => m.dialogs.invoices.shareAnalyticsDialog.image.description)}</p>
              <div className={styles["previewContainer"]}>
                <div className={styles["previewBox"]}>
                  <div className={styles["previewPlaceholder"]}>
                    {t((m) => m.dialogs.invoices.shareAnalyticsDialog.image.previewPlaceholder)}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className={styles["dialogFooter"]}>
              <div className={styles["footerButtons"]}>
                <Button
                  onClick={handleDownloadImage}
                  className={styles["fullWidthButton"]}>
                  <TbDownload className={styles["buttonIcon"]} />
                  {t((m) => m.dialogs.invoices.shareAnalyticsDialog.image.download)}
                </Button>
                <Button
                  variant='outline'
                  onClick={handleCopyImage}
                  className={styles["fullWidthButton"]}>
                  <TbCopy className={styles["buttonIcon"]} />
                  {t((m) => m.dialogs.invoices.shareAnalyticsDialog.image.copyToClipboard)}
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>

          <TabsContent
            value='email'
            className={styles["tabsContent"]}>
            <div className={styles["contentSection"]}>
              <p className={styles["description"]}>{t((m) => m.dialogs.invoices.shareAnalyticsDialog.email.description)}</p>
              <div className={styles["emailSection"]}>
                <Label htmlFor='email'>{t((m) => m.dialogs.invoices.shareAnalyticsDialog.email.label)}</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder={t((m) => m.dialogs.invoices.shareAnalyticsDialog.email.placeholder)}
                  value={email}
                  // eslint-disable-next-line react/jsx-no-bind -- inline event handler
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className={styles["dialogFooter"]}>
              <Button
                onClick={handleSendEmail}
                className={styles["fullWidthButton"]}>
                <TbMail className={styles["buttonIcon"]} />
                {t((m) => m.dialogs.invoices.shareAnalyticsDialog.email.send)}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
