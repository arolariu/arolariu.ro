"use client";

/**
 * @fileoverview Upload-scans sidebar (formats, tips, security, next steps).
 * @module app/domains/invoices/upload-scans/_components/_sidebar/UploadSidebar
 */

import FormatsCard from "./FormatsCard";
import NextStepsCard from "./NextStepsCard";
import SecurityCard from "./SecurityCard";
import TipsCard from "./TipsCard";
import styles from "./UploadSidebar.module.scss";

/** Renders the upload-scans informational sidebar. */
export default function UploadSidebar(): React.JSX.Element {
  return (
    <div className={styles["sidebar"]}>
      <FormatsCard />
      <TipsCard />
      <SecurityCard />
      <NextStepsCard />
    </div>
  );
}
