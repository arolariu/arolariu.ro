"use client";

/**
 * @fileoverview Supported-formats sidebar card.
 * @module app/domains/invoices/upload-scans/_components/_sidebar/FormatsCard
 */

import {Card, CardContent} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbFileTypePdf, TbPhoto} from "react-icons/tb";
import styles from "../../island.module.scss";

/** One supported-format row (icon + label + extensions). */
function FileTypeCard({icon, label, extensions}: Readonly<{icon: React.ReactNode; label: string; extensions: string}>): React.JSX.Element {
  return (
    <div className={styles["fileTypeCard"]}>
      <div className={styles["fileTypeIconBox"]}>{icon}</div>
      <div>
        <p className={styles["fileTypeLabel"]}>{label}</p>
        <p className={styles["fileTypeExtensions"]}>{extensions}</p>
      </div>
    </div>
  );
}

/** Renders the supported-formats card. */
export default function FormatsCard(): React.JSX.Element {
  const t = useTranslations();
  return (
    <Card>
      <CardContent className={styles["sidebarCardContent"]}>
        <h3 className={styles["sidebarTitle"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.formats.title)}</h3>
        <div className={styles["formatsList"]}>
          <FileTypeCard
            icon={<TbPhoto className={styles["fileTypeIconAccent"]} />}
            label={t((m) => m.pages.invoices.uploadScans.sidebar.formats.images)}
            extensions={t((m) => m.pages.invoices.uploadScans.sidebar.formats.imageExtensions)}
          />
          <FileTypeCard
            icon={<TbFileTypePdf className={styles["fileTypeIconRed"]} />}
            label={t((m) => m.pages.invoices.uploadScans.sidebar.formats.documents)}
            extensions={t((m) => m.pages.invoices.uploadScans.sidebar.formats.documentExtensions)}
          />
        </div>
        <p className={styles["maxSizeNote"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.formats.maxSize)}</p>
      </CardContent>
    </Card>
  );
}
