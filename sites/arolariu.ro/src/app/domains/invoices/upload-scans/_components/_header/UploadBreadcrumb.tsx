"use client";

/**
 * @fileoverview Breadcrumb back-link for the upload-scans header.
 * @module app/domains/invoices/upload-scans/_components/_header/UploadBreadcrumb
 */

import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import {TbArrowLeft} from "react-icons/tb";
import styles from "./UploadBreadcrumb.module.scss";

/** Renders the "back to invoices" breadcrumb. */
export default function UploadBreadcrumb(): React.JSX.Element {
  const t = useTranslations();
  return (
    <div className={styles["breadcrumb"]}>
      <Link
        href='/domains/invoices'
        className={styles["breadcrumbLink"]}>
        <TbArrowLeft className={styles["breadcrumbIcon"]} />
        {t((m) => m.pages.invoices.uploadScans.breadcrumb)}
      </Link>
    </div>
  );
}
