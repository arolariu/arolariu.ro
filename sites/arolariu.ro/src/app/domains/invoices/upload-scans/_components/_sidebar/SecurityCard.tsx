"use client";

/**
 * @fileoverview Security-assurance sidebar card.
 * @module app/domains/invoices/upload-scans/_components/_sidebar/SecurityCard
 */

import {Card, CardContent} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbShieldCheck} from "react-icons/tb";
import styles from "../../island.module.scss";

/** Renders the secure-storage assurance card. */
export default function SecurityCard(): React.JSX.Element {
  const t = useTranslations();
  return (
    <Card className={styles["securityCard"]}>
      <CardContent className={styles["sidebarCardContent"]}>
        <div className={styles["securityContent"]}>
          <TbShieldCheck className={styles["securityIcon"]} />
          <div>
            <h3 className={styles["securityTitle"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.security.title)}</h3>
            <p className={styles["securityDescription"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.security.description)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
