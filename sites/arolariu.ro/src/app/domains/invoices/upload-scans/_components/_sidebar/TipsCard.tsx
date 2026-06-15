"use client";

/**
 * @fileoverview Tips sidebar card.
 * @module app/domains/invoices/upload-scans/_components/_sidebar/TipsCard
 */

import {Card, CardContent} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbCheck} from "react-icons/tb";
import styles from "../../island.module.scss";

/** One tip list item. */
function TipItem({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
  return (
    <li className={styles["tipItem"]}>
      <TbCheck className={styles["tipIcon"]} />
      <span className={styles["tipText"]}>{children}</span>
    </li>
  );
}

/** Renders the tips card. */
export default function TipsCard(): React.JSX.Element {
  const t = useTranslations();
  return (
    <Card>
      <CardContent className={styles["sidebarCardContent"]}>
        <h3 className={styles["sidebarTitle"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.title)}</h3>
        <ul className={styles["tipsList"]}>
          <TipItem>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.tip1)}</TipItem>
          <TipItem>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.tip2)}</TipItem>
          <TipItem>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.tip3)}</TipItem>
          <TipItem>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.tip4)}</TipItem>
          <TipItem>{t((m) => m.pages.invoices.uploadScans.sidebar.tips.tip5)}</TipItem>
        </ul>
      </CardContent>
    </Card>
  );
}
