"use client";

/**
 * @fileoverview Shared dialog for previewing standalone scan content.
 * @module app/domains/invoices/_dialogs/PreviewScanDialog
 *
 * @remarks
 * This dialog is lazy-loaded by `DialogContainer` for the
 * `SHARED__SCAN_PREVIEW` dialog type. It reads the selected scan from dialog
 * context and chooses an image preview or browser-native PDF preview based on
 * the scan MIME type.
 *
 * **Payload Contract**: `useDialog("SHARED__SCAN_PREVIEW", "view")` provides
 * `{scan}` where `scan` includes the display name, blob URL, and MIME type.
 *
 * @see {@link useDialog} - Reads the active shared dialog payload.
 */

import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {useDialog} from "../_contexts/DialogContext";
import styles from "./PreviewScanDialog.module.scss";

/**
 * Renders the shared scan preview dialog.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Display Features:**
 * - Uses an embedded `iframe` for `application/pdf` scans so the browser's PDF
 *   viewer can handle pagination and zoom.
 * - Uses a plain `<img>` for image scans to preserve the blob URL exactly and
 *   avoid Next.js image optimization constraints for user-uploaded blobs.
 * - Shows the scan name in the dialog title.
 * - Closes when the shared dialog primitive emits `onOpenChange(false)`.
 *
 * **Accessibility:**
 * - Image previews use the scan name as `alt` text.
 * - PDF previews use the scan name as the iframe `title`.
 * - The dialog title labels the preview for assistive technologies.
 *
 * **Security Trade-off:**
 * The PDF iframe intentionally omits `sandbox` because browser-native PDF
 * viewers do not render reliably inside sandboxed frames. The source is the
 * scan blob URL already selected by the authenticated user flow.
 *
 * @returns The client-rendered scan preview dialog.
 *
 * @example
 * ```tsx
 * // Rendered indirectly by DialogContainer after opening this dialog type.
 * openDialog("SHARED__SCAN_PREVIEW", "view", {scan});
 * ```
 */
export default function PreviewScanDialog(): React.JSX.Element {
  const t = useTranslations();

  const {
    isOpen,
    close,
    currentDialog: {
      payload: {scan},
    },
  } = useDialog("SHARED__SCAN_PREVIEW", "view");

  /**
   * Handles preview dialog open-state transitions.
   *
   * @remarks
   * The preview dialog has no long-running mutation to protect, so any close
   * request from the dialog primitive immediately clears the shared dialog
   * state through `close`.
   *
   * @param shouldOpen - Next open state requested by the dialog primitive.
   * @returns Nothing; closes the shared dialog when `shouldOpen` is false.
   */
  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen) {
        close();
      }
    },
    [close],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["previewDialog"]}>
        <DialogHeader>
          <DialogTitle>
            {t((m) => m["IMS--ViewScans"].scanCard.previewTitle)}: {scan.name}
          </DialogTitle>
        </DialogHeader>
        {scan.mimeType === "application/pdf" ? (
          <div className={styles["pdfPreviewContainer"]}>
            {/* eslint-disable-next-line react/iframe-missing-sandbox -- browser-native PDF viewers don't render reliably inside a sandboxed iframe; tradeoff documented per PR #789 review */}
            <iframe
              src={scan.blobUrl}
              className={styles["pdfPreview"]}
              title={scan.name}
            />
          </div>
        ) : (
          <div className={styles["previewImageContainer"]}>
            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> chosen over next/image; see spec 2026-05-21-view-scans-deferred-mount-design.md */}
            <img
              src={scan.blobUrl}
              alt={scan.name}
              className={styles["previewImage"]}
              decoding='async'
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
