"use client";

import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import Image from "next/image";
import styles from "./ImageDialog.module.scss";
import { useDialog } from "../../../_contexts/DialogContext";

/**
 * Full-screen dialog for viewing receipt images at expanded size.
 *
 * @remarks
 * **Rendering Context**: Client Component (uses `useDialog` hook).
 *
 * **Purpose**: Provides enlarged view of receipt scan images for:
 * - Verifying OCR extraction accuracy
 * - Reading small text on receipts
 * - Checking image quality for re-upload decisions
 *
 * **Image Display**: Uses Next.js `Image` component with `fill` prop for
 * responsive sizing within the dialog container. Image is styled with
 * `object-cover` to maintain aspect ratio.
 *
 * **Dialog Integration**: Uses `useDialog` hook with `INVOICE_IMAGE` type.
 * Payload is the image URL string (from `invoice.scans[0].location`).
 *
 * **Layout**: Near-full-width dialog (`min-w-11/12`) to maximize image
 * visibility while maintaining dialog chrome.
 *
 * @returns Client-rendered dialog with full-size receipt image
 *
 * @example
 * ```tsx
 * // Opened via ImageCard click or expand button:
 * const {open} = useDialog("INVOICE_IMAGE", "view", photoUrl);
 * <img onClick={open} src={photoUrl} />
 * ```
 *
 * @see {@link ImageCard} - Parent component that opens this dialog
 * @see {@link useDialog} - Dialog state management hook
 */
export default function ImageDialog(): React.JSX.Element {
  const t = useTranslations();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__IMAGE");

  const image: string | null = payload;

  if (!image) return <></>;

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- simple dialog close handler
      onOpenChange={(shouldOpen) => {
        if (!shouldOpen) close();
      }}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.imageDialog.title, {image})}</DialogTitle>
          <div className={styles["imageContainer"]}>
            <Image
              src={image}
              fill
              alt={t((m) => m.dialogs.invoices.imageDialog.imageAlt)}
              className={styles["receiptImage"]}
            />
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
