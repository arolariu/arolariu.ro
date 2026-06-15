"use client";

/**
 * @fileoverview Main upload work area (preview grid + dropzone).
 * @module app/domains/invoices/upload-scans/_components/UploadWorkspace
 */

import UploadArea from "./UploadArea";
import UploadPreview from "./UploadPreview";
import styles from "./UploadWorkspace.module.scss";

/** Renders the preview grid above the dropzone. */
export default function UploadWorkspace(): React.JSX.Element {
  return (
    <div className={styles["mainArea"]}>
      <UploadPreview />
      <UploadArea />
    </div>
  );
}
