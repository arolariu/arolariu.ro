"use client";

/**
 * @fileoverview Conditional "next steps" sidebar card (shown when all uploads complete).
 * @module app/domains/invoices/upload-scans/_components/_sidebar/NextStepsCard
 */

import {Button, Card, CardContent} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import Link from "next/link";
import {TbArrowRight} from "react-icons/tb";
import {useScanUpload} from "../../_context/ScanUploadContext";
import styles from "./NextStepsCard.module.scss";

/** Renders the post-completion "continue to view scans" card, or nothing. */
export default function NextStepsCard(): React.JSX.Element | null {
  const t = useTranslations();
  const {pendingUploads, sessionStats} = useScanUpload();

  if (!(sessionStats.totalCompleted > 0 && pendingUploads.length === 0)) {
    return null;
  }

  return (
    <motion.div
      initial={{opacity: 0, scale: 0.95}}
      animate={{opacity: 1, scale: 1}}
      transition={{delay: 0.3}}>
      <Card className={styles["nextStepsCard"]}>
        <CardContent className={styles["sidebarCardContent"]}>
          <h3 className={styles["nextStepsTitle"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.nextSteps.title)}</h3>
          <p className={styles["nextStepsDescription"]}>{t((m) => m.pages.invoices.uploadScans.sidebar.nextSteps.description)}</p>
          <Button
            size='sm'
            className={styles["nextStepsButton"]}
            render={
              <Link href='/domains/invoices/view-scans'>
                {t((m) => m.pages.invoices.uploadScans.sidebar.nextSteps.button)}
                <TbArrowRight className={styles["arrowIcon"]} />
              </Link>
            }
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
