"use client";

/**
 * @fileoverview Dialog for previewing a scan in full size.
 * @module app/domains/invoices/_dialogs/PreviewScanDialog
 */

import {useDialog} from "../_contexts/DialogContext";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbFileTypePdf} from "react-icons/tb";
import styles from "./PreviewScanDialog.module.scss";

/**
 * Dialog for displaying a scan in full size.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Display Features**:
 * - Shows image scans in full resolution
 * - Shows PDF scans in embedded iframe viewer
 * - Dialog title shows scan name
 * - ESC key or backdrop click closes dialog
 *
 * **Accessibility**:
 * - Image has proper alt text with scan name
 * - PDF iframe has proper title attribute
 * - Dialog is properly labeled for screen readers
 *
 * @returns The PreviewScanDialog component, CSR'ed.
 */
export default function PreviewScanDialog(): React.JSX.Element {
  const t = useTranslations("IMS--ViewScans.scanCard");

  const {
    isOpen,
    close,
    currentDialog: {payload},
  } = useDialog("SHARED__SCAN_PREVIEW", "view");

  const {scan} = payload;

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
          <DialogTitle>{t("previewTitle")}: {scan.name}</DialogTitle>
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
